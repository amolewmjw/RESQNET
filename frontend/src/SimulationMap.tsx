import { CRS, type LatLngTuple } from 'leaflet';
import { CircleMarker, MapContainer, Polygon, Polyline, Popup, Tooltip } from 'react-leaflet';
import type { SimulationState } from './types';
const colors = { critical: '#d04e46', urgent: '#ca861e', stable: '#218269' };
export function SimulationMap({ state }: { state: SimulationState }) {
  const nodes = new Map(state.nodes.map(n => [n.id, n]));
  const point = (id: string): LatLngTuple => { const n = nodes.get(id)!; return [-n.y, n.x]; };
  return <MapContainer crs={CRS.Simple} bounds={[[-100, -10], [0, 105]]} minZoom={0} maxZoom={5} scrollWheelZoom={false} attributionControl={false} className="simulation-map" aria-label="Synthetic road network">
    {state.hazard_zones.map(z => <Polygon key={z.id} positions={z.polygon.map(([x,y]) => [-y,x] as LatLngTuple)} pathOptions={{ color: '#d99b35', weight: 1, dashArray: '5 6', fillOpacity: z.active ? 0.12 : 0.03 }}><Tooltip>{z.label} · {z.active ? 'active' : 'potential'}</Tooltip></Polygon>)}
    {state.roads.map(r => <Polyline key={r.id} positions={[point(r.source), point(r.target)]} pathOptions={{ color: r.blocked ? '#d04e46' : '#809ba8', weight: r.blocked ? 4 : 3, dashArray: r.blocked ? '7 6' : undefined }}><Popup><strong>{r.id} · {r.blocked ? 'Blocked' : 'Open'}</strong><br/>{r.distance_km} km · {r.travel_time_min} min<br/>Limits: {r.max_width_m} m wide / {r.max_height_m} m high<br/>{r.restriction_note}</Popup></Polyline>)}
    {state.nodes.map(n => <CircleMarker key={n.id} center={point(n.id)} radius={4} pathOptions={{color:'#82949a',fillColor:'#ffffff',fillOpacity:1}}><Tooltip direction="top" offset={[0,-6]}>{n.label} ({n.id})</Tooltip></CircleMarker>)}
    {state.hospitals.map(h => <CircleMarker key={h.id} center={point(h.node_id)} radius={13} pathOptions={{color:'#227f79', fillColor:'#d3eee8',fillOpacity:1,weight:2}}><Tooltip permanent direction="right" offset={[15,0]}>{h.id} · Hospital</Tooltip><Popup>{h.label}<br/>{h.beds_available} beds · {h.icu_available} ICU places available</Popup></CircleMarker>)}
    {state.ambulances.map((a, i) => { const p=point(a.node_id); return <CircleMarker key={a.id} center={[p[0]-((i>1)?5:0),p[1]-5]} radius={7} pathOptions={{color:'#3565ab',fillColor:a.status==='available'?'#3565ab':'#ffffff',fillOpacity:1}}><Tooltip>{a.id} · {a.status}</Tooltip><Popup>{a.label}<br/>At {a.node_id}; marker offset for visibility only.<br/>{a.status}</Popup></CircleMarker>; })}
    {state.patients.map((p,i) => { const loc=point(p.node_id); return <CircleMarker key={p.id} center={[loc[0]+3-Math.floor(i/2)*3,loc[1]+5]} radius={5} pathOptions={{color:colors[p.severity],fillColor:colors[p.severity],fillOpacity:1}}><Tooltip>{p.id} · {p.severity}</Tooltip><Popup>{p.label}<br/>{p.transport_position} · {p.status}<br/>At {p.node_id}; marker offset for visibility only.</Popup></CircleMarker>; })}
  </MapContainer>;
}
