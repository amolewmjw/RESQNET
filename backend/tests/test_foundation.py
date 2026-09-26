from concurrent.futures import ThreadPoolExecutor
import json
import shutil
import networkx as nx
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import inspect, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.main import create_app
from app import models as m
from app.schemas import AmbulanceData, Scenario
from app.simulation import SCENARIO_IDS, DATA_DIR


def resource_payload(state):
    return {k: v for k, v in state.items() if k != 'revision'}


def test_initialization_and_schema(client, app):
    assert client.get('/api/health').json()['status'] == 'ok'
    state = client.get('/api/simulation').json()
    assert state['scenario_id'] == 'flood' and state['revision'] == 1
    assert state['synthetic'] is True
    assert set(inspect(app.state.engine).get_table_names()) == {
        'simulation_meta', 'patients', 'ambulances', 'hospitals', 'roads', 'road_nodes',
        'hazard_zones', 'ambulance_types', 'equipment_types'}
    assert {h['category'] for h in state['hospitals']} == {
        'government', 'authorized_private', 'non_authorized_private'}
    assert len(client.get('/api/scenarios').json()) == 3


@pytest.mark.parametrize('scenario_id', SCENARIO_IDS)
def test_scenario_load_graph_and_reset(client, app, scenario_id):
    response = client.post('/api/simulation/reset', json={'scenario_id': scenario_id})
    assert response.status_code == 200
    initial = response.json()
    definition = app.state.simulation.load_definition(scenario_id)
    assert initial['patients'] == [p.model_dump() for p in definition.patients]
    graph = app.state.simulation.graph()
    assert isinstance(graph, nx.Graph) and nx.is_connected(graph)
    assert graph.number_of_nodes() == 9 and graph.number_of_edges() == 12
    assert any(e['blocked'] for _, _, e in graph.edges(data=True))
    assert any(e['hazard_zone'] for _, _, e in graph.edges(data=True))
    assert any(e['allowed_vehicle_classes'] == ['compact'] for _, _, e in graph.edges(data=True))
    for _, _, edge in graph.edges(data=True):
        assert edge['distance_km'] > 0 and edge['travel_time_min'] > 0
        assert edge['max_width_m'] > 0 and edge['max_height_m'] > 0
    # Mutate several persisted resources: reset must restore them, not just the UI.
    with Session(app.state.engine) as db, db.begin():
        db.execute(update(m.Hospital).values(beds_available=0))
        db.execute(update(m.Ambulance).values(status='unavailable'))
        db.execute(update(m.Road).values(blocked=True))
        db.execute(update(m.Patient).values(severity='stable'))
    reset = client.post('/api/simulation/reset', json={'scenario_id': scenario_id}).json()
    assert resource_payload(reset) == resource_payload(initial)
    assert reset['revision'] == initial['revision'] + 1
    again = client.post('/api/simulation/reset', json={'scenario_id': scenario_id}).json()
    assert resource_payload(again) == resource_payload(initial)


@pytest.mark.parametrize('body', [{}, {'scenario_id':'unknown'}, {'scenario_id':'../../secret'}, {'scenario_id':'flood','extra':1}])
def test_invalid_reset_preserves_state(client, body):
    before = client.get('/api/simulation').json()
    assert client.post('/api/simulation/reset', json=body).status_code == 422
    assert client.get('/api/simulation').json() == before


def test_corrupt_fixture_preserves_state(client, app, tmp_path):
    before = client.get('/api/simulation').json()
    fixture_dir = tmp_path / 'fixtures'
    shutil.copytree(DATA_DIR, fixture_dir)
    path = fixture_dir / 'flood.json'
    data = json.loads(path.read_text())
    data['patients'][0]['node_id'] = 'missing'
    path.write_text(json.dumps(data))
    app.state.simulation.data_dir = fixture_dir
    with pytest.raises(ValidationError):
        app.state.simulation.reset('flood')
    assert client.get('/api/simulation').json() == before


