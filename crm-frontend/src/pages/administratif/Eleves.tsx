import { useState } from "react";
import { Dialog, DialogContent, DialogHeader as DialogH, DialogTitle as DialogT, DialogFooter as DialogF } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import PhotoUploader from "@/components/PhotoUploader";


// Interface unique pour la fiche élève, alignée sur la réponse backend


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
  subGroupId: string;
  filiereIds: string[];
};

function Eleves() {
  // Tous les états et handlers ici
  const [showForm, setShowForm] = useState(false);
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
    subGroupId: "",
    filiereIds: [],
  });
  const [tempPassword] = useState("");
  const [subGroups] = useState<SubGroup[]>([]);
  const [filieres] = useState<Filiere[]>([]);
  const [editingId] = useState<string | null>(null);

  // ... autres hooks et handlers ...

  return (
    <>
      <Dialog open={showForm} onOpenChange={v => !v && setShowForm(false)}>
        <DialogContent className="max-w-xl w-full">
          <MultiStepEleveForm
            form={form}
            setForm={setForm}
            onSubmit={() => {}}
            onCancel={() => setShowForm(false)}
            tempPassword={tempPassword}
            subGroups={subGroups}
            filieres={filieres}
            editingId={editingId}
          />
        </DialogContent>
      </Dialog>
      {/* ...le reste du composant (table, boutons, etc.)... */}
    </>
  );
}

// --- Wizard multi-step form pour création/édition élève ---
type Filiere = { id: string; code: string; label?: string; level?: string };
type SubGroup = { id: string; code: string; session?: string; level?: string; group: { id: string; name: string } };
interface MultiStepEleveFormProps {
  form: EleveForm;
  setForm: React.Dispatch<React.SetStateAction<EleveForm>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  tempPassword: string;
  subGroups: SubGroup[];
  filieres: Filiere[];
  editingId: string | null;
}
function MultiStepEleveForm({ form, setForm, onSubmit, onCancel, tempPassword, subGroups, filieres, editingId }: MultiStepEleveFormProps) {
  const [step, setStep] = useState(0);
  const steps = ["Infos principales", "Scolarité", "Contact & photo"];

  // Validation simple par étape (optionnel)
  const canNext = () => {
    if (step === 0) return form.firstName && form.lastName && form.email;
    if (step === 1) return true;
    if (step === 2) return true;
    return false;
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <DialogH>
        <DialogT>{editingId ? "Modifier l'élève" : "Créer un élève"}</DialogT>
        <div className="flex items-center gap-2 mt-2">
          {steps.map((label: string, i: number) => (
            <div key={label} className="flex-1 flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border-2 ${step === i ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-300'}`}>{i+1}</div>
              <span className={`text-xs mt-1 ${step === i ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}>{label}</span>
            </div>
          ))}
        </div>
      </DialogH>
      {step === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input placeholder="Prénom" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required />
          <Input placeholder="Nom" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required />
          <Input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          <div className="flex flex-col">
            <label htmlFor="dateOfBirth" className="text-xs font-medium mb-1">Date de naissance</label>
            <Input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} />
          </div>
          <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v as "M"|"F"|"Autre" })}>
            <SelectTrigger><SelectValue placeholder="Sexe" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Homme</SelectItem>
              <SelectItem value="F">Femme</SelectItem>
              <SelectItem value="Autre">Autre</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Nationalité" value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} />
        </div>
      )}
      {step === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as "actif"|"inactif"|"archivé" })}>
            <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="actif">Actif</SelectItem>
              <SelectItem value="inactif">Inactif</SelectItem>
              <SelectItem value="archivé">Archivé</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Numéro étudiant" value={form.studentNumber} onChange={e => setForm({ ...form, studentNumber: e.target.value })} />
          <Select value={form.subGroupId} onValueChange={v => setForm({ ...form, subGroupId: v })}>
            <SelectTrigger><SelectValue placeholder="Sous-groupe" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Aucun sous-groupe —</SelectItem>
              {subGroups.map((sg) => (
                <SelectItem key={sg.id} value={sg.id}>
                  {sg.group.name} — {sg.code} {sg.session ? `(${sg.session})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                        setForm({ ...form, filiereIds: form.filiereIds.filter((id: string) => id !== f.id) });
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
          <div className="flex items-center gap-2 col-span-2">
            <input type="checkbox" checked={form.scholarship} onChange={e => setForm({ ...form, scholarship: e.target.checked })} id="scholarship" className="accent-primary" />
            <label htmlFor="scholarship" className="text-sm">Boursier</label>
            <input type="checkbox" checked={form.handicap} onChange={e => setForm({ ...form, handicap: e.target.checked })} id="handicap" className="accent-primary" />
            <label htmlFor="handicap" className="text-sm">Handicap</label>
          </div>
        </div>
      )}
      {step === 2 && (
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
          <div className="grid grid-cols-1 gap-4 w-full">
            <Input placeholder="Téléphone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Adresse" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            <Input placeholder="Nom du responsable légal" value={form.legalGuardianName} onChange={e => setForm({ ...form, legalGuardianName: e.target.value })} />
            <Input placeholder="Téléphone du responsable" value={form.legalGuardianPhone} onChange={e => setForm({ ...form, legalGuardianPhone: e.target.value })} />
          </div>
        </div>
      )}
      <DialogF>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        {step > 0 && (
          <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
            Précédent
          </Button>
        )}
        {step < steps.length - 1 && (
          <Button type="button" onClick={() => canNext() && setStep(step + 1)} disabled={!canNext()}>
            Suivant
          </Button>
        )}
        {step === steps.length - 1 && (
          <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
            Enregistrer
          </Button>
        )}
      </DialogF>
      {tempPassword && (
        <div className="text-green-600 font-medium mt-2">
          Mot de passe temporaire : <b>{tempPassword}</b>
        </div>
      )}
    </form>
  );
}

export default Eleves;
