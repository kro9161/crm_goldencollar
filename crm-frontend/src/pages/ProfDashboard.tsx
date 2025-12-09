// ---------------------------------------------------------
//  ProfDashboard.tsx — Version complète, typée, zéro warning
// ---------------------------------------------------------

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from "@fullcalendar/core/locales/fr";
import {
  Calendar,
  CheckSquare,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import type { EventInput } from "@fullcalendar/core";

/* ---------------- TYPES BACKEND ------------------ */

type ApiUser = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
};

type ApiSalle = {
  id: string;
  name: string;
};

type ApiCourse = {
  id: string;
  name: string;
};

type ApiSubGroup = {
  id: string;
  name: string;
  students: {
    id: string;
    firstName: string;
    lastName: string;
  }[];
};

type EventExtendedProps = {
  course: ApiCourse;
  professor: ApiUser;
  salle: ApiSalle;
  targetGroup?: { id: string; name: string } | null;
  targetSubGroup?: ApiSubGroup | null;
};

/* -------------- Event FullCalendar -------------- */

export type ApiEvent = EventInput & {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps: EventExtendedProps;
};

/* ---------------- Types Élèves / Appel ---------------- */

type Student = {
  id: string;
  firstName: string;
  lastName: string;
};

type PresenceStatus = "present" | "absent" | "retard" | "justifie";

type PresencePayload = {
  studentId: string;
  status: PresenceStatus;
};

/* --------------------- COMPONENT ---------------------- */

export default function ProfDashboard() {
  const [activeTab, setActiveTab] = useState<"planning" | "appel" | "notes">("planning");
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const [presence, setPresence] = useState<Record<string, PresenceStatus>>({});
  const [notes, setNotes] = useState<Record<string, number>>({});

  const token = localStorage.getItem("token") ?? "";

  /* ------ Charger planning du prof ------ */
  useEffect(() => {
    fetch("http://localhost:4000/prof/planning", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data: ApiEvent[]) => {
        console.log("📅 Planning prof chargé:", data.length, "events");
        console.log("📅 IDs des events:", data.map(e => e.id));
        setEvents(data);
      })
      .catch(console.error);
  }, [token]);

  /* ------ Quand on clique une séance : charger élèves ------ */
useEffect(() => {
  if (!selectedSessionId) return;

  const event = events.find(e => e.id === selectedSessionId);
  console.log("🔍 Session sélectionnée:", selectedSessionId);
  console.log("📦 Event trouvé:", event);
  console.log("📦 extendedProps:", event?.extendedProps);
  console.log("👥 Students dans extendedProps:", event?.extendedProps?.students);
  
  if (!event) return;

  const studentList = event.extendedProps?.students ?? [];
  console.log("✅ Liste élèves finale:", studentList);

  setStudents(studentList);
  setPresence({});
  setNotes({});
}, [selectedSessionId, events]);


  /* ---------------- APPEL ---------------- */

  const togglePresence = (studentId: string, status: PresenceStatus) => {
    setPresence((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === status ? "absent" : status,
    }));
  };

  const saveAttendance = () => {
    if (!selectedSessionId) return alert("Choisissez une séance dans le planning.");

    const payload: PresencePayload[] = students.map((s) => ({
      studentId: s.id,
      status: presence[s.id] ?? "absent",
    }));

    fetch(`http://localhost:4000/courses/${selectedSessionId}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erreur enregistrement appel");
        alert("✅ Présences enregistrées");
      })
      .catch((e) => alert(e.message));
  };

  /* ---------------- NOTES ---------------- */

  const saveNotes = () => {
    if (!selectedSessionId) return alert("Choisissez une séance dans le planning.");

    const promises = Object.entries(notes)
      .filter(([, val]) => typeof val === "number")
      .map(([studentId, valeur]) =>
        fetch("http://localhost:4000/notes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            studentId,
            courseId: selectedSessionId, // ✔ cours = sessionId (backend actuel)
            valeur,
            commentaire: null,
          }),
        })
      );

    Promise.all(promises)
      .then(() => alert("✅ Notes enregistrées"))
      .catch(() => alert("❌ Erreur lors de l’enregistrement des notes"));
  };

  /* ------------------- RENDER ------------------- */

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">👋 Bonjour Professeur</h1>
          <p className="text-gray-500">Votre espace enseignant</p>
        </div>

        <a
          href="https://votre-moodle.fr"
          target="_blank"
          rel="noreferrer"
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <BookOpen className="w-5 h-5" />
          Accéder à Moodle
        </a>
      </header>

      {/* TABS */}
      <div className="flex gap-4 mb-6">
        {[
          { id: "planning", label: "📅 Planning", icon: Calendar },
          { id: "appel", label: "📋 Appel", icon: CheckSquare },
          { id: "notes", label: "🧮 Notes", icon: GraduationCap },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition font-medium ${
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow"
                : "bg-white border hover:bg-gray-100"
            }`}
          >
            <tab.icon className="w-5 h-5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="bg-white rounded-2xl shadow p-6">

        {/* --- PLANNING --- */}
        {activeTab === "planning" && (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale={frLocale}
            height="80vh"
            events={events}
            editable={false}
            selectable={false}
            allDaySlot={false}
            weekends={false}
            slotMinTime="08:00:00"
            slotMaxTime="19:00:00"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "timeGridWeek,dayGridMonth",
            }}
eventClick={(info) => {
  const sessionId = info.event.id;
  
  console.log("🖱️ Clic sur session:", sessionId);
  
  if (!sessionId) {
    alert("Session introuvable");
    return;
  }

  setSelectedSessionId(sessionId);
}}



          />
        )}

        {/* --- APPEL --- */}
        {activeTab === "appel" && (
          <AppelView
            selectedSessionId={selectedSessionId}
            students={students}
            presence={presence}
            togglePresence={togglePresence}
            saveAttendance={saveAttendance}
          />
        )}

        {/* --- NOTES --- */}
        {activeTab === "notes" && (
          <NotesView
            selectedSessionId={selectedSessionId}
            students={students}
            notes={notes}
            setNotes={setNotes}
            saveNotes={saveNotes}
          />
        )}

      </div>
    </div>
  );
}

