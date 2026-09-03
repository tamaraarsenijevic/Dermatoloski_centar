import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Pocetna from "./pages/Pocetna/Pocetna";
import ProtectedRoute from "./components/ProtectedRoute";
import Dermatolozi from "./pages/Admin/Dermatolozi/Dermatolozi";
import Pacijenti from "./pages/Dermatolog/Pacijenti/Pacijenti";
import PacijentDetalji from "./pages/Dermatolog/PacijentDetalji/PacijentDetalji";
import Termini from "./pages/Dermatolog/Termini/Termini";
import TerminDetalji from "./pages/Dermatolog/TerminDetalji/TerminDetalji";
import Izvestaji from "./pages/Dermatolog/Izvestaji/Izvestaji";
import PublicRoute from "./router/PublicRoute/PublicRoute";
import DermatologLayout from "./components/DermatologLayout";
import Usluge from "./pages/Admin/Usluge/Usluge";
import AdminLayout from "./components/AdminLayout/AdminLayout";
import Statistika from "./pages/Admin/Statistika/Statistika";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Pocetna />} /> {/* NOVO */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/admin/dermatolozi"
          element={
            <ProtectedRoute dozvoljeneUloge={["ADMIN"]}>
              <AdminLayout>
                <Dermatolozi />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/usluge"
          element={
            <ProtectedRoute dozvoljeneUloge={["ADMIN"]}>
              <AdminLayout>
                <Usluge />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/statistika"
          element={
            <ProtectedRoute dozvoljeneUloge={["ADMIN"]}>
              <AdminLayout>
                <Statistika />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pacijenti"
          element={
            <ProtectedRoute dozvoljeneUloge={["DERMATOLOG"]}>
              <DermatologLayout>
                <Pacijenti />
              </DermatologLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pacijenti/:id"
          element={
            <ProtectedRoute dozvoljeneUloge={["DERMATOLOG"]}>
              <DermatologLayout>
                <PacijentDetalji />
              </DermatologLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/termini"
          element={
            <ProtectedRoute dozvoljeneUloge={["DERMATOLOG"]}>
              <DermatologLayout>
                <Termini />
              </DermatologLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/termini/:id"
          element={
            <ProtectedRoute dozvoljeneUloge={["DERMATOLOG"]}>
              <DermatologLayout>
                <TerminDetalji />
              </DermatologLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/izvestaji"
          element={
            <ProtectedRoute dozvoljeneUloge={["DERMATOLOG"]}>
              <DermatologLayout>
                <Izvestaji />
              </DermatologLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
