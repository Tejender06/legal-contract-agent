import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const { token, isAuthenticated } = useAuth();

  const fetchContracts = useCallback(() => {
    if (!token) return;

    setLoading(true);
    setError(null);
    fetch("http://localhost:5000/api/contracts", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch contracts");
        return res.json();
      })
      .then((data) => {
        setContracts(data.contracts || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading contracts:", err);
        setError(err.message || "Failed to load contracts");
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    if (!token) return;

    let ignore = false;
    fetch("http://localhost:5000/api/contracts", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch contracts");
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          setContracts(data.contracts || []);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error("Error loading contracts:", err);
          setError(err.message || "Failed to load contracts");
        }
      });

    return () => {
      ignore = true;
    };
  }, [token]);

  const handleDelete = async (contractId, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this contract?")) {
      return;
    }

    try {
      setDeletingId(contractId);
      const res = await fetch(`http://localhost:5000/api/contracts/${contractId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to delete contract");
      }

      setContracts((prev) => prev.filter((c) => c._id !== contractId));
    } catch (err) {
      alert(err.message || "Could not delete contract");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 KB";
    const k = 1024;
    if (bytes < k) return `${bytes} B`;
    if (bytes < k * k) return `${(bytes / k).toFixed(1)} KB`;
    return `${(bytes / (k * k)).toFixed(2)} MB`;
  };

  const renderStatusBadge = (status) => {
    const statusMap = {
      uploaded: { label: "Uploaded", class: "badge-uploaded", icon: "📥" },
      processing: { label: "Processing", class: "badge-processing", icon: "⚙️" },
      completed: { label: "Analyzed", class: "badge-completed", icon: "✅" },
      failed: { label: "Failed", class: "badge-failed", icon: "⚠️" },
    };

    const config = statusMap[status] || {
      label: status || "Uploaded",
      class: "badge-uploaded",
      icon: "📄",
    };

    return (
      <span className={`status-badge ${config.class}`}>
        <span className="badge-icon">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="card auth-prompt-card">
        <div className="auth-prompt-content">
          <span className="prompt-icon">🔒</span>
          <h2>Authentication Required</h2>
          <p>Sign in to upload, analyze, and manage your legal contracts securely.</p>
          <div className="auth-prompt-actions">
            <Link to="/login" className="btn btn-primary">
              Log In
            </Link>
            <Link to="/register" className="btn btn-secondary">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Contract Repository</h1>
          <p className="page-subtitle">
            Manage your agreements and view AI extraction readiness
          </p>
        </div>
        <div className="dashboard-actions">
          <button
            onClick={fetchContracts}
            className="btn btn-icon"
            title="Refresh contracts"
            disabled={loading}
          >
            🔄 Refresh
          </button>
          <Link to="/upload" className="btn btn-primary">
            + Upload New Contract
          </Link>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-title">Total Contracts</span>
          <span className="metric-value">{contracts.length}</span>
        </div>
        <div className="metric-card">
          <span className="metric-title">Ready for Analysis</span>
          <span className="metric-value">
            {contracts.filter((c) => c.status === "uploaded").length}
          </span>
        </div>
        <div className="metric-card">
          <span className="metric-title">Analyzed</span>
          <span className="metric-value">
            {contracts.filter((c) => c.status === "completed").length}
          </span>
        </div>
      </div>

      {loading && contracts.length === 0 ? (
        <div className="card loading-card">
          <div className="spinner"></div>
          <p>Retrieving contracts from secure vault...</p>
        </div>
      ) : error ? (
        <div className="card error-card">
          <p className="error-text">⚠️ {error}</p>
          <button onClick={fetchContracts} className="btn btn-secondary">
            Retry
          </button>
        </div>
      ) : contracts.length === 0 ? (
        <div className="card empty-state-card">
          <div className="empty-icon">📁</div>
          <h3>No contracts uploaded yet</h3>
          <p>
            Upload your employment, vendor, lease, or freelance agreement to
            begin clause-level AI risk analysis.
          </p>
          <Link to="/upload" className="btn btn-primary">
            Upload Your First Contract
          </Link>
        </div>
      ) : (
        <div className="contracts-grid">
          {contracts.map((doc) => (
            <div key={doc._id} className="contract-card">
              <div className="contract-card-header">
                <div className="file-type-pill">
                  {(doc.fileType || "doc").toUpperCase()}
                </div>
                {renderStatusBadge(doc.status)}
              </div>

              <div className="contract-card-body">
                <h3 className="contract-title" title={doc.title}>
                  {doc.title || doc.fileName}
                </h3>
                <p className="contract-filename" title={doc.fileName}>
                  📄 {doc.fileName}
                </p>

                <div className="contract-metadata">
                  <div className="meta-item">
                    <span className="meta-label">Size:</span>
                    <span className="meta-val">{formatFileSize(doc.fileSize)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Uploaded:</span>
                    <span className="meta-val">{formatDate(doc.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="contract-card-footer">
                <span className="meta-tag">Milestone 3 Captured</span>
                <button
                  onClick={(e) => handleDelete(doc._id, e)}
                  disabled={deletingId === doc._id}
                  className="btn-delete"
                  title="Delete Contract"
                >
                  {deletingId === doc._id ? "..." : "🗑️"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;