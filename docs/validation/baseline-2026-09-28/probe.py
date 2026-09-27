import json
import sqlite3
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[3]
def get(path):
    with urllib.request.urlopen('http://127.0.0.1:8000' + path) as response:
        assert response.status == 200
        return json.load(response)

assert get('/api/health') == {'status': 'ok', 'scope': 'sprint-1'}
assert len(get('/api/scenarios')) == 3
state = get('/api/simulation')
assert state['scenario_id'] == 'flood' and len(state['patients']) == 6
export = json.loads((root / 'docs/openapi.json').read_text(encoding='utf-8'))
assert get('/openapi.json') == export
print('Live HTTP: health, scenario catalogue, flood snapshot passed; OpenAPI export matches runtime.')
with sqlite3.connect((root / 'backend/data/resqnet-demo.sqlite').as_uri() + '?mode=ro', uri=True) as db:
    assert db.execute('pragma integrity_check').fetchone()[0] == 'ok'
    assert db.execute('pragma foreign_key_check').fetchall() == []
    assert db.execute('select count(*) from patients').fetchone()[0] == 6
    assert db.execute('select scenario_id from simulation_meta').fetchone()[0] == 'flood'
print('Tracked demo SQLite: read-only integrity and foreign-key checks passed; flood with 6 patients.')
for path in sorted((root / 'backend/data/scenarios').glob('*.json')):
    data = json.loads(path.read_text(encoding='utf-8'))
    print(data['scenario_id'], {k: len(data[k]) for k in ['nodes', 'roads', 'ambulances', 'hospitals', 'patients']})
    assert all(p['clinical_compatibility_group'] == 'unassessed' for p in data['patients'])
    nodes = {n['id']: n for n in data['nodes']}
    # Current fixtures use a rectangle; N5 lies strictly inside it.
    polygon = data['hazard_zones'][0]['polygon']
    xs, ys = zip(*polygon)
    inside = {n['id'] for n in nodes.values() if min(xs) < n['x'] < max(xs) and min(ys) < n['y'] < max(ys)}
    missing = [r['id'] for r in data['roads'] if (r['source'] in inside or r['target'] in inside) and r['hazard_zone_id'] is None]
    print('  Active hazard contains nodes:', sorted(inside), '; incident roads without hazard reference:', missing)
print('Probe completed. Hazard-reference mismatch is an observed data gap, not a routing test.')
