
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", capacity: "", building: "" });
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

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

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", capacity: "", building: "" });
    setShowForm(true);
  };

  const openEdit = (r: Room) => {
    setEditingId(r.id);
    setForm({
      name: r.name,
      capacity: r.capacity?.toString() || "",
      building: r.building || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const method = editingId ? "PATCH" : "POST";
    const url = editingId
      ? `${import.meta.env.VITE_API_URL}/rooms/${editingId}`
      : `${import.meta.env.VITE_API_URL}/rooms`;
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
      setShowForm(false);
      fetchRooms();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette salle ?")) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/rooms/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRooms();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">🏫 Gestion des salles</h2>
      {error && <div className="text-red-600 font-medium mb-4">{error}</div>}
      {isReadOnly && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-4 text-blue-900">
          📂 Mode consultation - Année archivée
        </div>
      )}
      {!isReadOnly && (
        <Button onClick={openCreate} className="mb-4 h-10 px-6 text-base font-semibold">
          ➕ Nouvelle salle
        </Button>
      )}
      <div className="overflow-x-auto rounded-xl shadow border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Nom</th>
              <th className="px-4 py-3 text-left font-semibold">Capacité</th>
              <th className="px-4 py-3 text-left font-semibold">Bâtiment</th>
              <th className="px-4 py-3 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-6 text-gray-400">Aucune salle enregistrée.</td></tr>
            ) : rooms.map((r) => (
              <tr key={r.id} className="border-b hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3">{r.capacity || "-"}</td>
                <td className="px-4 py-3">{r.building || "-"}</td>
                <td className="px-4 py-3">
                  {!isReadOnly && (
                    <div className="flex gap-2 justify-center">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(r)}>
                        ✏️
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(r.id)}>
                        🗑️
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* MODAL FORMULAIRE SALLE */}
      <Dialog open={showForm} onOpenChange={v => !v && setShowForm(false)}>
        <DialogContent className="max-w-md w-full">
          <form onSubmit={handleSubmit} className="space-y-6">
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier la salle" : "Créer une salle"}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col">
                <label htmlFor="name" className="text-xs font-medium mb-1">Nom</label>
                <Input id="name" placeholder="Nom" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="flex flex-col">
                <label htmlFor="capacity" className="text-xs font-medium mb-1">Capacité</label>
                <Input id="capacity" type="number" placeholder="Capacité" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
              </div>
              <div className="flex flex-col">
                <label htmlFor="building" className="text-xs font-medium mb-1">Bâtiment</label>
                <Input id="building" placeholder="Bâtiment" value={form.building} onChange={e => setForm({ ...form, building: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
