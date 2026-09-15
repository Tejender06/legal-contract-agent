import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import UploadScreen from './pages/UploadScreen';
import './index.css'; // This connects your new styles!

function App() {
  return (
    <BrowserRouter>
      <nav className="navbar">
        <Link to="/" className="nav-link">Dashboard</Link>
        <Link to="/upload" className="nav-link">Upload Contract</Link>
      </nav>
      
      <div className="page-container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<UploadScreen />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;