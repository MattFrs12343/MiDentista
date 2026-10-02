import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ClipboardText, Stethoscope, Tooth } from "@phosphor-icons/react";
import { AuthProvider } from "@/features/auth/AuthContext";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { LoginPage } from "@/features/auth/LoginPage";
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

export default function App() {
  return (
    <AuthProvider>
      <ClinicaDataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="pacientes" element={<PatientsListPage />} />
              <Route path="pacientes/:pacienteId" element={<PatientProfilePage />} />
              <Route
                path="historia-clinica"
                element={
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
                }
              />
              <Route
                path="odontograma"
                element={
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
                }
              />
              <Route
                path="diagnostico-tratamiento"
                element={
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
