// src/components/ProfLayout.tsx
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

export default function ProfLayout() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "prof") navigate("/login");
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    navigate("/login");
  };

  const navItems = [
    { label: "📅 Dashboard", to: "/prof/dashboard" },
    { label: "🧮 Notes", to: "/prof/notes" },
    { label: "📋 Appel", to: "/prof/appel" },
    { label: "📘 Moodle", to: "/prof/moodle" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-800">
      {/* --- Sidebar --- */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#004aad] text-white flex flex-col justify-between shadow-lg transform transition-transform duration-300 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
              🎓
            </div>
            <div>
              <h2 className="font-semibold text-white text-lg">CRM École</h2>
              <p className="text-sm opacity-80">Espace Professeur</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setIsSidebarOpen(false)}
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

      {/* Overlay mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- Contenu principal --- */}
      <main className="flex-1 flex flex-col lg:ml-0">
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
              Tableau de bord – Professeur
            </h1>
          </div>
          <span className="text-xs lg:text-sm text-gray-500">
            {new Date().toLocaleDateString("fr-FR")}
          </span>
        </header>

        <div className="flex-1 bg-gray-100 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
