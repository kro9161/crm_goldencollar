// crm-frontend/src/pages/administratif/Planning.tsx
import { useEffect, useState } from "react";
import { useArchivedYear } from "../../hooks/useArchivedYear";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg, EventDropArg, EventInput } from "@fullcalendar/core";
import frLocale from "@fullcalendar/core/locales/fr";
import Modal from "react-modal";
import { CalendarDays, X, PlusCircle, Pencil, Trash2 } from "lucide-react";
import { jwtDecode } from "jwt-decode";
import type { CSSProperties } from "react";
import "./Planning.css";

// ---------------------- TYPES ----------------------

interface TokenPayload {
  id: string;
  role: string;
  email: string;
}

interface ApiProfessor {
  id: string;
  firstName: string;
  lastName: string;
}

interface ApiRoom {
  id: string;
  name: string;
}

interface ApiCourse {
  id: string;
  name: string;
  professors?: ApiProfessor[];
}

interface ApiSession {
  id: string;
  startTime: string;
  endTime: string;

  course: ApiCourse;
  professor?: ApiProfessor;
  createdBy: ApiProfessor;

  salle?: ApiRoom;
}

interface Holiday {
  date: string; // "2025-11-11"
  name: string;
}

// Pour ajout multiple
interface Row {
  courseId: string;
  teacherId: string;
  roomId: string;
}

// Event utilisé par FullCalendar (avec nos props en plus)
type CalendarEvent = EventInput & { extendedProps?: ApiSession };

// ---------------------- MODALES ----------------------

interface AddModalProps {
  isOpen: boolean;
  rows: Row[];
  selectedSlot: { start: string; end: string } | null;
  courses: ApiCourse[];
  teachers: ApiProfessor[];
  rooms: ApiRoom[];
  onClose: () => void;
  onChangeRow: (index: number, field: keyof Row, value: string) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onSave: () => void;
}

interface EditModalProps {
  isOpen: boolean;
  event: ApiSession | null;
  courses: ApiCourse[];
  teachers: ApiProfessor[];
  rooms: ApiRoom[];
  onClose: () => void;
  onChangeCourse: (courseId: string) => void;
  onChangeProfessor: (professorId: string) => void;
  onChangeRoom: (roomId: string | null) => void;
  onUpdate: () => void;
  onDelete: () => void;
}

// ---------------------- COMPONENT PRINCIPAL ----------------------

