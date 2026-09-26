import type { ScenarioId, ScenarioSummary, SimulationState } from './types';
async function request<T>(path: string, body?: object): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`/api/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Server returned ${response.status}. Check the backend and retry.`);
    return await response.json() as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Request timed out. Check the backend and retry.');
    throw error;
  } finally { window.clearTimeout(timeout); }
}
export const api = {
  state: () => request<SimulationState>('simulation'),
  scenarios: () => request<ScenarioSummary[]>('scenarios'),
  reset: (scenario_id: ScenarioId) => request<SimulationState>('simulation/reset', { scenario_id }),
};
