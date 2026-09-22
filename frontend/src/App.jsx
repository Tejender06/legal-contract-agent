import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import UploadScreen from "./pages/UploadScreen";
import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-layout">
      <header className="navbar">
        <div className="nav-brand">
          <NavLink to="/" className="brand-logo">
            <span className="brand-icon">⚖️</span>
            <span className="brand-text">Legal Contract Agent</span>
          </NavLink>
        </div>

        <nav className="nav-menu">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/upload"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            Upload Contract
          </NavLink>
        </nav>

        <div className="nav-auth">
          {isAuthenticated ? (
            <div className="user-profile">
              <span className="user-badge">
                <span className="avatar-dot"></span>
                {user?.name || "User"}
              </span>
              <button className="btn-logout" onClick={handleLogout} title="Sign Out">
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-links">
              <NavLink
                to="/login"
                className={({ isActive }) => `btn-login ${isActive ? "active" : ""}`}
              >
                Login
              </NavLink>
              <NavLink to="/register" className="btn-register">
                Register
              </NavLink>
            </div>
          )}
        </div>
      </header>

      <main className="page-container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<UploadScreen />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;