export default function Planning() {
  const { isReadOnly, academicYearId, hasActiveYear } = useArchivedYear();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const [courses, setCourses] = useState<ApiCourse[]>([]);
  const [teachers, setTeachers] = useState<ApiProfessor[]>([]);
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
const [modalRooms, setModalRooms] = useState<ApiRoom[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [rows, setRows] = useState<Row[]>([{ courseId: "", teacherId: "", roomId: "" }]);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ApiSession | null>(null);

  const token = localStorage.getItem("token");

  // ---------- helpers chargement base (cours / profs / salles) ----------

  const fetchBaseData = async (): Promise<void> => {
    if (!token || !academicYearId) return;

    const yearParam = `?academicYearId=${academicYearId}`;
    const [cRes, tRes, rRes] = await Promise.all([
      fetch(`${import.meta.env.VITE_API_URL}/courses${yearParam}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${import.meta.env.VITE_API_URL}/users?role=prof&academicYearId=${academicYearId}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${import.meta.env.VITE_API_URL}/rooms`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const [coursesData, teachersData, roomsData]: [ApiCourse[], ApiProfessor[], ApiRoom[]] =
      await Promise.all([cRes.json(), tRes.json(), rRes.json()]);

    setCourses(coursesData);
    setTeachers(teachersData);
    setRooms(roomsData);
  };

  // ---------- chargement des sessions du planning ----------

  useEffect(() => {
    if (!token || !academicYearId) {
      setEvents([]);
      return;
    }

    const user: TokenPayload = jwtDecode<TokenPayload>(token);

    const yearParam = `?academicYearId=${academicYearId}`;
    fetch(`${import.meta.env.VITE_API_URL}/planning${yearParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        console.log("📅 Planning response status:", res.status);
        return res.json();
      })
      .then((data: ApiSession[]) => {
        console.log("📅 Planning data reçu:", data);
        console.log("📅 Type de data:", Array.isArray(data) ? "Array" : typeof data);
        console.log("📅 Nombre d'éléments:", Array.isArray(data) ? data.length : "N/A");
        
        let filtered: ApiSession[] = data;

        // Admin / administratif : tout
        if (user.role === "prof") {
          // Prof : seulement ses cours
          filtered = data.filter(
            (s) =>
              s.professor?.id === user.id ||
              (s.course.professors ?? []).some((p) => p.id === user.id)
          );
        }

        console.log("📅 Sessions filtrées:", filtered.length);

        const formatted: CalendarEvent[] = filtered.map((s) => {
          const sAny = s as unknown as Record<string, unknown>;
          const calEvent: CalendarEvent = {
            id: s.id,
            title: (sAny.title as string) || `${s.course?.name ?? "Cours"}`,
            start: sAny.start as string,
            end: sAny.end as string,
            extendedProps: s,
            backgroundColor: "#2563eb",
            borderColor: "#1e3a8a",
            textColor: "#fff",
          };
          return calEvent;
        });

        console.log("📅 Events formatés:", formatted.length);
        if (formatted.length > 0) {
          console.log("📅 Détail du 1er événement:", formatted[0]);
          console.log("📅 Start:", formatted[0].start, "End:", formatted[0].end);
        }

        // 🔄 Mettre à jour les événements de planning (sans toucher aux jours fériés)
        setEvents((prev) => {
          // Garder les jours fériés
          const feries = prev.filter((e) => e.id && e.id.toString().startsWith("ferie-"));
          // Remplacer COMPLÈTEMENT les événements planning (pas de merge, sinon clignotement)
          return [...feries, ...formatted];
        });
      })
      .catch((err) => {
       
        console.error("Erreur chargement planning :", err);
      });
  }, [token, academicYearId]);

  // ---------- jours fériés (fond rouge clair) ----------

  useEffect(() => {
    fetch("https://calendrier.api.gouv.fr/jours-feries/metropole.json")
      .then((res) => res.json())
      .then((data: Record<string, string>) => {
        const parsed: Holiday[] = Object.entries(data).map(([date, name]) => ({
          date,
          name,
        }));

        setHolidays(parsed);

        const feriesEvents: CalendarEvent[] = parsed.map((h) => ({
          id: `ferie-${h.date}`,
          title: `🎌 ${h.name}`,
          start: `${h.date}T00:00:00`,
          end: `${h.date}T23:59:59`,
          display: "background",
          backgroundColor: "#ffe0e0",
        }));

        setEvents((prev) => {
          const nonFeries = prev.filter((e) => !e.id || !e.id.toString().startsWith("ferie-"));
          return [...nonFeries, ...feriesEvents];
        });
      })
      .catch((err) => {
       
        console.error("Erreur jours fériés :", err);
      });
  }, []);

  // ---------- sélection pour ajout multi-cours ----------

  const handleSelect = async (selectInfo: DateSelectArg): Promise<void> => {
    const startStr = selectInfo.startStr;

    // bloquer si jour férié
    if (holidays.some((h) => startStr.startsWith(h.date))) {
     
      alert("🚫 Jour férié !");
      return;
    }

    await fetchBaseData();

    const startDate = selectInfo.start;
    const endDate = selectInfo.end;

    if (!startDate || !endDate) return;

    // salles déjà prises sur ce créneau
    const occupiedRoomIds = events
      .filter((e) => {
        if (!e.start || !e.end) return false;
        const eStart = new Date(e.start as string);
        const eEnd = new Date(e.end as string);

        return (
          (startDate >= eStart && startDate < eEnd) ||
          (endDate > eStart && endDate <= eEnd) ||
          (startDate <= eStart && endDate >= eEnd)
        );
      })
      .map((e) => e.extendedProps?.salle?.id)
      .filter((id): id is string => Boolean(id));

    const availableRooms = rooms.filter((r) => !occupiedRoomIds.includes(r.id));

  setModalRooms(availableRooms.length ? availableRooms : rooms);

    setSelectedSlot({ start: selectInfo.startStr, end: selectInfo.endStr });
    setRows([{ courseId: "", teacherId: "", roomId: "" }]);
    setModalOpen(true);
  };

  const handleChangeRow = (index: number, field: keyof Row, value: string): void => {
    setRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: value };

      if (field === "courseId") {
        const foundCourse = courses.find((c) => c.id === value);
        row.teacherId = foundCourse?.professors?.[0]?.id ?? "";
      }

      updated[index] = row;
      return updated;
    });
  };

  const addRow = (): void => {
    setRows((prev) => [...prev, { courseId: "", teacherId: "", roomId: "" }]);
  };

  const removeRow = (index: number): void => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (): Promise<void> => {
    if (!token || !selectedSlot) return;

    const valid = rows.every((r) => r.courseId && r.teacherId && r.roomId);
    if (!valid) {
    
      alert("⚠️ Remplis toutes les lignes !");
      return;
    }

    const res = await fetch(`${import.meta.env.VITE_API_URL}/planning/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        sessions: rows.map((r) => ({
          start: selectedSlot.start,
          end: selectedSlot.end,
          courseId: r.courseId,
          professorId: r.teacherId,
          roomId: r.roomId,
        })),
      }),
    });

    if (!res.ok) {
    
      alert("❌ Erreur lors de l’enregistrement");
      return;
    }

    const created: ApiSession[] = await res.json();

    const newEvents: CalendarEvent[] = created.map((s) => ({
      id: s.id,
      title: `${s.course.name} — ${
        s.professor
          ? `${s.professor.firstName} ${s.professor.lastName}`
          : `${s.createdBy.firstName} ${s.createdBy.lastName}`
      }${s.salle ? " 📍 " + s.salle.name : ""}`,
      start: s.startTime,
      end: s.endTime,
      extendedProps: s,
      backgroundColor: "#2563eb",
      borderColor: "#1e3a8a",
      textColor: "#fff",
    }));

    setEvents((prev) => [...prev, ...newEvents]);
    setModalOpen(false);
  };

  // ---------- clic sur un événement (ouvrir edit) ----------

  const handleEventClick = async (info: EventClickArg): Promise<void> => {
    const raw = info.event.extendedProps as ApiSession | undefined;
    if (!raw) return;

    await fetchBaseData();
    setSelectedEvent(raw);
    setEditModalOpen(true);
  };

  // ---------- drag & drop d’un événement ----------

  const handleEventDrop = async (info: EventDropArg): Promise<void> => {
    if (!token) return;

    const start = info.event.start?.toISOString();
    const end = info.event.end?.toISOString();

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/planning/${info.event.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ startTime: start, endTime: end }),
      });

      if (!res.ok) {
        info.revert();
      }
    } catch {
      info.revert();
    }
  };

  // ---------- callbacks pour l’EditModal (on ne mute pas les props) ----------

  const handleChangeCourse = (courseId: string): void => {
    setSelectedEvent((prev) =>
      prev ? { ...prev, course: { ...prev.course, id: courseId } } : prev
    );
  };

  const handleChangeProfessor = (professorId: string): void => {
    setSelectedEvent((prev) =>
      prev
        ? {
            ...prev,
            professor: prev.professor
              ? { ...prev.professor, id: professorId }
              : { ...prev.createdBy, id: professorId },
          }
        : prev
    );
  };

  const handleChangeRoom = (roomId: string | null): void => {
    setSelectedEvent((prev) =>
      prev
        ? {
            ...prev,
            salle: roomId ? { id: roomId, name: prev.salle?.name ?? "" } : undefined,
          }
        : prev
    );
  };

  const handleEditSave = async (): Promise<void> => {
    if (!selectedEvent || !token) return;

    const res = await fetch(`${import.meta.env.VITE_API_URL}/planning/${selectedEvent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        courseId: selectedEvent.course.id,
        professorId: selectedEvent.professor?.id ?? selectedEvent.createdBy.id,
        roomId: selectedEvent.salle?.id ?? null,
      }),
    });

    if (!res.ok) {
    
      alert("Erreur mise à jour !");
      return;
    }

    const updated: ApiSession = await res.json();

    setEvents((prev) =>
      prev.map((e) =>
        e.id === updated.id
          ? {
              ...e,
              title: `${updated.course.name} — ${
                updated.professor
                  ? `${updated.professor.firstName} ${updated.professor.lastName}`
                  : `${updated.createdBy.firstName} ${updated.createdBy.lastName}`
              }${updated.salle ? " 📍 " + updated.salle.name : ""}`,
              start: updated.startTime,
              end: updated.endTime,
              extendedProps: updated,
            }
          : e
      )
    );

    setEditModalOpen(false);
  };

  const handleDelete = async (): Promise<void> => {
    if (!selectedEvent || !token) return;

    const res = await fetch(`${import.meta.env.VITE_API_URL}/planning/${selectedEvent.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
     
      alert("Erreur suppression !");
      return;
    }

    setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
    setEditModalOpen(false);
  };

  // ---------------------- RENDU ----------------------
console.log("🔥 EVENTS ENVOYÉS À FULLCALENDAR :", events);

  return (
    <div className="p-4 lg:p-8 min-h-screen bg-gray-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
            <CalendarDays className="w-6 h-6" />
          </div>
          <h2 className="text-xl lg:text-2xl font-semibold text-gray-800">Planning des cours</h2>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition text-sm lg:text-base w-full sm:w-auto"
        >
          🔄 Actualiser
        </button>
      </div>

      {!academicYearId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 m-0">
            ⚠️ Aucune année académique sélectionnée. Veuillez sélectionner une année en cours pour afficher le planning.
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

      <div className="bg-white rounded-2xl shadow-lg p-3 lg:p-6 border border-gray-200">
        
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={frLocale}
          height="auto"
          contentHeight="70vh"
          events={events}
          selectable={hasActiveYear}
          editable={hasActiveYear}
          allDaySlot={false}
          weekends={false}
          slotMinTime="08:00:00"
          slotMaxTime="19:00:00"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "timeGridWeek,dayGridMonth",
          }}
          buttonText={{
            today: "Aujourd'hui",
            week: "Semaine",
            month: "Mois",
          }}
          select={hasActiveYear ? handleSelect : undefined}
          eventClick={handleEventClick}
          eventDrop={hasActiveYear ? handleEventDrop : undefined}
        />
      </div>

      <AddModal
        isOpen={modalOpen}
        rows={rows}
        selectedSlot={selectedSlot}
        courses={courses}
        teachers={teachers}
        rooms={modalRooms}

        onClose={() => setModalOpen(false)}
        onChangeRow={handleChangeRow}
        onAddRow={addRow}
        onRemoveRow={removeRow}
        onSave={handleSave}
      />

      <EditModal
        isOpen={editModalOpen}
        event={selectedEvent}
        courses={courses}
        teachers={teachers}
        rooms={rooms}
        onClose={() => setEditModalOpen(false)}
        onChangeCourse={handleChangeCourse}
        onChangeProfessor={handleChangeProfessor}
        onChangeRoom={handleChangeRoom}
        onUpdate={handleEditSave}
        onDelete={handleDelete}
      />
    </div>
  );
}

