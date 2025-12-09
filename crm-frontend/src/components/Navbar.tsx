import { Link, useNavigate } from "react-router-dom";
import "./layout.css";
import { useEffect, useState } from "react";

export default function Navbar() {
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(null);
  const isLoggedIn = !!localStorage.getItem("token");

  useEffect(() => {
    setRole(localStorage.getItem("userRole"));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h1 className="logo">🎓 School CRM</h1>

        {/* 🔹 Liens visibles selon le rôle */}
        {isLoggedIn && (
          <ul className="nav-links">
            <li>
              <Link to="/">Accueil</Link>
            </li>

            {role === "admin" && (
              <li>
                <Link to="/admin">Admin</Link>
              </li>
            )}

            {role === "administratif" && (
              <li>
                <Link to="/administratif">Administratif</Link>
              </li>
            )}

            {role === "prof" && (
              <li>
                <Link to="/prof">Prof</Link>
              </li>
            )}

            {role === "eleve" && (
              <li>
                <Link to="/eleve">Élève</Link>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="navbar-right">
        {isLoggedIn ? (
          <button className="logout-btn" onClick={handleLogout}>
            Se déconnecter
          </button>
        ) : (
          <button className="login-btn" onClick={() => navigate("/login")}>
            Se connecter
          </button>
        )}
      </div>
    </nav>
  );
}
