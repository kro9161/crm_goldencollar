import { useState, useEffect, useCallback } from "react";
import { useArchivedYear } from "../../hooks/useArchivedYear";

type SessionWithAttendance = {
  date: string;
  startTime: string;
  endTime: string;
  courseName: string;
  professorName: string;
  subGroupName?: string;
  totalStudents: number;
  presents: number;
  absents: number;
  retards: number;
  justifies: number;
};

type SubGroup = {
  id: string;
  code: string;
  name: string;
};

export default function Absences() {
  const { academicYearId } = useArchivedYear(); 
  const [sessions, setSessions] = useState<SessionWithAttendance[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionWithAttendance[]>([]);
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [selectedSubGroup, setSelectedSubGroup] = useState<string>("all");
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [detailedAbsences, setDetailedAbsences] = useState<any[]>([]);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  // Charger les sous-groupes (classes)
  const fetchSubGroups = useCallback(async () => {
    if (!academicYearId) {
      setSubGroups([]);
      return;
    }

    try {
      const yearParam = `?academicYearId=${academicYearId}`;
      const res = await fetch(`http://localhost:4000/subgroups${yearParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur de chargement");
      const data = await res.json();
      setSubGroups(data);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token, academicYearId]);

  // Charger toutes les sessions avec résumé de présence
  const fetchSessions = useCallback(async () => {
    try {
      const yearParam = academicYearId ? `?academicYearId=${academicYearId}` : "";
      const res = await fetch(`http://localhost:4000/absences/sessions${yearParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur de chargement");
      const data = await res.json();
      setSessions(data);
      setFilteredSessions(data);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token, academicYearId]);

  useEffect(() => {
    fetchSubGroups();
    fetchSessions();
  }, [fetchSubGroups, fetchSessions]);

  // Filtrer par sous-groupe
  useEffect(() => {
    if (selectedSubGroup === "all") {
      setFilteredSessions(sessions);
    } else {
      setFilteredSessions(
        sessions.filter(s => s.subGroupName === selectedSubGroup)
      );
    }
  }, [selectedSubGroup, sessions]);

  // Grouper par date
  const groupedByDate = filteredSessions.reduce((acc, session) => {
    const date = new Date(session.date).toLocaleDateString("fr-FR");
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {} as Record<string, SessionWithAttendance[]>);

  // Charger les détails d'une session
  const handleViewDetails = async (sessionId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/absences/session/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur de chargement");
      setDetailedAbsences(await res.json());
      setSelectedSession(sessionId);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">🕒 Gestion des absences</h2>
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {!selectedSession ? (
        // Vue liste des sessions
        <>
          {/* Filtre par classe */}
          <div className="mb-6 flex items-center gap-4">
            <label className="font-semibold">Filtrer par classe :</label>
            <select
              value={selectedSubGroup}
              onChange={(e) => setSelectedSubGroup(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">📚 Toutes les classes</option>
              {subGroups.map((sg) => (
                <option key={sg.id} value={sg.code}>
                  {sg.code} - {sg.name}
                </option>
              ))}
            </select>
            <span className="text-gray-600">
              ({filteredSessions.length} session{filteredSessions.length > 1 ? "s" : ""})
            </span>
          </div>

          {Object.keys(groupedByDate).length === 0 ? (
            <p>Aucune session avec appel enregistré.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByDate)
                .sort(([dateA], [dateB]) => {
                  // Tri décroissant (plus récent en premier)
                  const dA = new Date(dateA.split("/").reverse().join("-"));
                  const dB = new Date(dateB.split("/").reverse().join("-"));
                  return dB.getTime() - dA.getTime();
                })
                .map(([date, daySessions]) => (
                  <div key={date} className="bg-white rounded-lg shadow-md overflow-hidden">
                    {/* En-tête de la date */}
                    <div className="bg-blue-600 text-white px-6 py-3 font-semibold text-lg">
                      📅 {date} ({daySessions.length} cours)
                    </div>

                    {/* Tableau des cours du jour */}
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left">Horaire</th>
                          <th className="px-4 py-3 text-left">Cours</th>
                          <th className="px-4 py-3 text-left">Classe</th>
                          <th className="px-4 py-3 text-left">Professeur</th>
                          <th className="px-4 py-3 text-center">✅ Présents</th>
                          <th className="px-4 py-3 text-center">❌ Absents</th>
                          <th className="px-4 py-3 text-center">⏰ Retards</th>
                          <th className="px-4 py-3 text-center">📝 Justifiés</th>
                          <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {daySessions
                          .sort((a, b) => 
                            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                          )
                          .map((s) => (
                            <tr key={s.startTime + s.courseName} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3 font-mono text-sm">
                                {new Date(s.startTime).toLocaleTimeString("fr-FR", { 
                                  hour: "2-digit", 
                                  minute: "2-digit" 
                                })} - 
                                {new Date(s.endTime).toLocaleTimeString("fr-FR", { 
                                  hour: "2-digit", 
                                  minute: "2-digit" 
                                })}
                              </td>
                              <td className="px-4 py-3 font-semibold">{s.courseName}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                                  {s.subGroupName || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">{s.professorName}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                  {s.presents}/{s.totalStudents}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                                  {s.absents}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                                  {s.retards}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                  {s.justifies}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleViewDetails(s.startTime + s.courseName)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                                >
                                  📋 Détails
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ))}
            </div>
          )}
        </>
      ) : (
        // Vue détails d'une session
        <div>
          <button
            onClick={() => setSelectedSession(null)}
            className="mb-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ← Retour à la liste
          </button>
          <table className="w-full border-collapse bg-white shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-200 text-gray-800">
              <tr>
                <th className="px-4 py-3 text-left">Élève</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-center">Justifiée</th>
                <th className="px-4 py-3 text-left">Motif</th>
              </tr>
            </thead>
            <tbody>
              {detailedAbsences.map((a) => (
                <tr key={a.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{a.studentName}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      a.status === "present" ? "bg-green-100 text-green-800" :
                      a.status === "absent" ? "bg-red-100 text-red-800" :
                      a.status === "retard" ? "bg-orange-100 text-orange-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {a.justified ? "✅" : "❌"}
                  </td>
                  <td className="px-4 py-3">{a.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
