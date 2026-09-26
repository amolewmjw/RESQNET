"""Build a synthetic, undirected NetworkX graph. No route search or movement yet."""
import networkx as nx
from .schemas import Scenario

def build_road_graph(state: Scenario) -> nx.Graph:
    graph = nx.Graph(scenario_id=state.scenario_id, synthetic=True)
    for node in state.nodes:
        graph.add_node(node.id, **node.model_dump(exclude={"id"}))
    hazards = {h.id: h.model_dump() for h in state.hazard_zones}
    for road in state.roads:
        attributes = road.model_dump(exclude={"source", "target"})
        attributes["hazard_zone"] = hazards.get(road.hazard_zone_id)
        # Preserve restrictions as data. Future routing must explicitly filter them.
        graph.add_edge(road.source, road.target, **attributes)
    return graph
