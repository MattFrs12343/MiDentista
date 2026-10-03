import { lazy, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ClipboardText, Stethoscope, Tooth } from "@phosphor-icons/react";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { LoginPage } from "@/features/auth/LoginPage";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";
import { GoogleCallbackPage } from "@/features/auth/GoogleCallbackPage";
import { ClinicaDataProvider } from "@/data/store";
import { AppShell } from "@/components/layout/AppShell";
import bannerOdontograma from "@/assets/banners/banner-odontograma.jpg";
import bannerTratamiento from "@/assets/banners/banner-tratamiento.jpg";
import bannerHistoriaClinica from "@/assets/banners/banner-historia-clinica.jpg";

// Cada seccion se descarga por separado. Asi la navegacion real cae en el
// fallback del Suspense de AppShell (spinner) en vez de bloquear el hilo.
const DashboardPage = lazy(() =>
  import("@/features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const PatientsListPage = lazy(() =>
  import("@/features/patients/PatientsListPage").then((m) => ({ default: m.PatientsListPage })),
);
const PatientProfilePage = lazy(() =>
  import("@/features/patients/PatientProfilePage").then((m) => ({ default: m.PatientProfilePage })),
);
const PatientPickerPage = lazy(() =>
  import("@/features/patients/PatientPickerPage").then((m) => ({ default: m.PatientPickerPage })),
);

const AdminPage = lazy(() =>
  import("@/features/admin/AdminPage").then((m) => ({ default: m.AdminPage })),
);

/** Además de tener sesión, exige rol 'superadmin'; cualquier otra cuenta vuelve al panel. */
function RequireSuperadmin({ children }: { children: ReactNode }) {
  const { sesion } = useAuth();
  if (sesion?.rol !== "superadmin") return <Navigate to="/app" replace />;
  return <>{children}</>;
}

/** Vistas de operativa clínica (pacientes, historia, etc.): un superadmin no
 * es personal de ninguna clínica, así que no tiene nada que hacer ahí y se
 * lo manda directo a su propio panel. */
function RequireStaff({ children }: { children: ReactNode }) {
  const { sesion } = useAuth();
  if (sesion?.rol === "superadmin") return <Navigate to="/app/admin" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <ClinicaDataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/recuperar-contrasena" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<GoogleCallbackPage />} />
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route
                index
                element={
                  <RequireStaff>
                    <DashboardPage />
                  </RequireStaff>
                }
              />
              <Route
                path="pacientes"
                element={
                  <RequireStaff>
                    <PatientsListPage />
                  </RequireStaff>
                }
              />
              <Route
                path="pacientes/:pacienteId"
                element={
                  <RequireStaff>
                    <PatientProfilePage />
                  </RequireStaff>
                }
              />
              <Route
                path="historia-clinica"
                element={
                  <RequireStaff>
                    <PatientPickerPage
                      key="historia"
                      titulo="Historia clínica"
                      subtitulo="Selecciona un paciente para ver o completar su historia clínica"
                      tab="historia"
                      icono={ClipboardText}
                      tono="violet"
                      foto={bannerHistoriaClinica}
                      fotoPosicion="60% center"
                    />
                  </RequireStaff>
                }
              />
              <Route
                path="odontograma"
                element={
                  <RequireStaff>
                    <PatientPickerPage
                      key="odontograma"
                      titulo="Odontograma"
                      subtitulo="Selecciona un paciente para registrar su odontograma"
                      tab="odontograma"
                      icono={Tooth}
                      tono="blue"
                      foto={bannerOdontograma}
                      fotoPosicion="60% center"
                    />
                  </RequireStaff>
                }
              />
              <Route
                path="diagnostico-tratamiento"
                element={
                  <RequireStaff>
                    <PatientPickerPage
                      key="tratamiento"
                      titulo="Diagnóstico y tratamiento"
                      subtitulo="Selecciona un paciente para su diagnóstico y plan de tratamiento"
                      tab="tratamiento"
                      icono={Stethoscope}
                      tono="yellow"
                      foto={bannerTratamiento}
                      fotoPosicion="60% center"
                    />
                  </RequireStaff>
                }
              />
              <Route
                path="admin"
                element={
                  <RequireSuperadmin>
                    <AdminPage />
                  </RequireSuperadmin>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </BrowserRouter>
      </ClinicaDataProvider>
    </AuthProvider>
  );
}
