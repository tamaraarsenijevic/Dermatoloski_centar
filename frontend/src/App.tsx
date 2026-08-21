import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Pocetna from "./pages/Pocetna";
import ProtectedRoute from "./components/ProtectedRoute";
import DermatolozeLista from "./pages/Admin/DermatolozeLista";
import Pacijenti from "./pages/Dermatolog/Pacijenti";
import Termini from "./pages/Dermatolog/Termini";
import Izvestaji from "./pages/Dermatolog/IzvestajiStranica";
import PublicRoute from "./router/PublicRoute/PublicRoute";

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
              <DermatolozeLista />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pacijenti"
          element={
            <ProtectedRoute dozvoljeneUloge={["DERMATOLOG"]}>
              <Pacijenti />
            </ProtectedRoute>
          }
        />
        <Route
          path="/termini"
          element={
            <ProtectedRoute dozvoljeneUloge={["DERMATOLOG"]}>
              <Termini />
            </ProtectedRoute>
          }
        />
        <Route
          path="/izvestaji"
          element={
            <ProtectedRoute dozvoljeneUloge={["DERMATOLOG"]}>
              <Izvestaji />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
