import { useEffect, useState } from "react";
import { DialogHeader as DialogH, DialogTitle as DialogT, DialogFooter as DialogF } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import PhotoUploader from "@/components/PhotoUploader";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import FicheProfCard from "../../components/FicheProfCard";
import type { Professeur } from "../../types/Professeur";

export default function Professeurs() {
      // Correction: fonction dédiée pour fermer la fiche prof
      function handleCloseFicheProf(open: boolean) {
        if (!open) {
          setSelectedProf(null);
        }
      }
    // Formulaire complet professeur
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      dateOfBirth: "",
      nationality: "",
      status: "actif",
      photoUrl: "",
      teacherNumber: "",
      specialty: "",
      hireDate: "",
    });
    const [tempPassword, setTempPassword] = useState("");

    const openCreate = () => {
      setEditingId(null);
      setTempPassword("");
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        dateOfBirth: "",
        nationality: "",
        status: "actif",
        photoUrl: "",
        teacherNumber: "",
        specialty: "",
        hireDate: "",
      });
      setShowForm(true);
    };

    const openEdit = (p: Professeur) => {
      setEditingId(p.id);
      setTempPassword("");
      setForm({
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phone: p.phone || "",
        address: p.address || "",
        dateOfBirth: p.dateOfBirth || "",
        nationality: p.nationality || "",
        status: p.status || "actif",
        photoUrl: p.photoUrl || "",
        teacherNumber: p.teacherNumber || "",
        specialty: p.specialty || "",
        hireDate: p.hireDate || "",
      });
      setShowForm(true);
    };

    const handleSubmit = async (event: React.FormEvent) => {
      event.preventDefault();
      const url = `${import.meta.env.VITE_API_URL}/users${editingId ? `/${editingId}` : ""}`;
      const method: "POST" | "PATCH" = editingId ? "PATCH" : "POST";
      const body = {
        ...form,
        role: "prof",
        dateOfBirth: form.dateOfBirth || null,
        hireDate: form.hireDate || null,
        academicYearId: undefined // à compléter si besoin
      };
      const res = await fetch(url + (method === "POST" ? "" : "?role=prof"), {
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
      // Succès !
      setShowForm(false);
      setEditingId(null);
      setTempPassword("");
      // Recharge la liste
      fetch(`${import.meta.env.VITE_API_URL}/users?role=prof`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(setProfesseurs);
    };
  const [professeurs, setProfesseurs] = useState<Professeur[]>([]);
  const [selectedProf, setSelectedProf] = useState<Professeur | null>(null);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/users?role=prof`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setProfesseurs)
      .catch(() => setError("Erreur de chargement des professeurs"));
  }, [token]);

  // Charger les cours, groupes, absences pour la fiche prof
  // Correction : éviter de recharger la fiche si elle vient d'être fermée
  useEffect(() => {
    if (!selectedProf) return;
    let isActive = true;
    Promise.all([
      fetch(`${import.meta.env.VITE_API_URL}/courses?profId=${selectedProf.id}`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${import.meta.env.VITE_API_URL}/subgroups?profId=${selectedProf.id}`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${import.meta.env.VITE_API_URL}/prof/absences/${selectedProf.id}`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
    ]).then(([courses, subGroups, absences]) => {
      if (isActive) setSelectedProf({ ...selectedProf, courses, subGroups, absences });
    });
    return () => { isActive = false; };
  }, [selectedProf, token]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">👨‍🏫 Gestion des professeurs</h2>
      <Button onClick={openCreate} className="h-10 px-6 text-base font-semibold mb-4">
        ➕ Nouveau professeur
      </Button>
      {error && <div className="text-red-600 font-medium mb-4">{error}</div>}
      <div className="overflow-x-auto rounded-xl shadow border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Nom</th>
              <th className="px-4 py-3 text-left font-semibold">Prénom</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Cours enseignés</th>
              <th className="px-4 py-3 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {professeurs.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-medium">{p.lastName}</td>
                <td className="px-4 py-3">{p.firstName}</td>
                <td className="px-4 py-3">{p.email}</td>
                <td className="px-4 py-3">{Array.isArray(p.courses) && p.courses.length > 0 ? p.courses.map((c) => c.name).join(", ") : "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-center">
                    <Button variant="secondary" size="sm" onClick={() => setSelectedProf({ ...p, courses: p.courses ?? [], subGroups: p.subGroups ?? [], absences: p.absences ?? [] })}>
                      👁️ Fiche
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                      ✏️
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* MODAL FORM PROFESSEUR MODERNE */}
      <Dialog open={showForm} onOpenChange={v => !v && setShowForm(false)}>
        <DialogContent className="max-w-xl w-full">
          <form onSubmit={handleSubmit} className="space-y-6">
            <DialogH>
              <DialogT>{editingId ? "Modifier le professeur" : "Créer un professeur"}</DialogT>
            </DialogH>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex flex-col items-center gap-2 w-full sm:w-1/3">
                <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden border-2 border-primary flex items-center justify-center">
                  {form.photoUrl ? (
                    <img src={form.photoUrl} alt="Photo professeur" className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-5xl text-gray-400">👨‍🏫</span>
                  )}
                </div>
                {/* PhotoUploader réutilisé */}
                <PhotoUploader onUpload={url => setForm({ ...form, photoUrl: url })} />
                <Input
                  placeholder="URL photo (optionnel)"
                  value={form.photoUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, photoUrl: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="flex flex-col">
                  <label htmlFor="firstName" className="text-xs font-medium mb-1">Prénom</label>
                  <Input id="firstName" placeholder="Prénom" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="lastName" className="text-xs font-medium mb-1">Nom</label>
                  <Input id="lastName" placeholder="Nom" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="email" className="text-xs font-medium mb-1">Email</label>
                  <Input id="email" type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="phone" className="text-xs font-medium mb-1">Téléphone</label>
                  <Input id="phone" placeholder="Téléphone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="address" className="text-xs font-medium mb-1">Adresse</label>
                  <Input id="address" placeholder="Adresse" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="specialty" className="text-xs font-medium mb-1">Spécialité</label>
                  <Input id="specialty" placeholder="Spécialité" value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="teacherNumber" className="text-xs font-medium mb-1">Numéro professeur</label>
                  <Input id="teacherNumber" placeholder="Numéro professeur" value={form.teacherNumber} onChange={e => setForm({ ...form, teacherNumber: e.target.value })} />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="dateOfBirth" className="text-xs font-medium mb-1">Date de naissance</label>
                  <Input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="nationality" className="text-xs font-medium mb-1">Nationalité</label>
                  <Input id="nationality" placeholder="Nationalité" value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="hireDate" className="text-xs font-medium mb-1">Date d'embauche</label>
                  <Input id="hireDate" type="date" value={form.hireDate} onChange={e => setForm({ ...form, hireDate: e.target.value })} />
                </div>
                <div className="flex flex-col">
                  <label htmlFor="status" className="text-xs font-medium mb-1">Statut</label>
                  <Select value={form.status} onValueChange={(v: string) => setForm({ ...form, status: v as "actif"|"inactif"|"archivé" })}>
                    <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                      <SelectItem value="archivé">Archivé</SelectItem>
                    </SelectContent>
                  </Select>
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
      {/* MODAL FICHE PROFESSEUR */}
      <Dialog open={!!selectedProf} onOpenChange={handleCloseFicheProf}>
        <DialogContent className="max-w-2xl w-full p-0 bg-gradient-to-br from-white to-blue-50 border-0">
          {selectedProf && (
            <div className="pt-8 px-6 pb-2">
              <FicheProfCard
                id={selectedProf.id}
                firstName={selectedProf.firstName}
                lastName={selectedProf.lastName}
                email={selectedProf.email}
                phone={selectedProf.phone}
                address={selectedProf.address}
                dateOfBirth={selectedProf.dateOfBirth}
                nationality={selectedProf.nationality}
                status={selectedProf.status}
                photoUrl={selectedProf.photoUrl}
                teacherNumber={selectedProf.teacherNumber}
                specialty={selectedProf.specialty}
                hireDate={selectedProf.hireDate}
                courses={selectedProf.courses}
                subGroups={selectedProf.subGroups}
                absences={selectedProf.absences}
                actions={
                  <DialogClose asChild>
                    <Button variant="outline">Fermer</Button>
                  </DialogClose>
                }
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
