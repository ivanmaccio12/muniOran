import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useReclamos } from './data/mockReclamos';
import Navbar from './components/Navbar';
import AdminView from './views/AdminView';
import WorkerView from './views/WorkerView';
import PublicView from './views/PublicView';
import './App.css';

function App() {
  const reclamosState = useReclamos();

  return (
    <BrowserRouter basename="/kanban">
      <div className="app">
        <Navbar />
        <Routes>
          <Route path="/" element={<AdminView {...reclamosState} />} />
          <Route path="/mis-reclamos" element={<WorkerView {...reclamosState} />} />
          <Route path="/consulta" element={<PublicView reclamos={reclamosState.reclamos} solicitarUpdate={reclamosState.solicitarUpdate} fetchReclamo={reclamosState.fetchReclamo} />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
