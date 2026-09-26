import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import App from './App';
import { SimulationProvider } from './SimulationContext';
createRoot(document.getElementById('root')!).render(<SimulationProvider><App/></SimulationProvider>);
