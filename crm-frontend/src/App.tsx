import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

import Eleves from "./pages/administratif/Eleves";
import Professeurs from "./pages/administratif/Professeurs";
import AdminDashboard from "./pages/AdminDashboard";
import ProfDashboard from "./pages/ProfDashboard";
import EleveDashboard from "./pages/EleveDashboard";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import Courses from "./pages/administratif/Courses";
import Salles from "./pages/administratif/Salles";
import Absences from "./pages/administratif/Absences";
import Planning from "./pages/administratif/Planning";
// 🆕 Imports du nouvel espace administratif
import AdministratifLayout from "./components/AdministratifLayout";
import Dashboard from "./pages/administratif/Dashboard";
import ProfLayout from "./components/ProfLayout";
import Groups from "./pages/administratif/Groups";
import AcademicYears from "./pages/administratif/AcademicYears";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Redirection par défaut vers /login */}
          <Route index element={<Navigate to="/login" replace />} />

          {/* 🔒 Admin principal */}
          <Route
            path="admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* 🔒 Espace administratif (avec sidebar + sous-pages) */}
          <Route
            path="administratif"
            element={
              <ProtectedRoute role="administratif">
                <AdministratifLayout />
              </ProtectedRoute>
            }
          >
            {/* redirection par défaut vers le dashboard */}
            <Route index element={<Navigate to="dashboard" replace />} />

            {/* sous-pages */}
            <Route path="dashboard" element={<Dashboard />} />
     
            <Route path="eleves" element={<Eleves />} />
            <Route path="profs" element={<Professeurs />} />
            <Route path="modules" element={<Courses />} />
            <Route path="salles" element={<Salles />} />
            <Route path="absences" element={<Absences />} />
            <Route path="planning" element={<Planning />} />
            <Route path="groupes" element={<Groups />} />
            <Route path="annees" element={<AcademicYears />} />

            {/* plus tard : modules, salles, absences, planning */}
          </Route>

        {/* 🔒 Espace Professeur (avec layout + sous-pages) */}
<Route
  path="prof"
  element={
    <ProtectedRoute role="prof">
      <ProfLayout />
    </ProtectedRoute>
  }
>
  {/* redirection vers le dashboard par défaut */}
  <Route index element={<Navigate to="dashboard" replace />} />

  {/* sous-pages du prof */}
  <Route path="dashboard" element={<ProfDashboard />} />
  {/* tu pourras en ajouter d’autres plus tard, ex : */}
  {/* <Route path="appel" element={<Appel />} /> */}
  {/* <Route path="notes" element={<Notes />} /> */}
</Route>


          {/* 🔒 Élève */}
          <Route
            path="eleve"
            element={
              <ProtectedRoute role="eleve">
                <EleveDashboard />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Login + fallback */}
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
