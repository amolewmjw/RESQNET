import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import type { ScenarioId, ScenarioSummary, SimulationState } from './types';
interface SimulationContextValue {
  state: SimulationState | null; scenarios: ScenarioSummary[]; busy: boolean;
  error: string; notice: string; refresh: () => Promise<void>; reset: (id: ScenarioId) => Promise<void>; start: () => Promise<void>; step: () => Promise<void>;
}
const SimulationContext = createContext<SimulationContextValue | null>(null);
export function SimulationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SimulationState | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const refresh = useCallback(async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const [snapshot, catalog] = await Promise.all([api.state(), api.scenarios()]);
      setState(snapshot); setScenarios(catalog);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load simulation.'); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${scheme}://${window.location.host}/api/ws`);
    socket.onmessage = event => { try { setState(JSON.parse(event.data) as SimulationState); } catch { /* ignore malformed demo messages */ } };
    return () => socket.close();
  }, []);
  const reset = async (id: ScenarioId) => {
    setBusy(true); setError(''); setNotice('');
    try {
      // Replace the complete state only after the backend transaction succeeds.
      const snapshot = await api.reset(id);
      setState(snapshot); setNotice(`${snapshot.title} restored to its predefined starting state.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Reset failed. Retry to confirm server state.'); }
    finally { setBusy(false); }
  };
  const start = async () => {
    if (!state) return;
    setBusy(true); setError(''); setNotice('');
    try { const snapshot = await api.start(state.revision); setState(snapshot); setNotice('Allocation started. Routes and reservations are ready for review.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Allocation failed. Retry to confirm server state.'); }
    finally { setBusy(false); }
  };
  const step = async () => {
    if (!state) return;
    setBusy(true); setError('');
    try { setState(await api.step(state.revision)); setNotice('Simulation advanced by one synthetic minute.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Step failed.'); }
    finally { setBusy(false); }
  };
  return <SimulationContext.Provider value={{ state, scenarios, busy, error, notice, refresh, reset, start, step }}>{children}</SimulationContext.Provider>;
}
export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) throw new Error('SimulationProvider is required');
  return context;
}
