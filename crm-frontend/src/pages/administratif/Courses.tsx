import { useState, useEffect, useCallback } from "react";
import { useArchivedYear } from "../../hooks/useArchivedYear";

type SubGroup = { id: string; code: string; group: { name: string } };
type Prof = { id: string; firstName: string; lastName: string };
type Level = { id: string; code: string; label?: string };
type Filiere = { id: string; code: string; label?: string; level?: Level };

type Course = {
  id: string;
  name: string;
  type?: string | null;
  domain?: string | null;
  totalHours?: number | null;
  totalSessions?: number | null;
  day?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  professorMain?: Prof | null;
  professors?: Prof[];
  subGroups?: SubGroup[];
  filiere?: Filiere | null;
};

export default function Courses() {
  const { isReadOnly, academicYearId, hasActiveYear } = useArchivedYear();
  const [courses, setCourses] = useState<Course[]>([]);
  const [profs, setProfs] = useState<Prof[]>([]);
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "",
    domain: "",
    totalHours: "",
    totalSessions: "",
    day: "",
    startTime: "",
    endTime: "",
    professorIds: [] as string[],
    professorMainId: "",
    subGroupIds: [] as string[],
    filiereId: "",
    academicYearId: academicYearId || "",
  });

  const token = localStorage.getItem("token");

  // ----------- APIS ----------------
  const fetchCourses = useCallback(async () => {
    if (!academicYearId) {
      setCourses([]);
      return;
    }

    const yearParam = `?academicYearId=${academicYearId}`;
    const res = await fetch(`http://localhost:4000/courses${yearParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setCourses(await res.json());
  }, [token, academicYearId]);

  const fetchProfs = useCallback(async () => {
    // Ne pas filtrer par année pour les profs (ils existent indépendamment des années)
    const res = await fetch(`http://localhost:4000/users?role=prof`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log("📚 Profs chargés:", data);
    setProfs(data);
  }, [token]);

  const fetchSubGroups = useCallback(async () => {
    if (!academicYearId) {
      setSubGroups([]);
      return;
    }

    const yearParam = `?academicYearId=${academicYearId}`;
    const res = await fetch(`http://localhost:4000/subgroups${yearParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setSubGroups(await res.json());
  }, [token, academicYearId]);

  const fetchFilieres = useCallback(async () => {
    const yearParam = academicYearId ? `?academicYearId=${academicYearId}` : "";
    const res = await fetch(`http://localhost:4000/filieres${yearParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setFilieres(await res.json());
  }, [token, academicYearId]);

  useEffect(() => {
    fetchCourses();
    fetchProfs();
    fetchSubGroups();
    fetchFilieres();
  }, [fetchCourses, fetchProfs, fetchSubGroups, fetchFilieres]);

  // ----------- FORM ----------------

  const openCreate = () => {
    setEditingId(null);
    setFormData({
      name: "",
      type: "",
      domain: "",
      totalHours: "",
      totalSessions: "",
      day: "",
      startTime: "",
      endTime: "",
      professorIds: [],
      professorMainId: "",
      subGroupIds: [],
      filiereId: "",
      academicYearId: academicYearId || "",
    });
    setShowForm(true);
  };

  const openEdit = (c: Course) => {
    setEditingId(c.id);

    setFormData({
      name: c.name,
      type: c.type || "",
      domain: c.domain || "",
      totalHours: c.totalHours?.toString() || "",
      totalSessions: c.totalSessions?.toString() || "",
      day: c.day || "",
      startTime: c.startTime?.slice(0, 5) || "",
      endTime: c.endTime?.slice(0, 5) || "",
      professorIds: c.professors?.map((p) => p.id) || [],
      professorMainId: c.professorMain?.id || "",
      subGroupIds: c.subGroups?.map((sg) => sg.id) || [],
      filiereId: c.filiere?.id || "",
      academicYearId: academicYearId || "",
    });

    setShowForm(true);
  };

  const toggleProf = (id: string) => {
    setFormData((f) => {
      const next = f.professorIds.includes(id)
        ? f.professorIds.filter((x) => x !== id)
        : [...f.professorIds, id];

      // si plus de prof principal, on remet ""
      if (!next.includes(f.professorMainId)) {
        return { ...f, professorIds: next, professorMainId: "" };
      }

      return { ...f, professorIds: next };
    });
  };

  const toggleSubGroup = (id: string) => {
    setFormData((f) => ({
      ...f,
      subGroupIds: f.subGroupIds.includes(id)
        ? f.subGroupIds.filter((x) => x !== id)
        : [...f.subGroupIds, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const payload = {
      name: formData.name,
      type: formData.type || null,
      domain: formData.domain || null,
      totalHours: formData.totalHours ? parseInt(formData.totalHours) : null,
      totalSessions: formData.totalSessions
        ? parseInt(formData.totalSessions)
        : null,
      day: formData.day || null,
      startTime: formData.startTime
        ? `${formData.startTime}:00`
        : null,
      endTime: formData.endTime ? `${formData.endTime}:00` : null,
      professorMainId: formData.professorMainId || null,
      professorIds: formData.professorIds,
      subGroupIds: formData.subGroupIds,
      filiereId: formData.filiereId || null,
      academicYearId: formData.academicYearId,
    };

    const url = editingId
      ? `http://localhost:4000/courses/${editingId}`
      : "http://localhost:4000/courses";

    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur d’enregistrement");
      return;
    }

    setShowForm(false);
    fetchCourses();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce module ?")) return;
    await fetch(`http://localhost:4000/courses/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchCourses();
  };

  // ----------- UI ----------------

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-6">📘 Gestion des modules</h2>

      {!academicYearId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 m-0">
            ⚠️ Aucune année académique sélectionnée. Veuillez sélectionner une année en cours.
          </p>
        </div>
      )}

      {isReadOnly && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 m-0">
            📂 Mode consultation - Année archivée
          </p>
        </div>
      )}

      {error && <p className="text-red-500">{error}</p>}

      {hasActiveYear && (
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          ➕ Nouveau module
        </button>
      )}

      <div className="overflow-x-auto -mx-4 lg:mx-0 mt-6">
        <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden border-collapse">
          <thead className="bg-gray-200 text-gray-800">
            <tr>
              <th className="px-4 py-3 text-left">Nom</th>
              <th className="px-4 py-3 text-left hidden xl:table-cell">Filière</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Heures</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Séances</th>
              <th className="px-4 py-3 text-left hidden xl:table-cell">Type</th>
              <th className="px-4 py-3 text-left hidden 2xl:table-cell">Domaine</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Jour</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Créneau</th>
              <th className="px-4 py-3 text-left hidden xl:table-cell">Sous-groupes</th>
              <th className="px-4 py-3 text-left">Profs</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Principal</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>

        <tbody>
          {courses.map((c) => (
            <tr key={c.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{c.name}</td>
              <td className="px-4 py-3 hidden xl:table-cell">{c.filiere?.code || "-"}</td>
              <td className="px-4 py-3 hidden lg:table-cell">{c.totalHours || "-"}</td>
              <td className="px-4 py-3 hidden lg:table-cell">{c.totalSessions || "-"}</td>
              <td className="px-4 py-3 hidden xl:table-cell">{c.type || "-"}</td>
              <td className="px-4 py-3 hidden 2xl:table-cell">{c.domain || "-"}</td>
              <td className="px-4 py-3 hidden md:table-cell">{c.day || "-"}</td>
              <td className="px-4 py-3 hidden md:table-cell text-sm">
                {c.startTime && c.endTime
                  ? `${c.startTime.slice(0, 5)} - ${c.endTime.slice(0, 5)}`
                  : "-"}
              </td>
              <td className="px-4 py-3 hidden xl:table-cell text-sm">
                {c.subGroups?.map((sg) => `${sg.group?.name || "?"}-${sg.code}`)

                  .join(", ") || "-"}
              </td>
              <td className="px-4 py-3 text-sm">
                {c.professors
                  ?.map((p) => `${p.firstName} ${p.lastName}`)
                  .join(", ") || "-"}
              </td>
              <td className="px-4 py-3 hidden lg:table-cell text-sm">
                {c.professorMain
                  ? `${c.professorMain.firstName} ${c.professorMain.lastName}`
                  : "-"}
              </td>

              <td className="px-4 py-3">
                {!isReadOnly && (
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => openEdit(c)}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm transition"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition"
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

      {/* ---------- MODAL FORM ---------- */}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-lg shadow-lg w-[420px] grid gap-3"
          >
            <h3 className="text-xl font-semibold">
              {editingId ? "Modifier le module" : "Nouveau module"}
            </h3>

            <p className="text-sm text-gray-600">
              Année : <strong>{formData.academicYearId}</strong>
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Filière *</label>
              <select
                className="border rounded p-2 w-full"
                value={formData.filiereId}
                onChange={(e) =>
                  setFormData({ ...formData, filiereId: e.target.value })
                }
                required
              >
                <option value="">-- Sélectionner une filière --</option>
                {filieres.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code} {f.label ? `(${f.label})` : ""} - {f.level?.code || ""}
                  </option>
                ))}
              </select>
              {formData.filiereId && (
                <p className="text-xs text-blue-600">
                  Niveau: <strong>{filieres.find(f => f.id === formData.filiereId)?.level?.code}</strong>
                </p>
              )}
            </div>

            <input
              className="border rounded p-2"
              placeholder="Nom du module"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />

            <input
              className="border rounded p-2"
              placeholder="Type (Cours, TD...)"
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
            />

            <input
              className="border rounded p-2"
              placeholder="Domaine"
              value={formData.domain}
              onChange={(e) =>
                setFormData({ ...formData, domain: e.target.value })
              }
            />

            <input
              type="number"
              className="border rounded p-2"
              placeholder="Heures totales"
              value={formData.totalHours}
              onChange={(e) =>
                setFormData({ ...formData, totalHours: e.target.value })
              }
            />

            <input
              type="number"
              className="border rounded p-2"
              placeholder="Nombre de séances"
              value={formData.totalSessions}
              onChange={(e) =>
                setFormData({ ...formData, totalSessions: e.target.value })
              }
            />

            <input
              className="border rounded p-2"
              placeholder="Jour conseillé (Lundi, Mardi...)"
              value={formData.day}
              onChange={(e) =>
                setFormData({ ...formData, day: e.target.value })
              }
            />

            <input
              type="time"
              className="border rounded p-2"
              value={formData.startTime}
              onChange={(e) =>
                setFormData({ ...formData, startTime: e.target.value })
              }
            />

            <input
              type="time"
              className="border rounded p-2"
              value={formData.endTime}
              onChange={(e) =>
                setFormData({ ...formData, endTime: e.target.value })
              }
            />

            <label className="font-semibold mt-2">Filière :</label>
            <select
              className="border rounded p-2"
              value={formData.filiereId}
              onChange={(e) =>
                setFormData({ ...formData, filiereId: e.target.value })
              }
            >
              <option value="">— Aucune filière —</option>
              {filieres.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code} - {f.label || "Sans label"}
                </option>
              ))}
            </select>

            <label className="font-semibold mt-2">Sous-groupes :</label>
            <div className="border p-2 max-h-32 overflow-y-auto mb-3">
              {subGroups.map((sg) => (
                <label key={sg.id} className="block text-sm">
                  <input
                    type="checkbox"
                    checked={formData.subGroupIds.includes(sg.id)}
                    onChange={() => toggleSubGroup(sg.id)}
                  />{" "}
                  {sg.group.name} — {sg.code}
                </label>
              ))}
            </div>

            <label className="font-semibold">Professeurs :</label>
            <div className="border p-2 max-h-32 overflow-y-auto mb-3">
              {profs.map((p) => (
                <label key={p.id} className="block text-sm">
                  <input
                    type="checkbox"
                    checked={formData.professorIds.includes(p.id)}
                    onChange={() => toggleProf(p.id)}
                  />{" "}
                  {p.firstName} {p.lastName}
                </label>
              ))}
            </div>

            {formData.professorIds.length > 1 && (
              <>
                <label className="font-semibold">Prof principal :</label>
                <select
                  className="border rounded p-2"
                  value={formData.professorMainId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      professorMainId: e.target.value,
                    })
                  }
                >
                  <option value="">— Aucun —</option>
                  {formData.professorIds.map((id) => {
                    const p = profs.find((x) => x.id === id);
                    return (
                      p && (
                        <option key={id} value={id}>
                          {p.firstName} {p.lastName}
                        </option>
                      )
                    );
                  })}
                </select>
              </>
            )}

            <div className="flex justify-between mt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Annuler
              </button>

              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