// ---------------------- MODALES ----------------------

function AddModal({
  isOpen,
  rows,
  selectedSlot,
  courses,
  teachers,
  rooms,
  onClose,
  onChangeRow,
  onAddRow,
  onRemoveRow,
  onSave,
}: AddModalProps) {
  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} ariaHideApp={false} style={modalStyle}>
      <h2 className="text-lg font-semibold mb-3 flex justify-between items-center">
        Nouveau créneau (multi-cours)
        <button onClick={onClose}>
          <X size={22} />
        </button>
      </h2>

      {selectedSlot && (
        <p style={{ marginBottom: 10 }}>
          Créneau : {selectedSlot.start.slice(11, 16)} – {selectedSlot.end.slice(11, 16)}
        </p>
      )}

      {rows.map((row, index) => (
        <div key={index} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <select
            value={row.courseId}
            onChange={(e) => onChangeRow(index, "courseId", e.target.value)}
            style={selectStyle}
          >
            <option value="">Cours</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={row.teacherId}
            onChange={(e) => onChangeRow(index, "teacherId", e.target.value)}
            style={selectStyle}
          >
            <option value="">Professeur</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.firstName} {t.lastName}
              </option>
            ))}
          </select>

          <select
            value={row.roomId}
            onChange={(e) => onChangeRow(index, "roomId", e.target.value)}
            style={selectStyle}
          >
            <option value="">Salle</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>

          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => onRemoveRow(index)}
              style={{ color: "red", background: "none", border: "none" }}
            >
              ❌
            </button>
          )}
        </div>
      ))}

      <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
        <button type="button" onClick={onAddRow} style={addButtonStyle}>
          <PlusCircle size={16} /> Ajouter une ligne
        </button>
        <button type="button" onClick={onSave} style={saveButtonStyle}>
          💾 Enregistrer
        </button>
      </div>
    </Modal>
  );
}

