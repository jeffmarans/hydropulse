import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import UserInteractions from './components/UserInteractions';
import ErrorTesting from './components/ErrorTesting';
import PerformanceDemo from './components/PerformanceDemo';
import TelemetryStatus from './components/TelemetryStatus';

function Navigation() {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="navigation">
      <ul className="nav-links">
        <li>
          <Link to="/" className={isActive('/') ? 'active' : ''}>
            Dashboard
          </Link>
        </li>
        <li>
          <Link to="/interactions" className={isActive('/interactions') ? 'active' : ''}>
            User Interactions
          </Link>
        </li>
        <li>
          <Link to="/errors" className={isActive('/errors') ? 'active' : ''}>
            Error Testing
          </Link>
        </li>
        <li>
          <Link to="/performance" className={isActive('/performance') ? 'active' : ''}>
            Performance Demo
          </Link>
        </li>
        <li>
          <Link to="/status" className={isActive('/status') ? 'active' : ''}>
            Telemetry Status
          </Link>
        </li>
      </ul>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="container">
        <header className="header">
          <h1>🌊 React Hydropulse Example</h1>
          <p>Demonstrating comprehensive telemetry integration with React applications</p>
        </header>
        
        <Navigation />
        
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/interactions" element={<UserInteractions />} />
            <Route path="/errors" element={<ErrorTesting />} />
            <Route path="/performance" element={<PerformanceDemo />} />
            <Route path="/status" element={<TelemetryStatus />} />
          </Routes>
        </main>
        
        <footer style={{ 
          textAlign: 'center', 
          padding: '2rem 0', 
          color: '#666',
          borderTop: '1px solid #e1e5e9',
          marginTop: '3rem'
        }}>
          <p>React Hydropulse Example - Built with @jeffmarans/hydropulse</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
