// src/components/EleveLayout.tsx
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function EleveLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "eleve") navigate("/login");
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    navigate("/login");
  };

  const navItems = [
    { label: "📅 Planning", to: "/eleve/dashboard" },
    { label: "🧮 Notes", to: "/eleve/notes" },
    { label: "📋 Absences", to: "/eleve/absences" },
    { label: "📘 Moodle", to: "/eleve/moodle" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-800">
      {/* --- Sidebar --- */}
      <aside className="w-64 bg-[#0b5ed7] text-white flex flex-col justify-between shadow-lg">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
              🎓
            </div>
            <div>
              <h2 className="font-semibold text-white text-lg">CRM École</h2>
              <p className="text-sm opacity-80">Espace Élève</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-2 px-4 py-2 rounded-md hover:bg-blue-600 transition text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white font-medium px-3 py-2 rounded-md m-6 transition"
        >
          🚪 Déconnexion
        </button>
      </aside>

      {/* --- Contenu principal --- */}
      <main className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 shadow-sm px-8 py-4 flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-800">
            Tableau de bord – Élève
          </h1>
          <span className="text-sm text-gray-500">
            {new Date().toLocaleDateString("fr-FR")}
          </span>
        </header>

        <div className="flex-1 bg-gray-100 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
