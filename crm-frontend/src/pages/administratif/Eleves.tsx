type Filiere = { id: string; code: string; label?: string; level?: string };
import { useEffect, useState, useCallback } from "react";
import { useArchivedYear } from "../../hooks/useArchivedYear";
import { Dialog, DialogContent, DialogHeader as DialogH, DialogTitle as DialogT, DialogFooter as DialogF, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FicheEleveCard from "../../components/FicheEleveCard";
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


// Interface unique pour la fiche élève, alignée sur la réponse backend
export interface Eleve {
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
  scholarship?: boolean;
  handicap?: boolean;
  studentNumber?: string;
  photoUrl?: string;
  legalGuardianName?: string;
  legalGuardianPhone?: string;
  subGroups: SubGroup[];
  filieres: Filiere[];
  subGroup?: SubGroup;
}

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
  scholarship: boolean;
  handicap: boolean;
  subGroupId?: string;
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

  // Ajout hooks pour paiements, absences, notes
  const [paiements, setPaiements] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [notes, setNotes] = useState([]);

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
    scholarship: false,
    handicap: false,
    subGroupId: undefined,
    filiereIds: [],
  });

  const token = localStorage.getItem("token");

  // -----------------------------
    // 🔹 Charger paiements, absences, notes pour la fiche élève
    useEffect(() => {
      if (!selectedEleve) return;
      const token = localStorage.getItem("token");

      // Paiements
      fetch(`${import.meta.env.VITE_API_URL}/payments?studentId=${selectedEleve.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(setPaiements);

      // Absences
      fetch(`${import.meta.env.VITE_API_URL}/eleve/absences/${selectedEleve.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(setAbsences);

      // Notes
      fetch(`${import.meta.env.VITE_API_URL}/notes/eleve/${selectedEleve.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(setNotes);
    }, [selectedEleve]);
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
      // legalGuardianEmail removed
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
      // legalGuardianEmail removed
      scholarship: e.scholarship ?? false,
      handicap: e.handicap ?? false,
      subGroupId: e.subGroup?.id || "",
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
          {selectedEleve && (
            <>
              <div className="pt-8 px-6 pb-2">
                <FicheEleveCard
                  photoUrl={selectedEleve.photoUrl}
                  nom={selectedEleve.lastName}
                  prenom={selectedEleve.firstName}
                  filiere={{
                    label: selectedEleve.filieres?.[0]?.label || selectedEleve.filieres?.[0]?.code || "",
                    color: "#60a5fa",
                  }}
                  niveau={selectedEleve.filieres?.[0]?.level || undefined}
                  session={selectedEleve.subGroup?.session || undefined}
                  statut={selectedEleve.status}
                  numeroEtudiant={selectedEleve.studentNumber}
                  dateNaissance={selectedEleve.dateOfBirth ? new Date(selectedEleve.dateOfBirth).toLocaleDateString() : undefined}
                  email={selectedEleve.email}
                  telephone={selectedEleve.phone}
                  adresse={selectedEleve.address}
                  genre={selectedEleve.gender}
                  nationalite={selectedEleve.nationality}
                  responsableNom={selectedEleve.legalGuardianName}
                  responsableTel={selectedEleve.legalGuardianPhone}
                  inscription={selectedEleve.registrationDate ? new Date(selectedEleve.registrationDate).toLocaleDateString() : undefined}
                  badges={[
                    selectedEleve.scholarship ? "Boursier" : undefined,
                    selectedEleve.handicap ? "Handicap" : undefined,
                  ].filter(Boolean) as string[]}
                  paiements={paiements}
                  absences={absences}
                  notes={notes}
                  actions={
                    <DialogClose asChild>
                      <Button variant="outline">Fermer</Button>
                    </DialogClose>
                  }
                />
              </div>
              {/* Autres infos détaillées ou actions complémentaires ici si besoin */}
            </>
          )}
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
