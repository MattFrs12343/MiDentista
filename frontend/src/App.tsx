import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ClipboardText, Stethoscope, Tooth } from "@phosphor-icons/react";
import { AuthProvider } from "@/features/auth/AuthContext";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { LoginPage } from "@/features/auth/LoginPage";
import { ClinicaDataProvider } from "@/data/store";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { PatientsListPage } from "@/features/patients/PatientsListPage";
import { PatientProfilePage } from "@/features/patients/PatientProfilePage";
import { PatientPickerPage } from "@/features/patients/PatientPickerPage";
import bannerOdontograma from "@/assets/banners/banner-odontograma.jpg";
import bannerTratamiento from "@/assets/banners/banner-tratamiento.jpg";
import bannerHistoriaClinica from "@/assets/banners/banner-historia-clinica.jpg";

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
