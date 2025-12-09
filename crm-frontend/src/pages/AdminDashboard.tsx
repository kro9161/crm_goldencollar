import { useEffect, useState } from "react";

type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
};

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "prof",
  });
  const [tempPassword, setTempPassword] = useState("");

  // 🔹 Charger la liste des utilisateurs
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Erreur de chargement des utilisateurs");

      const data = await res.json();
      setUsers(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setError(msg);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 🔹 Création d’un utilisateur
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTempPassword("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur à la création");

      setTempPassword(data.temporaryPassword);
      setShowForm(false);
      setFormData({ email: "", firstName: "", lastName: "", role: "prof" });
      fetchUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setError(msg);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>👑 Tableau de bord administrateur</h2>

      {/* Bouton ajouter */}
      <button
        onClick={() => setShowForm(true)}
        style={{
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          padding: "8px 12px",
          borderRadius: "4px",
          cursor: "pointer",
          marginBottom: "1rem",
        }}
      >
        ➕ Ajouter un utilisateur
      </button>

      {/* Message erreur */}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Tableau utilisateurs */}
      {users.length === 0 ? (
        <p>Aucun utilisateur trouvé.</p>
      ) : (
        <table border={1} cellPadding={8} style={{ width: "100%" }}>
          <thead style={{ backgroundColor: "#f4f4f4" }}>
            <tr>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Email</th>
              <th>Rôle</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.lastName}</td>
                <td>{u.firstName}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Mot de passe temporaire après ajout */}
      {tempPassword && (
        <p style={{ marginTop: "1rem", color: "green" }}>
          ✅ Utilisateur créé. Mot de passe temporaire :{" "}
          <strong>{tempPassword}</strong>
        </p>
      )}

      {/* Formulaire modal */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <form
            onSubmit={handleCreateUser}
            style={{
              background: "white",
              padding: "2rem",
              borderRadius: "8px",
              width: "400px",
              display: "flex",
              flexDirection: "column",
              gap: "0.8rem",
            }}
          >
            <h3>Ajouter un utilisateur</h3>

            <input
              type="text"
              placeholder="Prénom"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              required
            />
            <input
              type="text"
              placeholder="Nom"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
            >
              <option value="prof">Prof</option>
              <option value="eleve">Élève</option>
              <option value="admin">Admin</option>
            </select>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  backgroundColor: "gray",
                  color: "white",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                type="submit"
                style={{
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Créer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
