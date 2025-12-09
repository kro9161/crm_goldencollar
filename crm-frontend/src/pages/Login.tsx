import "./Login.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  type LoginResponse = {
    token: string;
    user: { id: string; role: string; email: string };
    error?: string;
  };

  // ✅ Redirection automatique si déjà connecté
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("userRole");

    if (token && role) {
      if (role === "admin") navigate("/admin");
      else if (role === "administratif") navigate("/administratif");
      else if (role === "prof") navigate("/prof");
      else if (role === "eleve") navigate("/eleve");
      else navigate("/");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data: LoginResponse = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur inconnue");

      // ✅ Sauvegarde du token + rôle utilisateur + userId
      localStorage.setItem("token", data.token);
      localStorage.setItem("userRole", data.user.role);
      localStorage.setItem("userId", data.user.id);

      // ✅ Redirection selon le rôle
      if (data.user.role === "admin") {
        navigate("/admin");
      } else if (data.user.role === "administratif") {
        navigate("/administratif");
      } else if (data.user.role === "prof") {
        navigate("/prof");
      } else if (data.user.role === "eleve") {
        navigate("/eleve");
      } else {
        navigate("/");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setError(msg);
    }
  };

  return (
    <div className="login-container">
      <h2>Connexion</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Se connecter</button>
      </form>

      {error && <p className="error">{error}</p>}
    </div>
  );
}