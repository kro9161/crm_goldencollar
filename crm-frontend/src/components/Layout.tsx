import { Outlet } from "react-router-dom";
import Navbar from "./Navbar"; // ✅ on importe ta vraie navbar
import "./Layout.css";

export default function Layout() {
  return (
    <div className="layout">
      {/* ✅ Navbar dynamique selon le rôle */}
      <Navbar />

      {/* ✅ Contenu des pages */}
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
