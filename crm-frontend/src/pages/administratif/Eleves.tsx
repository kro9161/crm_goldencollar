import { useEffect, useState, useCallback } from "react";
import { useArchivedYear } from "../../hooks/useArchivedYear";

type Group = {
  id: string;
  name: string;
};

type SubGroup = {
  id: string;
  code: string;
  session?: string;
  level?: string;
  group: Group;
};

type Filiere = {
  id: string;
  code: string;
  label?: string;
};

type Eleve = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
  address?: string;
  gender?: "M" | "F" | "Autre";
  nationality?: string;
  status?: "actif" | "inactif" | "archivé";
  registrationDate?: string;
  studentNumber?: string;
  photoUrl?: string;
  legalGuardianName?: string;
  legalGuardianPhone?: string;
  legalGuardianEmail?: string;
  scholarship?: boolean;
  handicap?: boolean;
  subGroupId?: string | null;
  subGroup?: SubGroup | null;
  filieres?: Filiere[];
};

type EleveForm = {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  gender: "M" | "F" | "Autre";
  nationality: string;
  status: "actif" | "inactif" | "archivé";
  registrationDate: string;
  studentNumber: string;
  photoUrl: string;
  legalGuardianName: string;
  legalGuardianPhone: string;
  legalGuardianEmail: string;
  scholarship: boolean;
  handicap: boolean;
  subGroupId: string;
  filiereIds: string[];
};