def test_transaction_rolls_back_on_database_failure(client, app, monkeypatch):
    before = client.get('/api/simulation').json()
    original = Session.flush
    def fail_on_patient(self, *args, **kwargs):
        if any(isinstance(row, m.Patient) for row in self.new):
            raise RuntimeError('Simulated write failure')
        return original(self, *args, **kwargs)
    with monkeypatch.context() as patch:
        patch.setattr(Session, 'flush', fail_on_patient)
        with pytest.raises(RuntimeError, match='Simulated write failure'):
            app.state.simulation.reset('building_collapse')
    assert client.get('/api/simulation').json() == before


@pytest.mark.parametrize('field,value', [
    ('approved_stretcher_positions',-1),('occupied_stretcher_positions',2),
    ('occupied_seated_positions',1),('width_m',0),('equipment',{'oxygen':-1}),
])
def test_vehicle_validation(client, field, value):
    vehicle = client.get('/api/simulation').json()['ambulances'][0]
    vehicle[field] = value
    with pytest.raises(ValidationError):
        AmbulanceData.model_validate(vehicle)


def test_type_does_not_infer_capability_or_positions(client):
    vehicles = client.get('/api/simulation').json()['ambulances']
    first, fourth = vehicles[0], vehicles[3]
    assert first['type_id'] == fourth['type_id'] == 'bls'
    assert first['equipment'] != fourth['equipment']
    assert first['declared_capabilities'] != fourth['declared_capabilities']
    data = first | {'type_id':'als', 'equipment':{}, 'declared_capabilities':[],
                    'approved_stretcher_positions':0,'approved_seated_positions':0}
    parsed = AmbulanceData.model_validate(data)
    assert parsed.equipment == {} and parsed.approved_stretcher_positions == 0


@pytest.mark.parametrize('mutation', ['node','equipment','duplicate','crew','authorization','capacity','parallel'])
def test_scenario_integrity(client, mutation):
    data = client.app.state.simulation.load_definition('flood').model_dump()
    if mutation == 'node': data['patients'][0]['node_id'] = 'missing'
    if mutation == 'equipment': data['ambulances'][0]['equipment'] = {'magic':1}
    if mutation == 'duplicate': data['patients'][1]['id'] = data['patients'][0]['id']
    if mutation == 'crew': data['ambulances'][1]['crew'] = data['ambulances'][0]['crew']
    if mutation == 'authorization': data['hospitals'][1]['authorization_reference'] = ''
    if mutation == 'capacity': data['hospitals'][0]['beds_available'] = 999
    if mutation == 'parallel': data['roads'][1].update(source='N2',target='N1')
    with pytest.raises(ValidationError): Scenario.model_validate(data)


@pytest.mark.parametrize('model,values', [
    (m.Patient, {'node_id':'missing'}), (m.Hospital, {'beds_available':999}),
    (m.Ambulance, {'occupied_stretcher_positions':999}), (m.Road, {'distance_km':-1}),
])
def test_sqlite_constraints(client, app, model, values):
    with Session(app.state.engine) as db:
        with pytest.raises(IntegrityError):
            db.execute(update(model).values(**values))
            db.commit()
        db.rollback()


def test_restart_keeps_selected_scenario(tmp_path):
    url = f"sqlite:///{tmp_path / 'persistent.db'}"
    with TestClient(create_app(url)) as first:
        saved = first.post('/api/simulation/reset',json={'scenario_id':'industrial_gas_leak'}).json()
    with TestClient(create_app(url)) as second:
        assert second.get('/api/simulation').json() == saved


def test_concurrent_resets_are_complete(client, app):
    def reset(scenario):
        return app.state.simulation.reset(scenario)
    with ThreadPoolExecutor(max_workers=3) as pool:
        states = list(pool.map(reset, SCENARIO_IDS))
    assert len({s.revision for s in states}) == 3
    for state in states:
        assert len(state.patients) == len(app.state.simulation.load_definition(state.scenario_id).patients)


def test_future_services_not_exposed(client):
    paths = client.get('/openapi.json').json()['paths']
    assert set(paths) == {'/api/health','/api/scenarios','/api/simulation','/api/simulation/reset'}
