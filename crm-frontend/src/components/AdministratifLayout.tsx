import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useState } from "react";
import { Menu } from "lucide-react";

export default function AdministratifLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [archivedYearName, setArchivedYearName] = useState("");
  const [archivedYearSession, setArchivedYearSession] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "administratif") navigate("/login");

    // Vérifier si on est en mode consultation archives
    const readOnly = localStorage.getItem("isReadOnly") === "true";
    const yearName = localStorage.getItem("archivedYearName") || "";
    const yearSession = localStorage.getItem("archivedYearSession") || "";
    setIsReadOnly(readOnly);
    setArchivedYearName(yearName);
    setArchivedYearSession(yearSession);
  }, [navigate]);

  const exitArchivedMode = () => {
    localStorage.removeItem("archivedYearId");
    localStorage.removeItem("archivedYearName");
    localStorage.removeItem("archivedYearSession");
    localStorage.removeItem("isReadOnly");
    window.location.href = "/administratif/annees";
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    navigate("/login");
  };

  // 🎯 MENU ORGANISÉ PAR CATÉGORIES
  const menu = [
    {
      title: "👤 Gestion des personnes",
      items: [
        { label: "Élèves", to: "/administratif/eleves" },
        { label: "Profs", to: "/administratif/profs" },
      ],
    },

    {
      title: "🏫 Structure pédagogique",
      items: [
        { label: "Groupes", to: "/administratif/groupes" },
        { label: "Modules", to: "/administratif/modules" },
      ],
    },

    {
      title: "📅 Organisation",
      items: [
        { label: "Planning", to: "/administratif/planning" },
        { label: "Salles", to: "/administratif/salles" },
        { label: "Absences", to: "/administratif/absences" },
      ],
    },

    {
      title: "⚙️ Administration",
      items: [
        { label: "Tableau de bord", to: "/administratif/dashboard" },
        { label: "Années académiques", to: "/administratif/annees" },
      ],
    },
  ];

  const formatSession = (session: string, mode: "short" | "long" = "short") => {
    const s = (session || "").toLowerCase();
    if (mode === "long") return s === "octobre" ? "Octobre" : s === "fevrier" ? "Février" : session;
    return s === "octobre" ? "Oct" : s === "fevrier" ? "Fév" : session;
  };

  type YearOption = { id: string; label: string; session: string; isCurrent: boolean; isArchived: boolean };
  const [years, setYears] = useState<YearOption[]>([]);
  const [selectedYearIds, setSelectedYearIds] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const loadYears = async () => {
      try {
        // Charger TOUTES les années (incluant archivées) pour le sélecteur
        const res = await fetch(`${import.meta.env.VITE_API_URL}/academic-years?includeArchived=true`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        type ApiAcademicYear = {
          id: string;
          name: string;
          session: string;
          isCurrent: boolean;
          isArchived: boolean;
        };
        const data = (await res.json()) as ApiAcademicYear[];
        const opts = data.map((y) => ({
          id: y.id,
          label: `${y.name} (${formatSession(y.session, "short")})${y.isArchived ? " 📦" : ""}`,
          session: y.session,
          isCurrent: y.isCurrent,
          isArchived: y.isArchived,
        })) as YearOption[];
        setYears(opts);
        
        // Default: sélectionner UNIQUEMENT l'année courante NON archivée
        const stored = localStorage.getItem("academicYearIds");
        if (stored) {
          const ids = JSON.parse(stored) as string[];
          setSelectedYearIds(ids.filter(id => opts.some(o => o.id === id)));
        } else {
          // Sélectionner l'année courante ET non archivée
          const currentNonArchivedIds = opts.filter(o => o.isCurrent && !o.isArchived).map(o => o.id);
          setSelectedYearIds(currentNonArchivedIds.length > 0 ? currentNonArchivedIds : []);
        }
      } catch {
        // ignore
      }
    };
    loadYears();
  }, []);

  useEffect(() => {
    if (selectedYearIds.length > 0) {
      localStorage.setItem("academicYearIds", JSON.stringify(selectedYearIds));
      // Pour la compatibilité avec le code existant qui utilise academicYearId (singulier)
      localStorage.setItem("academicYearId", selectedYearIds[0]);
    }
  }, [selectedYearIds]);

  const toggleYear = (yearId: string) => {
    const clickedYear = years.find(y => y.id === yearId);
    
    // Si c'est une année archivée, activer le mode lecture seule
    if (clickedYear?.isArchived) {
      localStorage.setItem("isReadOnly", "true");
      localStorage.setItem("archivedYearId", yearId);
      localStorage.setItem("archivedYearName", clickedYear.label);
      localStorage.setItem("archivedYearSession", clickedYear.session);
      localStorage.setItem("academicYearId", yearId);
      window.location.reload();
      return;
    }
    
    // Sinon, comportement normal pour les années courantes
    setSelectedYearIds(prev => {
      if (prev.includes(yearId)) {
        // Désactiver si déjà actif (mais garder au moins 1)
        return prev.length > 1 ? prev.filter(id => id !== yearId) : prev;
      } else {
        // Activer
        return [...prev, yearId];
      }
    });
  };

  // Masquer le sélecteur sur la page Années Académiques
  const hideYearSelector = location.pathname === "/administratif/annees";

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-800">

      {/* --- Sidebar --- */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#004aad] text-white flex flex-col justify-between shadow-lg transform transition-transform duration-300 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6">
          
          {/* Logo + header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
              🏫
            </div>
            <div>
              <h2 className="font-semibold text-white text-lg">CRM École</h2>
              <p className="text-sm opacity-80">Mode Administratif</p>
            </div>
          </div>

          {/* --- Navigation organisée --- */}
          {menu.map((section) => (
            <div key={section.title} className="mb-6">

              <h3 className="text-sm uppercase tracking-wide font-semibold opacity-80 mb-2">
                {section.title}
              </h3>

              <nav className="flex flex-col gap-1 ml-2">
                {section.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-blue-600 transition"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white font-medium px-3 py-2 rounded-md m-6 transition"
        >
          🚪 Déconnexion
        </button>
      </aside>

      {/* Overlay mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- Main area --- */}
      <main className="flex-1 flex flex-col lg:ml-0">
        
        {/* Bandeau année archivée */}
        {isReadOnly && (
          <div className="bg-amber-600 text-white px-8 py-3 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📦</span>
              <div>
                <div className="font-semibold text-lg">
                  Consultation année archivée : {archivedYearName}
                </div>
                <div className="text-sm opacity-90">
                  Session {formatSession(archivedYearSession, "long")} • Mode lecture seule
                </div>
              </div>
            </div>
            <button
              onClick={exitArchivedMode}
              className="bg-white text-amber-700 font-medium px-4 py-2 rounded-md hover:bg-amber-50 transition"
            >
              ✕ Quitter
            </button>
          </div>
        )}

        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm px-4 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-md transition"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
            <h1 className="text-base lg:text-lg font-semibold text-gray-800">
              School CRM – Administratif
            </h1>
          </div>
          <span className="text-xs lg:text-sm text-gray-500">
            {new Date().toLocaleDateString("fr-FR")}
          </span>
        </header>

        {/* Page content */}
        <div className="flex-1 bg-gray-100 overflow-y-auto p-4 lg:p-8">
          {!hideYearSelector && !isReadOnly && (
            <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-3">📅 Année académique</label>
              <div className="flex flex-wrap gap-3">
                {years.map((y) => {
                  const isSelected = selectedYearIds.includes(y.id);
                  return (
                    <button
                      key={y.id}
                      onClick={() => toggleYear(y.id)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        isSelected
                          ? (y.session || "").toLowerCase() === "octobre"
                            ? "bg-orange-500 text-white border-2 border-orange-600 shadow-md"
                            : "bg-blue-500 text-white border-2 border-blue-600 shadow-md"
                          : (y.session || "").toLowerCase() === "octobre"
                            ? "bg-orange-50 text-orange-700 border border-orange-300 hover:bg-orange-100"
                            : "bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100"
                      }`}
                    >
                      {y.label}
                      {y.isCurrent && " ✓"}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">💡 Cliquez pour activer/désactiver une session</p>
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