export default function Eleves() {
  const { isReadOnly, academicYearId, hasActiveYear } = useArchivedYear();
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  const [form, setForm] = useState<EleveForm>({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
    phone: "",
    address: "",
    gender: "M",
    nationality: "",
    status: "actif",
    registrationDate: "",
    studentNumber: "",
    photoUrl: "",
    legalGuardianName: "",
    legalGuardianPhone: "",
    legalGuardianEmail: "",
    scholarship: false,
    handicap: false,
    subGroupId: "",
    filiereIds: [],
  });

  const token = localStorage.getItem("token");

  // -----------------------------
  // 🔹 Charger élèves + sous-groupes
  // -----------------------------
  const fetchData = useCallback(async () => {
    if (!academicYearId) {
      setEleves([]);
      setSubGroups([]);
      setFilieres([]);
      return;
    }

    try {
      const yearParam = `?academicYearId=${academicYearId}`;
          const [eRes, sgRes, fRes] = await Promise.all([
            fetch(`${import.meta.env.VITE_API_URL}/eleves${yearParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
            fetch(`${import.meta.env.VITE_API_URL}/subgroups${yearParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
            fetch(`${import.meta.env.VITE_API_URL}/filieres${yearParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const eJson = await eRes.json();
      const sgJson = await sgRes.json();
      const fJson = await fRes.json();

      setEleves(Array.isArray(eJson) ? eJson : []);
      setSubGroups(Array.isArray(sgJson) ? sgJson : []);
      setFilieres(Array.isArray(fJson) ? fJson : []);
    } catch (e) {
      console.error(e);
      setError("Erreur de chargement des données");
    }
  }, [token, academicYearId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -----------------------------
  // 🔹 Ouvrir création
  // -----------------------------
  const openCreate = () => {
    setEditingId(null);
    setTempPassword("");
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      dateOfBirth: "",
      phone: "",
      address: "",
      gender: "M",
      nationality: "",
      status: "actif",
      registrationDate: "",
      studentNumber: "",
      photoUrl: "",
      legalGuardianName: "",
      legalGuardianPhone: "",
      legalGuardianEmail: "",
      scholarship: false,
      handicap: false,
      subGroupId: "",
      filiereIds: [],
    });
    setShowForm(true);
  };

  // -----------------------------
  // 🔹 Ouvrir édition
  // -----------------------------
  const openEdit = (e: Eleve) => {
    setEditingId(e.id);
    setTempPassword("");
    setForm({
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      dateOfBirth: e.dateOfBirth || "",
      phone: e.phone || "",
      address: e.address || "",
      gender: e.gender || "M",
      nationality: e.nationality || "",
      status: e.status || "actif",
      registrationDate: e.registrationDate || "",
      studentNumber: e.studentNumber || "",
      photoUrl: e.photoUrl || "",
      legalGuardianName: e.legalGuardianName || "",
      legalGuardianPhone: e.legalGuardianPhone || "",
      legalGuardianEmail: e.legalGuardianEmail || "",
      scholarship: e.scholarship ?? false,
      handicap: e.handicap ?? false,
      subGroupId: e.subGroupId || "",
      filiereIds: e.filieres?.map(f => f.id) || [],
    });
    setShowForm(true);
  };

  // -----------------------------
  // 🔹 Enregistrer
  // -----------------------------
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!academicYearId) {
      setError("Aucune année académique active. Sélectionnez une année avant de créer un élève.");
      return;
    }

        const url = editingId
          ? `${import.meta.env.VITE_API_URL}/eleves/${editingId}`
          : `${import.meta.env.VITE_API_URL}/eleves`;

    const method: "POST" | "PATCH" = editingId ? "PATCH" : "POST";

    const body = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      subGroupId: form.subGroupId || null,
      filiereIds: form.filiereIds,
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

    const data = await res.json().catch(() => ({} as { error?: string; temporaryPassword?: string }));

    if (!res.ok) {
      setError(data.error || "Erreur serveur");
      return;
    }

    // 🎉 Succès ! 
    if (!editingId && data.temporaryPassword) {
      // Nouvelle création : affiche le mot de passe mais ne ferme PAS le formulaire tout de suite
      setTempPassword(data.temporaryPassword);
      console.log("✅ Élève créé ! Mot de passe temporaire :", data.temporaryPassword);
      
      // Recharger la liste en background (ne remet pas en blanc)
      fetchData();
      
      // Garder le formulaire ouvert pour montrer le mot de passe
      // L'utilisateur devra fermer manuellement après avoir copié le mot de passe
    } else {
      // Édition ou création sans mot de passe : ferme le formulaire
      setShowForm(false);
      setEditingId(null);
      setTempPassword("");
      fetchData();
    }
  };

  // -----------------------------
  // 🔹 Supprimer
  // -----------------------------
  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet élève ?")) return;

        await fetch(`${import.meta.env.VITE_API_URL}/eleves/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    fetchData();
  };

  // -----------------------------
  // 🔹 Render
  // -----------------------------
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 24, marginBottom: 12 }}>🧑‍🎓 Gestion des élèves</h2>

      {!academicYearId && (
        <div style={{ 
          background: "#fff3cd", 
          border: "1px solid #ffc107", 
          padding: 16, 
          borderRadius: 8, 
          marginBottom: 20 
        }}>
          <p style={{ margin: 0, color: "#856404" }}>
            ⚠️ Aucune année académique sélectionnée. Veuillez sélectionner une année en cours pour afficher les élèves.
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

      {hasActiveYear && (
        <button
          onClick={openCreate}
          style={{
            background: "#0066ff",
            color: "white",
            padding: 8,
            borderRadius: 4,
            marginBottom: 20,
          }}
        >
          ➕ Nouvel élève
        </button>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div className="overflow-x-auto -mx-4 lg:mx-0">
        <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden border-collapse">
          <thead className="bg-gray-200 text-gray-800">
            <tr>
              <th className="px-4 py-3 text-left">Nom</th>
              <th className="px-4 py-3 text-left">Prénom</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Email</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Filières</th>
              <th className="px-4 py-3 text-left">Sous-groupe</th>
              <th className="px-4 py-3 text-left hidden xl:table-cell">Session</th>
              <th className="px-4 py-3 text-left hidden xl:table-cell">Groupe</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {eleves.map((e) => (
              <tr key={e.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{e.lastName}</td>
                <td className="px-4 py-3">{e.firstName}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-sm">{e.email}</td>
                <td className="px-4 py-3 hidden md:table-cell">{e.filieres?.map(f => f.code).join(", ") || "-"}</td>
                <td className="px-4 py-3">{e.subGroup?.code || "-"}</td>
                <td className="px-4 py-3 hidden xl:table-cell">{e.subGroup?.session || "-"}</td>
                <td className="px-4 py-3 hidden xl:table-cell">{e.subGroup?.group?.name || "-"}</td>

                <td className="px-4 py-3">
                  {!isReadOnly && (
                    <div className="flex gap-2 justify-center">
                      <button
                        className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm transition"
                        onClick={() => openEdit(e)}
                      >
                        ✏️
                      </button>
                      <button
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition"
                        onClick={() => handleDelete(e.id)}
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

      {/* FORM */}
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
              background: "white",
              padding: 20,
              borderRadius: 8,
              width: 400,
              display: "grid",
              gap: 10,
            }}
          >
            <h3>{editingId ? "Modifier l'élève" : "Créer un élève"}</h3>

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

            <select
              value={form.subGroupId}
              onChange={(e) => setForm({ ...form, subGroupId: e.target.value })}
            >
              <option value="">— Aucun sous-groupe —</option>

              {subGroups.map((sg) => (
                <option key={sg.id} value={sg.id}>
                  {sg.group.name} — {sg.code} ({sg.session})
                </option>
              ))}
            </select>

            <div style={{ border: "1px solid #ddd", padding: 10, borderRadius: 4 }}>
              <label style={{ fontWeight: "bold", display: "block", marginBottom: 8 }}>
                Filières (multi-sélection)
              </label>
              {filieres.map((f) => (
                <label key={f.id} style={{ display: "block", marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    checked={form.filiereIds.includes(f.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({ ...form, filiereIds: [...form.filiereIds, f.id] });
                      } else {
                        setForm({ ...form, filiereIds: form.filiereIds.filter(id => id !== f.id) });
                      }
                    }}
                  />
                  {" "}{f.code} - {f.label || "Sans label"}
                </label>
              ))}
              {filieres.length === 0 && (
                <p style={{ color: "#999", fontSize: 12 }}>Aucune filière disponible</p>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
              <button type="button" onClick={() => setShowForm(false)}>
                Annuler
              </button>
              <button type="submit" style={{ background: "green", color: "white" }}>
                Enregistrer
              </button>
            </div>

            {tempPassword && (
              <p style={{ marginTop: 10, color: "green" }}>
                Mot de passe temporaire : <b>{tempPassword}</b>
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
