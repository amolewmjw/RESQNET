"""Build a synthetic, undirected NetworkX graph. No route search or movement yet."""
import networkx as nx
from .schemas import Scenario

def accessible_graph(state: Scenario, ambulance: dict) -> nx.Graph:
    """Return the current graph filtered by explicit vehicle/road restrictions."""
    graph = nx.Graph(scenario_id=state.scenario_id, synthetic=True)
    for node in state.nodes:
        graph.add_node(node.id, **node.model_dump(exclude={"id"}))
    for road in state.roads:
        if road.blocked or ambulance["vehicle_class"] not in road.allowed_vehicle_classes:
            continue
        if ambulance["width_m"] > road.max_width_m or ambulance["height_m"] > road.max_height_m:
            continue
        # Hazard references are explicit; an active referenced zone is unavailable to ordinary transport.
        hazard = next((z for z in state.hazard_zones if z.id == road.hazard_zone_id), None)
        if hazard and hazard.active:
            continue
        graph.add_edge(road.source, road.target, **road.model_dump(exclude={"source", "target"}))
    return graph

def shortest_route(state: Scenario, ambulance: dict, origin: str, destination: str) -> dict | None:
    graph = accessible_graph(state, ambulance)
    if origin not in graph or destination not in graph:
        return None
    try:
        path = nx.astar_path(graph, origin, destination, heuristic=lambda _a, _b: 0.0, weight="travel_time_min")
    except nx.NetworkXNoPath:
        return None
    edges = list(zip(path, path[1:]))
    return {"path": path, "distance_km": round(sum(graph[a][b]["distance_km"] for a, b in edges), 4),
            "travel_time_min": round(sum(graph[a][b]["travel_time_min"] for a, b in edges), 4)}

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
