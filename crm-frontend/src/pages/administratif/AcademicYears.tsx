import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlusCircle, Calendar, Archive, CheckCircle, XCircle, RefreshCw } from "lucide-react";

type AcademicYear = {
  id: string;
  name: string;
  session: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isArchived: boolean;
  archivedAt?: string;
  _count?: {
    groups: number;
    courses: number;
    enrollments: number;
  };
};

export default function AcademicYears() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedYearDetails, setSelectedYearDetails] = useState<{
    id: string;
    name: string;
    session: string;
    isArchived: boolean;
    isCurrent: boolean;
    groups?: Array<{
      id: string;
      name: string;
      label?: string;
      subGroups?: Array<{
        id: string;
        code: string;
        label?: string;
        level?: string;
        students?: Array<{ id: string; firstName: string; lastName: string; email: string }>;
        filieres?: Array<{ id: string; code: string; label?: string }>;
      }>;
    }>;
    courses?: Array<{
      id: string;
      code: string;
      name: string;
      type?: string;
      totalHours?: number;
      coef?: number;
      professors?: Array<{ id: string; firstName: string; lastName: string; email: string }>;
      subGroups?: Array<{ id: string; code: string; label?: string }>;
    }>;
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    session: "octobre",
    startDate: "",
    endDate: "",
    isCurrent: false,
  });

  const token = localStorage.getItem("token");

  // Charger les années
  const fetchYears = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      const url = showArchived 
        ? "http://localhost:4000/academic-years?includeArchived=true"
        : "http://localhost:4000/academic-years";

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Erreur chargement années");

      const data = await res.json();
      setYears(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur chargement années";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [showArchived, token]);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  // Créer une année
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/academic-years`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur création");
      }

      setSuccess("Année créée avec succès !");
      setDialogOpen(false);
      setFormData({
        name: "",
        session: "octobre",
        startDate: "",
        endDate: "",
        isCurrent: false,
      });
      fetchYears();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur création";
      setError(msg);
    }
  };

  // Activer une année
  const handleSetCurrent = async (id: string) => {
    try {
      setError("");
      const res = await fetch(`http://localhost:4000/academic-years/${id}/set-current`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur activation");
      }

      // 🔥 Clear localStorage pour forcer le rechargement avec la nouvelle année
      localStorage.removeItem("academicYearId");
      localStorage.removeItem("academicYearIds");
      localStorage.removeItem("archivedYearId");
      localStorage.removeItem("isReadOnly");
      localStorage.removeItem("academicYearName");

      setSuccess("Année activée ! Rechargement...");
      
      // Recharger après 500ms pour laisser le message s'afficher
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur activation";
      setError(msg);
    }
  };

  // Archiver une année
  const handleArchive = async (id: string, force = false) => {
    if (!confirm(force ? "Archiver cette année EN COURS (forcer) ? Pour tests uniquement." : "Archiver cette année ? Elle ne sera plus modifiable.")) return;

    try {
      setError("");
      const url = force 
        ? `http://localhost:4000/academic-years/${id}/archive?force=true`
        : `http://localhost:4000/academic-years/${id}/archive`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur archivage");
      }

      // 🔥 Clear localStorage pour forcer le reset de l'interface
      localStorage.removeItem("academicYearId");
      localStorage.removeItem("academicYearIds");
      localStorage.removeItem("archivedYearId");
      localStorage.removeItem("isReadOnly");
      localStorage.removeItem("academicYearName");

      setSuccess(force ? "Année archivée (forcé) ! Rechargement..." : "Année archivée ! Rechargement...");
      
      // Recharger après 500ms
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur archivage";
      setError(msg);
    }
  };

  // Recalculer les années (fin dépassée => plus courante)
  const handleRecompute = async () => {
    try {
      setError("");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/academic-years/recompute`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur recalcul");
      }
      setSuccess("Statuts des années recalculés.");
      fetchYears();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur recalcul";
      setError(msg);
    }
  };

  // Charger les détails complets d'une année
  const fetchYearDetails = async (yearId: string) => {
    try {
      setLoadingDetails(true);
      const res = await fetch(`http://localhost:4000/academic-years/${yearId}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur chargement détails");
      const data = await res.json();
      setSelectedYearDetails(data);
      setDetailDialogOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur détails";
      setError(msg);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Entrer en mode consultation année archivée
  const enterArchivedMode = (year: AcademicYear) => {
    localStorage.setItem("archivedYearId", year.id);
    localStorage.setItem("archivedYearName", year.name);
    localStorage.setItem("archivedYearSession", year.session);
    localStorage.setItem("isReadOnly", "true");
    window.location.href = "/administratif/dashboard";
  };

  // Désarchiver une année
  const handleUnarchive = async (id: string) => {
    try {
      setError("");
      const res = await fetch(`http://localhost:4000/academic-years/${id}/unarchive`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur désarchivage");
      }

      setSuccess("Année désarchivée !");
      fetchYears();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur désarchivage";
      setError(msg);
    }
  };

  // Supprimer une année
  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer définitivement cette année ?")) return;

    try {
      setError("");
      const res = await fetch(`http://localhost:4000/academic-years/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur suppression");
      }

      setSuccess("Année supprimée !");
      fetchYears();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur suppression";
      setError(msg);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Années Académiques</h1>
          <p className="text-gray-600 mt-1">Gestion des années scolaires et sessions</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="w-4 h-4 mr-2" />
              Nouvelle Année
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une année académique</DialogTitle>
              <DialogDescription>
                Définissez une nouvelle année scolaire (Octobre ou Février)
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <input
                  type="text"
                  placeholder="2025-2026 Octobre"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Session</label>
                <select
                  value={formData.session}
                  onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="octobre">Octobre</option>
                  <option value="fevrier">Février</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date début</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Date fin</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isCurrent"
                  checked={formData.isCurrent}
                  onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })}
                  className="w-4 h-4 mr-2"
                />
                <label htmlFor="isCurrent" className="text-sm">
                  Définir comme année en cours
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">Créer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 border-green-500 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Filtres */}
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant={showArchived ? "default" : "outline"}
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
        >
          <Archive className="w-4 h-4 mr-2" />
          {showArchived ? "Masquer archivées" : "Voir archivées"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleRecompute}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Recalculer les années
        </Button>
      </div>

      {/* Liste des années */}
      {loading ? (
        <p className="text-center py-8 text-gray-500">Chargement...</p>
      ) : years.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Aucune année académique trouvée</p>
            <p className="text-sm text-gray-500 mt-1">Créez votre première année pour commencer</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {years.map((year) => (
            <Card key={year.id} className={year.isCurrent ? "border-blue-500 border-2" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{year.name}</CardTitle>
                    <CardDescription className="capitalize mt-1">
                      Session {year.session}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1">
                    {year.isCurrent && (
                      <Badge className="bg-blue-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        En cours
                      </Badge>
                    )}
                    {year.isArchived && (
                      <Badge variant="secondary">
                        <Archive className="w-3 h-3 mr-1" />
                        Archivée
                      </Badge>
                    )}
                    {!year.isCurrent && !year.isArchived && new Date(year.endDate) < new Date() && (
                      <Badge variant="outline" className="border-amber-300 text-amber-700">
                        Terminée
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="text-sm text-gray-600 space-y-2 mb-4">
                  <p>
                    📅 {new Date(year.startDate).toLocaleDateString()} →{" "}
                    {new Date(year.endDate).toLocaleDateString()}
                  </p>
                  {year._count && (
                    <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
                      <div>
                        <div className="font-semibold">{year._count.groups}</div>
                        <div className="text-xs text-gray-500">Groupes</div>
                      </div>
                      <div>
                        <div className="font-semibold">{year._count.courses}</div>
                        <div className="text-xs text-gray-500">Cours</div>
                      </div>
                      <div>
                        <div className="font-semibold">{year._count.enrollments}</div>
                        <div className="text-xs text-gray-500">Inscrits</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="default" onClick={() => fetchYearDetails(year.id)}>
                    👁️ Voir détails
                  </Button>

                  {year.isArchived && (
                    <Button size="sm" variant="secondary" onClick={() => enterArchivedMode(year)}>
                      📂 Consulter
                    </Button>
                  )}

                  {!year.isCurrent && !year.isArchived && (
                    <Button size="sm" variant="outline" onClick={() => handleSetCurrent(year.id)}>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Activer
                    </Button>
                  )}

                  {!year.isArchived && !year.isCurrent && (
                    <Button size="sm" variant="outline" onClick={() => handleArchive(year.id)}>
                      <Archive className="w-3 h-3 mr-1" />
                      Archiver
                    </Button>
                  )}

                  {!year.isArchived && year.isCurrent && (
                    <Button size="sm" variant="destructive" onClick={() => handleArchive(year.id, true)}>
                      <Archive className="w-3 h-3 mr-1" />
                      Archiver (forcer)
                    </Button>
                  )}

                  {year.isArchived && (
                    <Button size="sm" variant="outline" onClick={() => handleUnarchive(year.id)}>
                      Désarchiver
                    </Button>
                  )}

                  {!year.isCurrent && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(year.id)}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Supprimer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal détails année */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de l'année: {selectedYearDetails?.name}</DialogTitle>
            <DialogDescription className="capitalize">
              Session {selectedYearDetails?.session} • {selectedYearDetails?.isArchived ? "Archivée" : selectedYearDetails?.isCurrent ? "En cours" : "Inactive"}
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <p className="text-center py-8 text-gray-500">Chargement...</p>
          ) : selectedYearDetails ? (
            <div className="space-y-6 mt-4">
              {/* Groupes */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Groupes ({selectedYearDetails.groups?.length || 0})</h3>
                {selectedYearDetails.groups && selectedYearDetails.groups.length > 0 ? (
                  <div className="space-y-4">
                    {selectedYearDetails.groups?.map((g) => (
                      <div key={g.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="font-medium text-base mb-2">{g.name} {g.label && `(${g.label})`}</div>
                        
                        {/* Sous-groupes */}
                        {g.subGroups && g.subGroups.length > 0 && (
                          <div className="ml-4 mt-3 space-y-3">
                            <div className="text-sm font-medium text-gray-700">Sous-groupes:</div>
                            {g.subGroups?.map((sg) => (
                              <div key={sg.id} className="border-l-4 border-blue-300 pl-3 py-2 bg-white rounded">
                                <div className="font-medium text-sm">{sg.code} {sg.label && `• ${sg.label}`} {sg.level && `• ${sg.level}`}</div>
                                
                                {/* Élèves */}
                                {sg.students && sg.students.length > 0 && (
                                  <div className="mt-2 text-xs text-gray-600">
                                    <span className="font-semibold">Élèves ({sg.students.length}):</span>{" "}
                                    {sg.students?.map((s) => `${s.firstName} ${s.lastName}`).join(", ")}
                                  </div>
                                )}
                                
                                {/* Filières */}
                                {sg.filieres && sg.filieres.length > 0 && (
                                  <div className="mt-1 text-xs text-gray-600">
                                    <span className="font-semibold">Filières:</span>{" "}
                                    {sg.filieres?.map((f) => f.code).join(", ")}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Aucun groupe</p>
                )}
              </div>

              {/* Cours */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Cours ({selectedYearDetails.courses?.length || 0})</h3>
                {selectedYearDetails.courses && selectedYearDetails.courses.length > 0 ? (
                  <div className="space-y-3">
                    {selectedYearDetails.courses?.map((c) => (
                      <div key={c.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="font-medium">{c.code} • {c.name}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {c.type && <span className="mr-3">Type: {c.type}</span>}
                          {c.totalHours && <span className="mr-3">{c.totalHours}h</span>}
                          {c.coef && <span>Coef: {c.coef}</span>}
                        </div>
                        
                        {/* Professeurs */}
                        {c.professors && c.professors.length > 0 && (
                          <div className="mt-2 text-xs text-gray-600">
                            <span className="font-semibold">Professeurs:</span>{" "}
                            {c.professors?.map((p) => `${p.firstName} ${p.lastName}`).join(", ")}
                          </div>
                        )}
                        
                        {/* Sous-groupes concernés */}
                        {c.subGroups && c.subGroups.length > 0 && (
                          <div className="mt-1 text-xs text-gray-600">
                            <span className="font-semibold">Sous-groupes:</span>{" "}
                            {c.subGroups?.map((sg) => sg.code).join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Aucun cours</p>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