function EditModal({
  isOpen,
  event,
  courses,
  teachers,
  rooms,
  onClose,
  onChangeCourse,
  onChangeProfessor,
  onChangeRoom,
  onUpdate,
  onDelete,
}: EditModalProps) {
  if (!event) return null;

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} ariaHideApp={false} style={modalStyle}>
      <h2 className="text-lg font-semibold mb-3 flex justify-between items-center">
        Modifier / supprimer
        <button onClick={onClose}>
          <X size={22} />
        </button>
      </h2>

      <div style={{ display: "grid", gap: 10 }}>
        <select
          value={event.course.id}
          onChange={(e) => onChangeCourse(e.target.value)}
          style={selectStyle}
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={event.professor?.id ?? event.createdBy.id}
          onChange={(e) => onChangeProfessor(e.target.value)}
          style={selectStyle}
        >
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.firstName} {t.lastName}
            </option>
          ))}
        </select>

        <select
          value={event.salle?.id ?? ""}
          onChange={(e) => onChangeRoom(e.target.value || null)}
          style={selectStyle}
        >
          <option value="">Salle</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 15 }}>
          <button type="button" onClick={onDelete} style={deleteButtonStyle}>
            <Trash2 size={16} /> Supprimer
          </button>
          <button type="button" onClick={onUpdate} style={saveButtonStyle}>
            <Pencil size={16} /> Sauvegarder
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------- STYLES ----------------------

const modalStyle = {
  overlay: { backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" },
  content: {
    borderRadius: "16px",
    maxWidth: "600px",
    margin: "auto",
    padding: "24px",
    background: "white",
    border: "1px solid #e2e8f0",
    boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
  },
};

const selectStyle: CSSProperties = {
  flex: 1,
  padding: "6px 8px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
};

const addButtonStyle: CSSProperties = {
  background: "#e0f2fe",
  color: "#0369a1",
  border: "none",
  borderRadius: 6,
  padding: "6px 10px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 4,
};

const saveButtonStyle: CSSProperties = {
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: 6,
  padding: "6px 14px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 4,
};

const deleteButtonStyle: CSSProperties = {
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: 6,
  padding: "6px 14px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 4,
};
