import { useEffect, useMemo, useState, useCallback } from "react";
import { useArchivedYear } from "../../hooks/useArchivedYear";

type Group = { id: string; name: string; label?: string | null; academicYear?: { id: string; name: string; session: string } };
type SubGroup = { id: string; code: string; label?: string | null; subGroupFilieres?: { filiere: Filiere }[] };
type Filiere = { id: string; code: string; label?: string | null; levelId?: string; level?: Level };
type Level = { id: string; code: string; label?: string | null };

export default function GroupsPage() {
  const { isReadOnly, academicYearId, hasActiveYear } = useArchivedYear();
  const [groups, setGroups] = useState<Group[]>([]);
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedSubGroupId, setSelectedSubGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupLabel, setNewGroupLabel] = useState("");
  type Year = { id: string; name: string; session: string; isCurrent?: boolean };
  const [years, setYears] = useState<Year[]>([]);
  const [targetYearId, setTargetYearId] = useState<string>("");
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubLabel, setNewSubLabel] = useState("");
  const [newFiliereCode, setNewFiliereCode] = useState("");
  const [newFiliereLabel, setNewFiliereLabel] = useState("");
  const [newFiliereLevel, setNewFiliereLevel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);

  const formatSession = (session?: string) => {
    const s = (session || "").toLowerCase();
    if (s === "octobre") return "Oct";
    if (s === "fevrier") return "Fév";
    return session || "";
  };

  const token = useMemo(() => localStorage.getItem("token") || "", []);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    if (!token) {
      setTokenError("Erreur d'authentification : veuillez vous reconnecter.");
      setGroups([]);
      return;
    }
    if (!academicYearId) {
      setError("Aucune année académique sélectionnée. Veuillez sélectionner une année.");
      setGroups([]);
      return;
    }
    setLoading(true);
    setError(null);
    setTokenError(null);
    try {
      const url = `http://localhost:4000/groups?academicYearId=${academicYearId}`;
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setTokenError("Erreur d'authentification : veuillez vous reconnecter.");
        setGroups([]);
        return;
      }
      const data = (await res.json()) as Array<{ id: string; name: string; label?: string | null; academicYear?: { id: string; name: string; session: string } }>;
      setGroups(data.map((g) => ({ id: g.id, name: g.name, label: g.label, academicYear: g.academicYear })));
    } catch {
      setError("Erreur chargement groupes");
    } finally {
      setLoading(false);
    }
  }, [token, academicYearId]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Charger les années pour la combo de création
  useEffect(() => {
    const loadYears = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/academic-years`, {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        const data: Year[] = await res.json();
        const active: Year[] = data.filter((y) => !!y.id && !!y.session);
        setYears(active);
        // Par défaut, cibler l'année actuelle ou la première
        setTargetYearId(academicYearId || active.find((y) => y.isCurrent)?.id || active[0]?.id || "");
      } catch {
        // ignore
      }
    };
    loadYears();
  }, [token, academicYearId]);

  // Charger les niveaux globaux
  useEffect(() => {
    const loadLevels = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/levels`, {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load levels");
        const data: Level[] = await res.json();
        console.log("✅ Niveaux chargés:", data);
        setLevels(data);
      } catch (err) {
        console.error("❌ Erreur chargement niveaux:", err);
      }
    };
    loadLevels();
  }, [token]);



  const createGroup = async () => {
    const yearForCreate = targetYearId || academicYearId;
    if (!newGroupName || !yearForCreate) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newGroupName, label: newGroupLabel || null, academicYearId: yearForCreate }),
      });
      if (!res.ok) throw new Error("failed");
      setNewGroupName("");
      setNewGroupLabel("");
      await loadGroups();
    } catch {
      setError("Erreur création groupe");
    }
  };


  // UI pour choisir l'année cible de création
  const YearSelector = () => (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600">Créer dans:</label>
      <select
        className="border rounded px-2 py-1 text-sm"
        value={targetYearId}
        onChange={(e) => setTargetYearId(e.target.value)}
      >
        <option value="" disabled>Choisir une année</option>
        {years.map((y) => (
          <option key={y.id} value={y.id}>
            {y.name} ({formatSession(y.session)})
          </option>
        ))}
      </select>
    </div>
  );

  const loadSubGroups = useCallback(async (groupId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/subgroups/by-group/${groupId}?academicYearId=${academicYearId}`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as Array<{ id: string; code: string; label?: string | null; level?: string | null }>;
      setSubGroups(data.map((sg) => ({ id: sg.id, code: sg.code, label: sg.label, level: sg.level })));
    } catch {
      setError("Erreur chargement sous-groupes");
    }
  }, [academicYearId, token]);

  useEffect(() => {
    if (selectedGroupId) loadSubGroups(selectedGroupId);
  }, [selectedGroupId, loadSubGroups]);


  // Charger uniquement les filières liées à ce sous-groupe
  const loadFilieres = useCallback(async () => {
    if (!selectedSubGroupId) {
      setFilieres([]);
      return;
    }
    try {
      const res = await fetch(`http://localhost:4000/subgroups/${selectedSubGroupId}`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur chargement sous-groupe");
      const sg = await res.json();
      // On attend que le backend renvoie subGroupFilieres: [{ filiere }]
      setFilieres(sg.subGroupFilieres ? sg.subGroupFilieres.map((sf: any) => sf.filiere) : []);
    } catch {
      setError("Erreur chargement filières");
    }
  }, [selectedSubGroupId, token]);

  useEffect(() => {
    loadFilieres();
  }, [selectedSubGroupId, loadFilieres]);

  const createFiliere = async () => {
    if (!selectedSubGroupId || !newFiliereCode) return;
    try {
      const res = await fetch(`http://localhost:4000/subgroups/${selectedSubGroupId}/filieres`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          code: newFiliereCode,
          label: newFiliereLabel || null,
          levelId: newFiliereLevel || null,
          academicYearId
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        if (err?.error && err.error.includes("existe déjà")) {
          setError("Ce code de filière existe déjà pour cette année.");
        } else if (err?.error) {
          setError("Erreur création filière : " + err.error);
        } else {
          setError("Erreur création filière");
        }
        return;
      }
      setNewFiliereCode("");
      setNewFiliereLabel("");
      setNewFiliereLevel("");
      await loadFilieres();
      await loadSubGroups(selectedGroupId!);
    } catch {
      setError("Erreur création filière");
    }
  };

  const deleteFiliere = async (filiereId: string) => {
    if (!selectedSubGroupId) return;
    try {
      const res = await fetch(`http://localhost:4000/subgroups/${selectedSubGroupId}/filieres/${filiereId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("failed");
      await loadFilieres();
    } catch {
      setError("Erreur suppression filière");
    }
  };

  const createSubGroup = async () => {
    if (!selectedGroupId || !newSubCode) return;
    try {
      const res = await fetch(`http://localhost:4000/subgroups?academicYearId=${academicYearId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: newSubCode, label: newSubLabel || null, groupId: selectedGroupId }),
      });
      if (!res.ok) throw new Error("failed");
      setNewSubCode("");
      setNewSubLabel("");
      await loadSubGroups(selectedGroupId);
    } catch {
      setError("Erreur création sous-groupe");
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/groups/${groupId}?academicYearId=${academicYearId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("failed");
      if (selectedGroupId === groupId) setSelectedGroupId(null);
      await loadGroups();
    } catch {
      setError("Erreur suppression groupe");
    }
  };

  const deleteSubGroup = async (subGroupId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/subgroups/${subGroupId}?academicYearId=${academicYearId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("failed");
      if (selectedGroupId) await loadSubGroups(selectedGroupId);
    } catch {
      setError("Erreur suppression sous-groupe");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Affichage des erreurs toujours en haut, pleine largeur, très visible */}
      {(tokenError || error) && (
        <div className="fixed top-0 left-0 w-full z-50">
          <div className={`text-center py-3 px-4 font-semibold text-base ${tokenError ? 'bg-red-600 text-white' : 'bg-yellow-500 text-white'}`}>
            {tokenError || error}
          </div>
        </div>
      )}

      <div className="pt-16"> {/* Ajoute un padding-top pour ne pas masquer le contenu */}
        <h2 className="text-2xl font-bold">Groupes</h2>

        {!academicYearId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 m-0">
              ⚠️ Aucune année académique sélectionnée. Veuillez sélectionner une année en cours.
            </p>
          </div>
        )}

        {isReadOnly && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 m-0">
              📂 Mode consultation - Année archivée
            </p>
          </div>
        )}

        {loading && <div className="text-gray-600">Chargement…</div>}

        {hasActiveYear && (
          <div className="rounded-lg border border-gray-200 p-6 space-y-4 bg-white shadow-sm">
            <h3 className="font-semibold text-lg">Créer un groupe</h3>
            {/* ...existing code... */}
          </div>
        )}
        {/* ...existing code... */}
      </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Nom</label>
            <input 
              className="border border-gray-300 px-3 py-2 rounded-md w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" 
              value={newGroupName} 
              onChange={(e) => setNewGroupName(e.target.value)} 
              placeholder="Ex: Master IA"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Label (optionnel)</label>
            <input 
              className="border border-gray-300 px-3 py-2 rounded-md w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" 
              value={newGroupLabel} 
              onChange={(e) => setNewGroupLabel(e.target.value)} 
              placeholder="Ex: Intelligence Artificielle"
            />
          </div>
          <YearSelector />
          <div className="flex md:justify-end">
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md w-full md:w-auto font-medium transition disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={createGroup} 
              disabled={(!targetYearId && !academicYearId) || !newGroupName}
            >
              Créer
            </button>
          </div>
        </div>
        {(!targetYearId && !academicYearId) && <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">⚠️ Sélectionne d'abord une année dans le menu en haut ou via la combo "Créer dans".</p>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-gray-200 p-6 bg-white shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Liste des groupes <span className="text-gray-500">({groups.length})</span></h3>
          <ul className="space-y-2">
            {groups.map((g) => (
              <li key={g.id} className={`flex items-center justify-between border rounded-md px-4 py-3 transition ${selectedGroupId === g.id ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50 border-gray-200"}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{g.name}</span>
                    {g.academicYear && (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        (g.academicYear.session || "").toLowerCase() === "octobre"
                          ? "bg-orange-100 text-orange-700 border border-orange-300" 
                          : "bg-blue-100 text-blue-700 border border-blue-300"
                      }`}>
                        {formatSession(g.academicYear.session)}
                      </span>
                    )}
                  </div>
                  {g.label && <div className="text-sm text-gray-600 mt-1"><span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-50 px-2.5 py-0.5 text-xs font-medium">{g.label}</span></div>}
                </div>
                <div className="flex items-center gap-2">
                  <button className="text-blue-600 hover:text-blue-800 font-medium text-sm px-2 py-1 rounded hover:bg-blue-50 transition" onClick={() => { setSelectedGroupId(g.id); setSelectedSubGroupId(null); setFilieres([]); }}>Sous-groupes</button>
                  {!isReadOnly && (
                    <button className="text-red-600 hover:text-red-800 font-medium text-sm px-2 py-1 rounded hover:bg-red-50 transition" onClick={() => deleteGroup(g.id)}>Supprimer</button>
                  )}
                </div>
              </li>
            ))}
            {groups.length === 0 && <li className="text-sm text-gray-500 italic py-4 text-center">Aucun groupe.</li>}
          </ul>
        </div>

        <div className="rounded-lg border border-gray-200 p-6 bg-white shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Sous-groupes</h3>
          {selectedGroupId ? (
            <>
              {!isReadOnly && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Code</label>
                    <input className="border border-gray-300 px-3 py-2 rounded-md w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm" value={newSubCode} onChange={(e) => setNewSubCode(e.target.value)} placeholder="B3-DEV-A" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Label</label>
                    <input className="border border-gray-300 px-3 py-2 rounded-md w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm" value={newSubLabel} onChange={(e) => setNewSubLabel(e.target.value)} placeholder="Développement" />
                  </div>
                  <div className="flex md:justify-end">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md w-full md:w-auto font-medium transition text-sm disabled:opacity-50" onClick={createSubGroup} disabled={!newSubCode}>Créer</button>
                  </div>
                </div>
              </div>
              )}
              <div className="space-y-2">
                {subGroups.map((sg) => (
                  <div key={sg.id} className="border border-gray-200 rounded-md px-4 py-3 hover:bg-gray-50 transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{sg.code}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                          {sg.label && <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-50 px-2.5 py-0.5 text-xs font-medium">{sg.label}</span>}
                          {sg.subGroupFilieres && sg.subGroupFilieres.length > 0 && sg.subGroupFilieres.map((sf) => (
                            <span key={sf.filiere.id} className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-xs font-medium">{sf.filiere.code}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="text-blue-600 hover:text-blue-800 font-medium text-sm px-2 py-1 rounded hover:bg-blue-50 transition" onClick={() => { setSelectedSubGroupId(sg.id); loadFilieres(); }}>Filières</button>
                        {!isReadOnly && (
                          <button className="text-red-600 hover:text-red-800 font-medium text-sm px-2 py-1 rounded hover:bg-red-50 transition" onClick={() => deleteSubGroup(sg.id)}>Supprimer</button>
                        )}
                      </div>
                    </div>
                    {selectedSubGroupId === sg.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                        <h4 className="text-sm font-semibold text-gray-700">Gérer les filières</h4>
                        {!isReadOnly && (
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">Code filière</label>
                            <input className="border border-gray-300 px-3 py-2 rounded-md w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm" value={newFiliereCode} onChange={(e) => setNewFiliereCode(e.target.value)} placeholder="INFO" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">Label (optionnel)</label>
                            <input className="border border-gray-300 px-3 py-2 rounded-md w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm" value={newFiliereLabel} onChange={(e) => setNewFiliereLabel(e.target.value)} placeholder="Informatique" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">Niveau</label>
                            <select className="border border-gray-300 px-3 py-2 rounded-md w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm" value={newFiliereLevel} onChange={(e) => setNewFiliereLevel(e.target.value)}>
                              <option value="">— Aucun —</option>
                              {levels.map((l) => (
                                <option key={l.id} value={l.id}>{l.code} {l.label ? `(${l.label})` : ""}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex md:justify-end">
                            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md w-full md:w-auto font-medium transition text-sm disabled:opacity-50" onClick={createFiliere} disabled={!newFiliereCode}>Ajouter</button>
                          </div>
                        </div>
                        )}
                        <ul className="space-y-2">
                          {filieres.map((f) => (
                            <li key={f.id} className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 bg-white hover:bg-gray-50 transition">
                              <div>
                                <div className="font-medium text-sm text-gray-900">{f.code}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  {f.label && <span className="text-xs text-gray-600">{f.label}</span>}
                                  {f.level && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{f.level.code}</span>}
                                </div>
                              </div>
                              {!isReadOnly && (
                                <button className="text-red-600 hover:text-red-800 font-medium text-xs px-2 py-1 rounded hover:bg-red-50 transition" onClick={() => deleteFiliere(f.id)}>Supprimer</button>
                              )}
                            </li>
                          ))}
                          {filieres.length === 0 && <li className="text-xs text-gray-500 italic py-2 text-center">Aucune filière pour ce sous-groupe.</li>}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
                {subGroups.length === 0 && <p className="text-sm text-gray-500 italic py-4 text-center">Aucun sous-groupe pour ce groupe.</p>}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 italic py-4 text-center">Sélectionne un groupe pour voir/ajouter des sous-groupes.</p>
          )}
        </div>
      </div>
    </div>
  );
}
