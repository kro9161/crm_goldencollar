// Type pour une absence (issue de l'API /absences)
type Absence = {
  id: string;
  status: "present" | "absent" | "retard" | "justifie";
  justified?: boolean;
  reason?: string | null;
  student: { firstName: string; lastName: string; email: string };
  session?: {
    course?: { name?: string };
    date?: string;
  };
};
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";


// Types for Filiere and SubGroup (move above first use)
type Filiere = {
  id: string;
  code: string;
  label?: string;
};

type SubGroupFiliere = {
  filiere: Filiere;
};

type SubGroup = {
  id: string;
  code: string;
  group: { name: string };
  session?: string;
  subGroupFilieres?: SubGroupFiliere[];
};

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
  scholarship: boolean;
  handicap: boolean;
  subGroupId: string;
  filiereIds: string[];
};

function Eleves() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EleveForm>({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "", // Date de naissance
    phone: "",
    address: "",
    gender: "M",
    nationality: "",
    status: "actif",
    registrationDate: "",
    studentNumber: "",
    photoUrl: "",
    scholarship: false,
    handicap: false,
    subGroupId: "",
    filiereIds: [],
  });
  //
  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
    // Charger la liste des sous-groupes au chargement de la page
    const fetchSubGroups = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:4000/subgroups", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      setSubGroups([]);
      return;
    }

    const data = await res.json();

    if (Array.isArray(data)) {
      setSubGroups(data);
    } else if (Array.isArray(data?.data)) {
      setSubGroups(data.data);
    } else if (Array.isArray(data?.subGroups)) {
      setSubGroups(data.subGroups);
    } else {
      console.error("Format inattendu /subgroups :", data);
      setSubGroups([]);
    }
  } catch (err) {
    console.error("Erreur fetchSubGroups", err);
    setSubGroups([]);
  }
};

  // const [filieres] = useState<Filiere[]>([]); // plus utilisé, filtrage dynamique
  const [filteredFilieres, setFilteredFilieres] = useState<Filiere[]>([]);
    // Met à jour les filières affichées selon le sous-groupe sélectionné
    useEffect(() => {
      if (!form.subGroupId) {
        setFilteredFilieres([]);
        return;
      }
      const sg = subGroups.find(sg => sg.id === form.subGroupId);
      // On suppose que chaque sous-groupe a une propriété filieres ou subGroupFilieres
      // qui contient la liste des filières associées (à adapter selon la structure réelle)
      if (sg && Array.isArray(sg.subGroupFilieres)) {
        setFilteredFilieres(sg.subGroupFilieres.map((sgf) => sgf.filiere));
      } else {
        setFilteredFilieres([]);
      }
    }, [form.subGroupId, subGroups]);
  const [eleves, setEleves] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth?: string;
    phone?: string;
    address?: string;
    gender?: string;
    nationality?: string;
    status?: string;
    registrationDate?: string;
    studentNumber?: string;
    photoUrl?: string;
    legalGuardianName?: string;
    legalGuardianPhone?: string;
    scholarship?: boolean;
    handicap?: boolean;
    subGroup?: SubGroup;
    filieres?: Filiere[];
  }[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ficheEleve, setFicheEleve] = useState<typeof eleves[0] | null>(null);
  const [absencesEleve, setAbsencesEleve] = useState<Absence[] | null>(null);

  // Charge les absences de l'élève sélectionné (fiche)
  useEffect(() => {
    const fetchAbsences = async () => {
      if (!ficheEleve) { setAbsencesEleve(null); return; }
      const token = localStorage.getItem("token");
      const academicYearId = localStorage.getItem("academicYearId");
      let url = `http://localhost:4000/absences`;
      if (academicYearId) url += `?academicYearId=${encodeURIComponent(academicYearId)}`;
      try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) { setAbsencesEleve([]); return; }
        const data = await res.json();
        // Filtrer sur l'élève courant
        setAbsencesEleve((data as Absence[]).filter((a) => a.student && a.student.email === ficheEleve.email));
      } catch { setAbsencesEleve([]); }
    };
    fetchAbsences();
  }, [ficheEleve]);
  const [loading, setLoading] = useState(false);

  // Charger la liste des élèves au chargement de la page
  // Fonction pour charger les élèves (utilisable partout)
 const fetchEleves = async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:4000/eleves", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      setEleves([]);
      return;
    }

    const data = await res.json();

    if (Array.isArray(data)) {
      setEleves(data);
    } else if (Array.isArray(data?.data)) {
      setEleves(data.data);
    } else if (Array.isArray(data?.eleves)) {
      setEleves(data.eleves);
    } else {
      console.error("Format inattendu /eleves :", data);
      setEleves([]);
    }
  } catch (err) {
    console.error("Erreur fetchEleves", err);
    setEleves([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchEleves();
    fetchSubGroups();
  }, []);
// --- Wizard multi-step form pour création/édition élève ---
  // Handler pour ouvrir la modale de création
  const handleCreate = () => {
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
      
     
      scholarship: false,
      handicap: false,
      subGroupId: "",
      filiereIds: [],
    });
    setEditingId(null);
    setShowForm(true);
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestion des élèves</h1>
        <Button onClick={handleCreate} className="bg-blue-600 text-white">Créer un élève</Button>
      </div>
      <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prénom</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sous-groupe</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-2 text-center text-gray-400">Chargement...</td></tr>
            ) : eleves.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-2 text-center text-gray-400 italic">Aucun élève pour le moment.</td></tr>
            ) : (
            eleves.map((el) => (

                <tr key={el.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{el.firstName}</td>
                  <td className="px-4 py-2">{el.lastName}</td>
                  <td className="px-4 py-2">{el.email}</td>
                  <td className="px-4 py-2">{el.status}</td>
                  <td className="px-4 py-2">{el.subGroup?.code || "-"}</td>
                  <td className="px-4 py-2">{el.phone}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setFicheEleve(el)}>
                        Fiche
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditingId(el.id);
                        setForm({
                          firstName: el.firstName || "",
                          lastName: el.lastName || "",
                          email: el.email || "",
                          dateOfBirth: el.dateOfBirth || "",
                          phone: el.phone || "",
                          address: el.address || "",
                          gender: (el.gender === "M" || el.gender === "F" || el.gender === "Autre") ? el.gender : "M",
                          nationality: el.nationality || "",
                          status: (el.status === "actif" || el.status === "inactif" || el.status === "archivé") ? el.status : "actif",
                          registrationDate: el.registrationDate || "",
                          studentNumber: el.studentNumber || "",
                          photoUrl: el.photoUrl || "",
                        
                          scholarship: el.scholarship || false,
                          handicap: el.handicap || false,
                          subGroupId: el.subGroup?.id || "",
                          filiereIds: el.filieres ? el.filieres.map(f => f.id) : [],
                        });
                        setShowForm(true);
                      }}>
                        Éditer
                      </Button>
                    </div>
                  </td>
                      {/* FICHE ÉLÈVE (READ-ONLY MODAL) - MODERN CARD STYLE */}
                      {ficheEleve && (
                        <div
                          style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,.5)",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            zIndex: 100,
                          }}
                        >
                          <div
                            style={{
                              background: "#fff",
                              borderRadius: 16,
                              width: 480,
                              maxWidth: "95vw",
                              boxShadow: "0 2px 16px rgba(0,0,0,0.15)",
                              padding: 0,
                              overflow: "hidden",
                            }}
                          >
                            {/* Header with avatar, name, email, close button */}
                            <div style={{ display: "flex", alignItems: "center", padding: 28, borderBottom: "1px solid #eee", position: "relative" }}>
                              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#f3f3f3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, marginRight: 24, overflow: "hidden" }}>
                                {ficheEleve.photoUrl ? (
                                  <img src={ficheEleve.photoUrl} alt="avatar élève" style={{ width: 80, height: 80, objectFit: "cover" }} />
                                ) : (
                                  <span role="img" aria-label="élève">🧑‍🎓</span>
                                )}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 2 }}>{ficheEleve.firstName} {ficheEleve.lastName}</div>
                                <div style={{ color: "#666", fontSize: 15 }}>{ficheEleve.email}</div>
                              </div>
                              <button onClick={() => setFicheEleve(null)} style={{ position: "absolute", right: 24, top: 24, background: "#f3f3f3", color: "#222", border: 0, borderRadius: 6, padding: "6px 16px", fontWeight: 500, fontSize: 15, cursor: "pointer" }}>Fermer</button>
                            </div>
                            {/* Info grid */}
                            <div style={{ padding: 24, paddingTop: 18 }}>
                              <div style={{ display: "flex", gap: 24, marginBottom: 18 }}>
                                <div style={{ flex: 1 }}><b>Téléphone :</b> {ficheEleve.phone || <span style={{ color: '#888' }}>-</span>}</div>
                                <div style={{ flex: 1 }}><b>Adresse :</b> {ficheEleve.address || <span style={{ color: '#888' }}>-</span>}</div>
                              </div>
                              <div style={{ display: "flex", gap: 24, marginBottom: 18 }}>
                                <div style={{ flex: 1 }}><b>Date de naissance :</b> {ficheEleve.dateOfBirth || <span style={{ color: '#888' }}>-</span>}</div>
                                <div style={{ flex: 1 }}><b>Nationalité :</b> {ficheEleve.nationality || <span style={{ color: '#888' }}>-</span>}</div>
                              </div>
                              <div style={{ display: "flex", gap: 24, marginBottom: 18 }}>
                                <div style={{ flex: 1 }}><b>Statut :</b> {ficheEleve.status || <span style={{ color: '#888' }}>-</span>}</div>
                                <div style={{ flex: 1 }}><b>Numéro étudiant :</b> {ficheEleve.studentNumber || <span style={{ color: '#888' }}>-</span>}</div>
                              </div>
                              <div style={{ display: "flex", gap: 24, marginBottom: 18 }}>
                                <div style={{ flex: 1 }}><b>Date inscription :</b> {ficheEleve.registrationDate || <span style={{ color: '#888' }}>-</span>}</div>
                                <div style={{ flex: 1 }}><b>Boursier :</b> {ficheEleve.scholarship ? "Oui" : "Non"}</div>
                                <div style={{ flex: 1 }}><b>Handicap :</b> {ficheEleve.handicap ? "Oui" : "Non"}</div>
                              </div>
                              <div style={{ margin: "18px 0 0 0", borderTop: "1px solid #eee", paddingTop: 18 }}>
                                <div style={{ fontWeight: 600, marginBottom: 6 }}>Groupes/Sous-groupes</div>
                                <div style={{ color: '#666', fontSize: 15 }}>
                                  {ficheEleve.subGroup ? `${ficheEleve.subGroup.group.name} — ${ficheEleve.subGroup.code}` : <span style={{ color: '#888' }}>Aucun groupe assigné</span>}
                                </div>
                              </div>
                              <div style={{ margin: "18px 0 0 0", borderTop: "1px solid #eee", paddingTop: 18 }}>
                                <div style={{ fontWeight: 600, marginBottom: 6 }}>Filières</div>
                                <div style={{ color: '#666', fontSize: 15 }}>
                                  {ficheEleve.filieres && ficheEleve.filieres.length > 0 ? ficheEleve.filieres.map(f => f.code).join(", ") : <span style={{ color: '#888' }}>Aucune filière assignée</span>}
                                </div>
                              </div>
                              {/* Absences section (dynamique) */}
                              <div style={{ margin: "18px 0 0 0", borderTop: "1px solid #eee", paddingTop: 18 }}>
                                <div style={{ fontWeight: 600, marginBottom: 6 }}>Absences</div>
                                <div style={{ color: '#666', fontSize: 15, minHeight: 24 }}>
                                  {absencesEleve === null ? (
                                    <span style={{ color: '#888' }}>Chargement...</span>
                                  ) : absencesEleve.length === 0 ? (
                                    <span style={{ color: '#888' }}>Aucune absence enregistrée</span>
                                  ) : (
                                    <ul style={{ paddingLeft: 0, margin: 0, listStyle: 'none' }}>
                                      {absencesEleve.map((a, i) => (
                                        <li key={i} style={{ marginBottom: 4 }}>
                                          <b>{a.session?.course?.name || "Cours inconnu"}</b>
                                          {a.session?.date && (
                                            <> — <span style={{ color: '#555' }}>{new Date(a.session.date).toLocaleDateString()}</span></>
                                          )}
                                          {" : "}
                                          <span style={{ color: a.status === "absent" ? "#dc2626" : a.status === "retard" ? "#f59e42" : a.status === "justifie" ? "#2563eb" : "#16a34a" }}>
                                            {a.status === "absent" ? "Absent" : a.status === "retard" ? "Retard" : a.status === "justifie" ? "Justifié" : "Présent"}
                                          </span>
                                          {a.justified && <span style={{ color: '#2563eb', marginLeft: 6 }}>(Justifié)</span>}
                                          {a.reason && <span style={{ color: '#888', marginLeft: 6 }}>({a.reason})</span>}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 50,
          }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const token = localStorage.getItem("token");
              const method = editingId ? "PATCH" : "POST";
              // Ajout de l'année académique courante à la query si présente
              const academicYearId = localStorage.getItem("academicYearId");
              let url = editingId ? `http://localhost:4000/eleves/${editingId}` : "http://localhost:4000/eleves";
              if (editingId && academicYearId) {
                url += `?academicYearId=${encodeURIComponent(academicYearId)}`;
              }
              // Validation registrationDate (doit être vide ou au format YYYY-MM-DD)
              const safeForm = {
                ...form,
                registrationDate:
                  form.registrationDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.registrationDate)
                    ? ""
                    : form.registrationDate,
              };
              const res = await fetch(url, {
                method,
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(safeForm)
              });
              if (res.ok) {
                setShowForm(false);
                setEditingId(null);
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
                  scholarship: false,
                  handicap: false,
                  subGroupId: "",
                  filiereIds: [],
                });
                await fetchEleves();
              } else {
                alert("Erreur lors de l'enregistrement de l'élève");
              }
            }}
            style={{
              background: "#fff",
              padding: 32,
              borderRadius: 10,
              width: 650,
              maxWidth: "95vw",
              boxShadow: "0 2px 16px rgba(0,0,0,0.15)",
            }}
          >
            <h2 style={{ marginBottom: 20 }}>{editingId ? "Modifier un élève" : "Créer un élève"}</h2>
            <div style={{ display: "flex", gap: 32 }}>
              {/* Avatar/photo section */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 140 }}>
                <div style={{ width: 90, height: 90, borderRadius: "50%", background: "#f3f3f3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, marginBottom: 12, overflow: "hidden" }}>
                  {form.photoUrl ? (
                    <img src={form.photoUrl} alt="avatar élève" style={{ width: 90, height: 90, objectFit: "cover" }} />
                  ) : (
                    <span role="img" aria-label="élève">🧑‍🎓</span>
                  )}
                </div>
                <input
                  placeholder="URL photo (optionnel)"
                  value={form.photoUrl}
                  onChange={e => setForm({ ...form, photoUrl: e.target.value })}
                  style={{ marginTop: 8, width: 120, fontSize: 13, padding: 6, border: "1px solid #ccc", borderRadius: 6 }}
                />
                <label style={{ marginTop: 8, fontSize: 13, color: '#555', cursor: 'pointer', textAlign: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files && e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          if (typeof ev.target?.result === 'string') {
                            setForm(f => ({ ...f, photoUrl: ev.target!.result as string }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <span style={{ border: '1px dashed #bbb', borderRadius: 6, padding: '6px 12px', display: 'inline-block', marginTop: 2 }}>
                    📷 Choisir une photo
                  </span>
                </label>
              </div>
              {/* Fields section */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 13 }}>Prénom</label>
                    <input className="input" placeholder="Prénom" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required style={{ width: "100%" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13 }}>Nom</label>
                    <input className="input" placeholder="Nom" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required style={{ width: "100%" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13 }}>Email</label>
                    <input className="input" type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required style={{ width: "100%" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13 }}>Téléphone</label>
                    <input className="input" placeholder="Téléphone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ width: "100%" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13 }}>Adresse</label>
                    <input className="input" placeholder="Adresse" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={{ width: "100%" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13 }}>Date de naissance</label>
                    <input className="input" type="date" placeholder="Date de naissance" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} style={{ width: "100%" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13 }}>Nationalité</label>
                    <input className="input" placeholder="Nationalité" value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} style={{ width: "100%" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13 }}>Statut</label>
                    <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as "actif"|"inactif"|"archivé" })} style={{ width: "100%" }}>
                      <option value="actif">Actif</option>
                      <option value="inactif">Inactif</option>
                      <option value="archivé">Archivé</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 13 }}>Genre</label>
                    <select className="input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value as "M"|"F"|"Autre" })} style={{ width: "100%" }}>
                      <option value="M">Homme</option>
                      <option value="F">Femme</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 13 }}>Numéro étudiant</label>
                    <input className="input" placeholder="Numéro étudiant" value={form.studentNumber} onChange={e => setForm({ ...form, studentNumber: e.target.value })} style={{ width: "100%" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13 }}>Date inscription</label>
                    <input className="input" placeholder="Date inscription" value={form.registrationDate} onChange={e => setForm({ ...form, registrationDate: e.target.value })} style={{ width: "100%" }} />
                  </div>
                  
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                  <label style={{ fontSize: 13 }}>
                    <input type="checkbox" checked={form.scholarship} onChange={e => setForm({ ...form, scholarship: e.target.checked })} /> Boursier
                  </label>
                  <label style={{ fontSize: 13 }}>
                    <input type="checkbox" checked={form.handicap} onChange={e => setForm({ ...form, handicap: e.target.checked })} /> Handicap
                  </label>
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 13 }}>Sous-groupe</label>
                    <select className="input" value={form.subGroupId} onChange={e => setForm({ ...form, subGroupId: e.target.value })} style={{ width: "100%" }}>
                      <option value="">Aucun</option>
                      {subGroups.map((sg) => (
                        <option key={sg.id} value={sg.id}>{sg.group.name} — {sg.code} {sg.session ? `(${sg.session})` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 13 }}>Filières (multi-sélection)</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {filteredFilieres.map((f) => (
                        <label key={f.id} style={{ fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={form.filiereIds.includes(f.id)}
                            onChange={e => {
                              if (e.target.checked) setForm({ ...form, filiereIds: [...form.filiereIds, f.id] });
                              else setForm({ ...form, filiereIds: form.filiereIds.filter(id => id !== f.id) });
                            }}
                          /> {f.code} - {f.label || "Sans label"}
                        </label>
                      ))}
                      {filteredFilieres.length === 0 && <span style={{ color: '#888', fontSize: 12 }}>Aucune filière disponible</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 32 }}>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} style={{ background: "#f3f3f3", color: "#222", border: 0, borderRadius: 4, padding: "8px 18px", fontWeight: 500 }}>Annuler</button>
              <button type="submit" style={{ background: "#22c55e", color: "white", border: 0, borderRadius: 4, padding: "8px 18px", fontWeight: 500 }}>{editingId ? "Enregistrer" : "Créer"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}


export default Eleves;