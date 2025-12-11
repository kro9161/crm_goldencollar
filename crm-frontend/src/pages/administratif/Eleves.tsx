import { useEffect, useState, useCallback } from "react";
import { useArchivedYear } from "../../hooks/useArchivedYear";
import { Dialog, DialogContent, DialogHeader as DialogH, DialogTitle as DialogT, DialogFooter as DialogF, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import PhotoUploader from "@/components/PhotoUploader";

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
  level?: string;
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
  const [selectedEleve, setSelectedEleve] = useState<Eleve | null>(null);

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
      dateOfBirth: form.dateOfBirth || null,
      phone: form.phone || null,
      address: form.address || null,
      gender: form.gender || null,
      nationality: form.nationality || null,
      status: form.status || null,
      registrationDate: form.registrationDate || null,
      studentNumber: form.studentNumber || null,
      photoUrl: form.photoUrl || null,
      scholarship: form.scholarship,
      handicap: form.handicap,
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
      // Nouvelle création : affiche le mot de passe, ferme le formulaire après 2s
      setTempPassword(data.temporaryPassword);
      fetchData();
      setTimeout(() => {
        setShowForm(false);
        setEditingId(null);
        setTempPassword("");
      }, 2000);
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
    setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/eleves/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur lors de la suppression");
        return;
      }
      // Retirer l'élève de la liste immédiatement côté UI
      setEleves(prev => prev.filter(e => e.id !== id));
    } catch {
      setError("Erreur lors de la suppression");
    }
  };

  // -----------------------------
  // 🔹 Render
  // -----------------------------
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h2 className="text-3xl font-bold tracking-tight">🧑‍🎓 Gestion des élèves</h2>
        {hasActiveYear && (
          <Button onClick={openCreate} className="h-10 px-6 text-base font-semibold">
            ➕ Nouvel élève
          </Button>
        )}
      </div>

      {!academicYearId && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-lg p-4 mb-4">
          ⚠️ Aucune année académique sélectionnée. Veuillez sélectionner une année en cours pour afficher les élèves.
        </div>
      )}
      {isReadOnly && (
        <div className="bg-blue-100 border border-blue-200 text-blue-800 rounded-lg p-4 mb-4">
          📂 Mode consultation - Année archivée
        </div>
      )}
      {error && <div className="text-red-600 font-medium mb-4">{error}</div>}

      <div className="overflow-x-auto rounded-xl shadow border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Nom</th>
              <th className="px-4 py-3 text-left font-semibold">Prénom</th>
              <th className="px-4 py-3 text-left font-semibold hidden lg:table-cell">Email</th>
              <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Filières</th>
              <th className="px-4 py-3 text-left font-semibold">Sous-groupe</th>
              <th className="px-4 py-3 text-left font-semibold hidden xl:table-cell">Session</th>
              <th className="px-4 py-3 text-left font-semibold hidden xl:table-cell">Groupe</th>
              <th className="px-4 py-3 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {eleves.map((e) => (
              <tr key={e.id} className="border-b hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-medium">{e.lastName}</td>
                <td className="px-4 py-3">{e.firstName}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-sm">{e.email}</td>
                <td className="px-4 py-3 hidden md:table-cell">{e.filieres?.map((f: Filiere) => f.code).join(", ") || "-"}</td>
                <td className="px-4 py-3">{e.subGroup?.code || "-"}</td>
                <td className="px-4 py-3 hidden xl:table-cell">{e.subGroup?.session || "-"}</td>
                <td className="px-4 py-3 hidden xl:table-cell">{e.subGroup?.group?.name || "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-center">
                    <Button variant="secondary" size="sm" onClick={() => setSelectedEleve(e)}>
                      👁️ Fiche
                    </Button>
                    {!isReadOnly && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => openEdit(e)}>
                          ✏️
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(e.id)}>
                          🗑️
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL FICHE ELEVE MODERNE 2025 */}
      <Dialog open={!!selectedEleve} onOpenChange={v => !v && setSelectedEleve(null)}>
        <DialogContent className="max-w-2xl w-full p-0 bg-gradient-to-br from-white to-blue-50 border-0">
          <div className="flex flex-col items-center py-8 px-6">
            <DialogH className="w-full flex flex-col items-center mb-2">
              <DialogT className="text-3xl font-extrabold tracking-tight text-blue-900 flex items-center gap-2">
                <span>Fiche élève</span>
                {selectedEleve?.status === "actif" && <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Actif</span>}
                {selectedEleve?.status === "inactif" && <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-xs font-semibold">Inactif</span>}
                {selectedEleve?.status === "archivé" && <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">Archivé</span>}
              </DialogT>
              <p className="text-muted-foreground text-sm mt-1">Toutes les informations détaillées de l'élève</p>
            </DialogH>
            {selectedEleve && (
              <div className="flex flex-col items-center w-full">
                <div className="w-28 h-28 rounded-full bg-gray-100 overflow-hidden border-4 border-blue-300 shadow mb-4 flex items-center justify-center">
                  {selectedEleve.photoUrl ? (
                    <img src={selectedEleve.photoUrl} alt="Photo élève" className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-6xl text-gray-300">👤</span>
                  )}
                </div>
                <div className="text-2xl font-bold text-blue-900 text-center flex items-center gap-2">
                  {selectedEleve.firstName} {selectedEleve.lastName}
                </div>
                <div className="text-base text-blue-700 mb-2">{selectedEleve.email}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 w-full mt-4 text-[1rem]">
                  <div><span className="font-semibold text-blue-800">🎂 Date de naissance :</span> {selectedEleve.dateOfBirth ? new Date(selectedEleve.dateOfBirth).toLocaleDateString() : "-"}</div>
                  <div><span className="font-semibold text-blue-800">📞 Téléphone :</span> {selectedEleve.phone || "-"}</div>
                  <div><span className="font-semibold text-blue-800">🏠 Adresse :</span> {selectedEleve.address || "-"}</div>
                  <div><span className="font-semibold text-blue-800">🧑 Sexe :</span> {selectedEleve.gender || "-"}</div>
                  <div><span className="font-semibold text-blue-800">🌍 Nationalité :</span> {selectedEleve.nationality || "-"}</div>
                  <div><span className="font-semibold text-blue-800">🆔 Numéro étudiant :</span> {selectedEleve.studentNumber || "-"}</div>
                  <div><span className="font-semibold text-blue-800">🗓️ Date inscription :</span> {selectedEleve.registrationDate ? new Date(selectedEleve.registrationDate).toLocaleDateString() : "-"}</div>
                  <div><span className="font-semibold text-blue-800">📚 Session d'inscription :</span> {selectedEleve.subGroup?.session || "-"}</div>
                  <div>
                    <span className="font-semibold text-blue-800">🎓 Filières :</span> {selectedEleve.filieres?.length ? (
                      <ul className="list-disc ml-5 space-y-1">
                        {selectedEleve.filieres.map((f: Filiere, idx: number) => (
                          <li key={f.id || idx}>
                            <span className="font-semibold">{f.code}</span>
                            {f.label && ` – ${f.label}`}
                            {f.level && (
                              <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold align-middle">{f.level}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : "-"}
                  </div>
                  <div><span className="font-semibold text-blue-800">👥 Sous-groupe :</span> {selectedEleve.subGroup?.code || "-"}</div>
                  <div><span className="font-semibold text-blue-800">🏢 Groupe :</span> {selectedEleve.subGroup?.group?.name || "-"}</div>
                  <div><span className="font-semibold text-blue-800">💸 Boursier :</span> {selectedEleve.scholarship ? <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Oui</span> : <span className="inline-block px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-xs font-semibold">Non</span>}</div>
                  <div><span className="font-semibold text-blue-800">♿ Handicap :</span> {selectedEleve.handicap ? <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">Oui</span> : <span className="inline-block px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-xs font-semibold">Non</span>}</div>
                </div>
                <div className="w-full flex justify-end mt-8">
                  <DialogClose asChild>
                    <Button variant="outline">Fermer</Button>
                  </DialogClose>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL FORMULAIRE MODERNE */}
      <Dialog open={showForm} onOpenChange={v => !v && setShowForm(false)}>
        <DialogContent className="max-w-xl w-full">
          <form onSubmit={handleSubmit} className="space-y-6">
            <DialogH>
              <DialogT>{editingId ? "Modifier l'élève" : "Créer un élève"}</DialogT>
            </DialogH>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex flex-col items-center gap-2 w-full sm:w-1/3">
                <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden border-2 border-primary flex items-center justify-center">
                  {form.photoUrl ? (
                    <img src={form.photoUrl} alt="Photo élève" className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-5xl text-gray-400">👤</span>
                  )}
                </div>
                <PhotoUploader onUpload={url => setForm({ ...form, photoUrl: url })} />
                <Input
                  placeholder="URL photo (optionnel)"
                  value={form.photoUrl}
                  onChange={e => setForm({ ...form, photoUrl: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <Input placeholder="Prénom" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required />
                <Input placeholder="Nom" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required />
                <Input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                <div className="flex flex-col">
                  <label htmlFor="dateOfBirth" className="text-xs font-medium mb-1">Date de naissance</label>
                  <Input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} />
                </div>
                <Input placeholder="Téléphone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                <Input placeholder="Adresse" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v as "M"|"F"|"Autre" })}>
                  <SelectTrigger><SelectValue placeholder="Sexe" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Homme</SelectItem>
                    <SelectItem value="F">Femme</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Nationalité" value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} />
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as "actif"|"inactif"|"archivé" })}>
                  <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="inactif">Inactif</SelectItem>
                    <SelectItem value="archivé">Archivé</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex flex-col">
                  <label htmlFor="registrationDate" className="text-xs font-medium mb-1">Date d'inscription</label>
                  <Input id="registrationDate" type="date" value={form.registrationDate} onChange={e => setForm({ ...form, registrationDate: e.target.value })} />
                </div>
                <Input placeholder="Numéro étudiant" value={form.studentNumber} onChange={e => setForm({ ...form, studentNumber: e.target.value })} />
                <div className="flex items-center gap-2 col-span-2">
                  <input type="checkbox" checked={form.scholarship} onChange={e => setForm({ ...form, scholarship: e.target.checked })} id="scholarship" className="accent-primary" />
                  <label htmlFor="scholarship" className="text-sm">Boursier</label>
                  <input type="checkbox" checked={form.handicap} onChange={e => setForm({ ...form, handicap: e.target.checked })} id="handicap" className="accent-primary" />
                  <label htmlFor="handicap" className="text-sm">Handicap</label>
                </div>
                <div className="col-span-2">
                  <Select value={form.subGroupId} onValueChange={v => setForm({ ...form, subGroupId: v })}>
                    <SelectTrigger><SelectValue placeholder="Sous-groupe" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Aucun sous-groupe —</SelectItem>
                      {subGroups.map((sg) => (
                        <SelectItem key={sg.id} value={sg.id}>
                          {sg.group.name} — {sg.code} ({sg.session})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 border rounded-lg p-3">
                  <div className="font-semibold mb-2">Filières (multi-sélection)</div>
                  <div className="flex flex-wrap gap-3">
                    {filieres.map((f) => (
                      <label key={f.id} className="flex items-center gap-2 text-sm">
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
                          className="accent-primary"
                        />
                        {f.code} - {f.label || "Sans label"}
                      </label>
                    ))}
                    {filieres.length === 0 && (
                      <span className="text-muted-foreground text-xs">Aucune filière disponible</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <DialogF>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                Enregistrer
              </Button>
            </DialogF>
            {tempPassword && (
              <div className="text-green-600 font-medium mt-2">
                Mot de passe temporaire : <b>{tempPassword}</b>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
