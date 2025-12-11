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
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2">
          👑 Tableau de bord administrateur
        </h2>
        <a
          href="/administratif/annees"
          className="inline-block bg-blue-700 hover:bg-blue-800 text-white rounded-lg px-5 py-2 font-semibold shadow transition"
        >
          📅 Gérer les années académiques
        </a>
        <button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium px-5 py-2 rounded-lg shadow transition"
        >
          ➕ Ajouter un utilisateur
        </button>
      </div>

      {error && (
        <p className="bg-red-100 text-red-700 px-4 py-2 rounded-lg mb-4">
          {error}
        </p>
      )}

      {tempPassword && (
        <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg mb-4 shadow-sm">
          ✅ Utilisateur créé. Mot de passe temporaire :{' '}
          <span className="font-semibold">{tempPassword}</span>
        </div>
      )}

      {users.length === 0 ? (
        <p className="text-gray-500 text-center mt-10">Aucun utilisateur trouvé.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow border border-gray-200">
          <table className="w-full border-collapse text-sm text-gray-700">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
              <tr>
                <th className="text-left px-6 py-3">Nom</th>
                <th className="text-left px-6 py-3">Prénom</th>
                <th className="text-left px-6 py-3">Email</th>
                <th className="text-left px-6 py-3">Rôle</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 border-t border-gray-100 transition">
                  <td className="px-6 py-3">{u.lastName}</td>
                  <td className="px-6 py-3">{u.firstName}</td>
                  <td className="px-6 py-3">{u.email}</td>
                  <td className="px-6 py-3 capitalize">{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <form
            onSubmit={handleCreateUser}
            className="bg-white w-[420px] p-6 rounded-2xl shadow-2xl border border-gray-100 flex flex-col gap-4 animate-slide-up"
          >
            <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              👤 Ajouter un utilisateur
            </h3>
            <input
              type="text"
              placeholder="Prénom"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input
              type="text"
              placeholder="Nom"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="prof">Prof</option>
              <option value="eleve">Élève</option>
              <option value="admin">Admin</option>
            </select>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-medium"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition"
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
