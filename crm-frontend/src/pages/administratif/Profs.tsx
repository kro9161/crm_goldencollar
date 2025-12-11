import { useEffect, useState, useCallback } from "react";
import { useArchivedYear } from "../../hooks/useArchivedYear";

type Prof = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  courses?: Array<{
    id: string;
    name: string;
  }>;
};

export default function Profs() {
  const { isReadOnly, academicYearId, hasActiveYear } = useArchivedYear();
  const [profs, setProfs] = useState<Prof[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const token = localStorage.getItem("token");

  // 📌 Récupérer la liste des profs
  const fetchProfs = useCallback(async () => {
    if (!academicYearId) {
      setProfs([]);
      return;
    }

    try {
      const yearParam = `&academicYearId=${academicYearId}`;
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users?role=prof${yearParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Erreur de chargement des professeurs");
      setProfs(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    }
  }, [academicYearId, token]);

  useEffect(() => {
    fetchProfs();
  }, [academicYearId, fetchProfs]);

  // 📌 Création / Edition
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTempPassword("");

    if (!academicYearId) {
      setError("Aucune année académique active. Sélectionnez une année avant de créer un professeur.");
      return;
    }

    const url = editingId
            ? `${import.meta.env.VITE_API_URL}/users/${editingId}`
          : `${import.meta.env.VITE_API_URL}/users`;

    const method = editingId ? "PATCH" : "POST";

    const body = editingId
      ? {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
        }
      : {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          role: "prof",
          academicYearId,
        };

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error || "Erreur serveur");
      return;
    }

    if (!editingId && data.temporaryPassword) {
      setTempPassword(data.temporaryPassword);
    }

    setShowForm(false);
    setEditingId(null);
    setForm({ firstName: "", lastName: "", email: "" });
    fetchProfs();
  };

  // 📌 Edit
  const openEdit = (p: Prof) => {
    setEditingId(p.id);
    setForm({
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
    });
    setShowForm(true);
  };

  // 📌 Create
  const openCreate = () => {
    setEditingId(null);
    setForm({ firstName: "", lastName: "", email: "" });
    setShowForm(true);
  };

  // 📌 Delete
  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce professeur ?")) return;

        await fetch(`${import.meta.env.VITE_API_URL}/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    fetchProfs();
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>👩‍🏫 Gestion des professeurs</h2>

      {!academicYearId && (
        <div style={{ 
          background: "#fff3cd", 
          border: "1px solid #ffc107", 
          padding: 16, 
          borderRadius: 8, 
          marginBottom: 20 
        }}>
          <p style={{ margin: 0, color: "#856404" }}>
            ⚠️ Aucune année académique sélectionnée. Veuillez sélectionner une année en cours.
          </p>
        </div>
      )}

      {isReadOnly && (
        <div style={{ 
          background: "#d1ecf1", 
          border: "1px solid #bee5eb", 
          padding: 16, 
          borderRadius: 8, 
          marginBottom: 20 
        }}>
          <p style={{ margin: 0, color: "#0c5460" }}>
            📂 Mode consultation - Année archivée
          </p>
        </div>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      {hasActiveYear && (
        <button
          onClick={openCreate}
          style={{
            backgroundColor: "#007bff",
            color: "white",
            padding: "8px 12px",
            borderRadius: 4,
            marginBottom: 16,
          }}
        >
          ➞ Nouveau professeur
        </button>
      )}

      <div className="overflow-x-auto -mx-4 lg:mx-0">
        <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden border-collapse">
          <thead className="bg-gray-200 text-gray-800">
            <tr>
              <th className="px-4 py-3 text-left">Nom</th>
              <th className="px-4 py-3 text-left">Prénom</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Email</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Cours assignés</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {profs.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{p.lastName}</td>
                <td className="px-4 py-3">{p.firstName}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-sm">{p.email}</td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {p.courses && p.courses.length > 0 ? (
                    <div className="text-sm text-gray-600">
                      {p.courses.map(c => c.name).join(", ")}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic text-sm">Aucun cours</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {!isReadOnly && (
                    <div className="flex gap-2 justify-center">
                      <button
                        className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm transition"
                        onClick={() => openEdit(p)}
                      >
                        ✏️
                      </button>

                      <button
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition"
                        onClick={() => handleDelete(p.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tempPassword && (
        <p style={{ marginTop: 12, color: "green" }}>
          Mot de passe temporaire : <b>{tempPassword}</b>
        </p>
      )}

      {/* FORMULAIRE */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 8,
              width: 400,
              display: "grid",
              gap: 10,
            }}
          >
            <h3>{editingId ? "Modifier le professeur" : "Nouveau professeur"}</h3>

            <input
              placeholder="Prénom"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />

            <input
              placeholder="Nom"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />

            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={() => setShowForm(false)}>Annuler</button>

              <button type="submit" style={{ background: "green", color: "white" }}>
                {editingId ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
