import { useEffect, useState } from "react";
import { Calendar, ClipboardList, BookOpen, GraduationCap } from "lucide-react";
import { useArchivedYear } from "../hooks/useArchivedYear";

type Course = {
  id: string;
  matiere: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  salle?: string;
};

type Note = {
  id: string;
  matiere: string;
  valeur: number;
};

type Absence = {
  id: string;
  date: string;
  matiere: string;
  justifiee: boolean;
};

/** ---- Types de réponses API ---- */
type ApiNote = {
  id: string;
  valeur: number;
  commentaire?: string | null;
  course: { id: string; name: string };
};

type ApiAbsence = {
  id: string;
  justified: boolean;
  session: {
    startTime: string;
    course: { id: string; name: string };
  };
};

export default function EleveDashboard() {
  const [activeTab, setActiveTab] = useState<"planning" | "notes" | "absences">("planning");
  const [planning, setPlanning] = useState<Course[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const { academicYearId } = useArchivedYear();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    
    console.log("🎓 EleveDashboard MOUNT - token:", !!token, "userId:", userId);
    
    if (!token || !userId) {
      console.log("❌ Token ou userId manquant - arrêt");
      return;
    }

    console.log("✅ Token et userId OK - chargement planning...");

    // 1) Planning via la nouvelle route /eleves/planning/:id
    const yearParam = academicYearId ? `?academicYearId=${academicYearId}` : "";
    fetch(`http://localhost:4000/eleves/planning/${userId}${yearParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        console.log("📅 Planning response status:", res.status);
        return res.json();
      })
      .then((data) => {
        console.log("📅 Planning data:", data);
        // Les données du backend sont déjà formatées pour FullCalendar
        // On les convertit au format que le composant attend
        setPlanning(data.map((event: any) => ({
          id: event.id,
          matiere: event.extendedProps?.courseName || event.title,
          date: new Date(event.start).toLocaleDateString(),
          heureDebut: new Date(event.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          heureFin: new Date(event.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          salle: event.extendedProps?.salleName,
        })));
      })
      .catch((err) => {
        console.error("❌ Erreur planning:", err);
      });

    // 2) Notes réelles
    fetch(`http://localhost:4000/notes/eleve/${userId}${yearParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data: ApiNote[]) =>
        setNotes(
          data.map((n) => ({
            id: n.id,
            matiere: n.course.name,
            valeur: n.valeur,
          }))
        )
      )
      .catch(console.error);

    // 3) Absences réelles
    fetch(`http://localhost:4000/eleve/absences/${userId}${yearParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data: ApiAbsence[]) =>
        setAbsences(
          data.map((a) => ({
            id: a.id,
            date: new Date(a.session.startTime).toLocaleDateString(),
            matiere: a.session.course.name,
            justifiee: a.justified,
          }))
        )
      )
      .catch(console.error);
  }, []);

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">👋 Bonjour, cher élève</h1>
          <p className="text-gray-500">Bienvenue dans ton espace personnel</p>
        </div>
        <a
          href="https://votre-moodle.fr"
          target="_blank"
          rel="noreferrer"
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium px-4 py-2 rounded-lg shadow transition flex items-center gap-2"
        >
          <BookOpen className="w-5 h-5" /> Accéder à Moodle
        </a>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {[
          { id: "planning", label: "📅 Planning", icon: Calendar },
          { id: "notes", label: "🧮 Notes", icon: GraduationCap },
          { id: "absences", label: "📋 Absences", icon: ClipboardList },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as "planning" | "notes" | "absences")}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow"
                : "bg-white hover:bg-gray-100 text-gray-700 border"
            }`}
          >
            <tab.icon className="w-5 h-5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow p-6">
        {activeTab === "planning" && <PlanningView planning={planning} />}
        {activeTab === "notes" && <NotesView notes={notes} />}
        {activeTab === "absences" && <AbsencesView absences={absences} />}
      </div>
    </div>
  );
}

/* ---- Sous-compos ----  */

function PlanningView({ planning }: { planning: Course[] }) {
  return planning.length === 0 ? (
    <p className="text-gray-500">Aucun cours prévu pour le moment.</p>
  ) : (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {planning.map((p) => (
        <div key={p.id} className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4">
          <h3 className="font-semibold text-lg">{p.matiere}</h3>
          <p>{p.date}</p>
          <p className="text-sm opacity-80">
            {p.heureDebut} - {p.heureFin}
          </p>
          {p.salle && <p className="text-sm opacity-80">Salle : {p.salle}</p>}
        </div>
      ))}
    </div>
  );
}

function NotesView({ notes }: { notes: Note[] }) {
  return notes.length === 0 ? (
    <p className="text-gray-500">Aucune note disponible.</p>
  ) : (
    <table className="w-full text-sm text-gray-700">
      <thead className="bg-blue-600 text-white">
        <tr>
          <th className="px-4 py-2 text-left">Matière</th>
          <th className="px-4 py-2 text-center">Note /20</th>
        </tr>
      </thead>
      <tbody>
        {notes.map((n) => (
          <tr key={n.id} className="border-b hover:bg-gray-50">
            <td className="px-4 py-2">{n.matiere}</td>
            <td className="px-4 py-2 text-center font-semibold">{n.valeur}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AbsencesView({ absences }: { absences: Absence[] }) {
  return absences.length === 0 ? (
    <p className="text-gray-500">Aucune absence enregistrée.</p>
  ) : (
    <table className="w-full text-sm text-gray-700">
      <thead className="bg-blue-600 text-white">
        <tr>
          <th className="px-4 py-2 text-left">Date</th>
          <th className="px-4 py-2 text-left">Matière</th>
          <th className="px-4 py-2 text-center">Justifiée</th>
        </tr>
      </thead>
      <tbody>
        {absences.map((a) => (
          <tr key={a.id} className="border-b hover:bg-gray-50">
            <td className="px-4 py-2">{a.date}</td>
            <td className="px-4 py-2">{a.matiere}</td>
            <td className="px-4 py-2 text-center">{a.justifiee ? "✅ Oui" : "❌ Non"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
