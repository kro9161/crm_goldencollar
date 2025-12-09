import { useState, useEffect, useCallback } from "react";
import { useArchivedYear } from "../../hooks/useArchivedYear";

type Room = {
  id: string;
  name: string;
  capacity?: number | null;
  building?: string | null;
};


export default function Salles() {
  const { isReadOnly } = useArchivedYear();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [form, setForm] = useState({ name: "", capacity: "", building: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  // 🧠 fetchRooms avec useCallback (corrige le warning ESLint)
  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur de chargement");
      setRooms(await res.json());
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token]);

  // 🔄 Chargement initial
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // 🧾 Création / modification
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const method = editingId ? "PATCH" : "POST";
    const url = editingId
      ? `http://localhost:4000/rooms/${editingId}`
      : "http://localhost:4000/rooms";

    const body = {
      name: form.name.trim(),
      capacity: form.capacity ? Number(form.capacity) : null,
      building: form.building.trim() || null,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Erreur lors de l’enregistrement");

      setForm({ name: "", capacity: "", building: "" });
      setEditingId(null);
      fetchRooms();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // ❌ Suppression
  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette salle ?")) return;
    try {
      await fetch(`http://localhost:4000/rooms/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRooms();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // ✏️ Édition
  const handleEdit = (r: Room) => {
    setEditingId(r.id);
    setForm({
      name: r.name,
      capacity: r.capacity?.toString() || "",
      building: r.building || "",
    });
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>🏫 Gestion des salles</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}

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

      {/* 🧩 Formulaire */}
      {!isReadOnly && (
        <form
          onSubmit={handleSubmit}
          style={{ marginBottom: "1rem", display: "flex", gap: 10 }}
        >
          <input
            placeholder="Nom"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            placeholder="Capacité"
            type="number"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          />
          <input
            placeholder="Bâtiment"
            value={form.building}
            onChange={(e) => setForm({ ...form, building: e.target.value })}
          />
          <button type="submit" style={{ background: "green", color: "white" }}>
            {editingId ? "Enregistrer" : "Créer"}
          </button>
        </form>
      )}

      {/* 📋 Tableau */}
      {rooms.length === 0 ? (
        <p>Aucune salle enregistrée.</p>
      ) : (
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden border-collapse">
            <thead className="bg-gray-200 text-gray-800">
              <tr>
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Capacité</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Bâtiment</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{r.capacity || "-"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">{r.building || "-"}</td>
                  <td className="px-4 py-3">
                    {!isReadOnly && (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(r)}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm transition"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition"
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
      )}
    </div>
  );
}