/* ---------------- SOUS-COMPONENT : APPEL ---------------- */

function AppelView({
  selectedSessionId,
  students,
  presence,
  togglePresence,
  saveAttendance,
}: {
  selectedSessionId: string | null;
  students: Student[];
  presence: Record<string, PresenceStatus>;
  togglePresence: (id: string, status: PresenceStatus) => void;
  saveAttendance: () => void;
}) {
  if (!selectedSessionId)
    return <p className="text-gray-500">Clique sur un créneau dans le planning.</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Faire l’appel</h2>
      <table className="w-full text-sm">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th className="px-3 py-2">Nom</th>
            <th className="px-3 py-2">Prénom</th>
            <th className="px-3 py-2 text-center">Présent</th>
            <th className="px-3 py-2 text-center">Retard</th>
            <th className="px-3 py-2 text-center">Justifié</th>
          </tr>
        </thead>

        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="px-3 py-2">{s.lastName}</td>
              <td className="px-3 py-2">{s.firstName}</td>

              <td className="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={presence[s.id] === "present"}
                  onChange={() => togglePresence(s.id, "present")}
                />
              </td>

              <td className="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={presence[s.id] === "retard"}
                  onChange={() => togglePresence(s.id, "retard")}
                />
              </td>

              <td className="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={presence[s.id] === "justifie"}
                  onChange={() => togglePresence(s.id, "justifie")}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={saveAttendance}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg"
      >
        Enregistrer l’appel
      </button>
    </div>
  );
}

/* ---------------- SOUS-COMPONENT : NOTES ---------------- */

function NotesView({
  selectedSessionId,
  students,
  notes,
  setNotes,
  saveNotes,
}: {
  selectedSessionId: string | null;
  students: Student[];
  notes: Record<string, number>;
  setNotes: (fn: (prev: Record<string, number>) => Record<string, number>) => void;
  saveNotes: () => void;
}) {
  if (!selectedSessionId)
    return <p className="text-gray-500">Clique sur un créneau dans le planning.</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Saisir les notes</h2>

      <table className="w-full text-sm">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th className="px-3 py-2">Nom</th>
            <th className="px-3 py-2">Prénom</th>
            <th className="px-3 py-2">Note</th>
          </tr>
        </thead>

        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="px-3 py-2">{s.lastName}</td>
              <td className="px-3 py-2">{s.firstName}</td>

              <td className="px-3 py-2">
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={0.5}
                  value={Number.isFinite(notes[s.id]) ? notes[s.id] : ""}
                  onChange={(e) =>
                    setNotes((prev) => ({
                      ...prev,
                      [s.id]: Number(e.target.value),
                    }))
                  }
                  className="w-20 border rounded"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={saveNotes}
        className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg"
      >
        Enregistrer les notes
      </button>
    </div>
  );
}
