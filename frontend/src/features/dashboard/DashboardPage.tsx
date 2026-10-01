import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  SquaresFour,
  UsersThree,
  Tooth,
  ClipboardText,
  ArrowRight,
  Sparkle,
} from "@phosphor-icons/react";
import heroDashboard from "@/assets/banners/hero-dashboard.jpg";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHero } from "@/components/ui/section-hero";
import { usePageHeader } from "@/components/layout/PageHeaderContext";
import { useAuth } from "@/features/auth/AuthContext";
import { useClinicaData } from "@/data/store";

export function DashboardPage() {
  usePageHeader({
    title: "Panel general",
    subtitle: "Vista general de tu clínica",
    icon: SquaresFour,
    tone: "blue",
  });
  const { sesion } = useAuth();
  const { pacientes, diagnosticosDe, planDe } = useClinicaData();
  const navigate = useNavigate();

  const primerNombre = sesion?.nombre.split(" ")[0] ?? "";

  const stats = useMemo(() => {
    const diagnosticosActivos = pacientes.reduce(
      (acc, p) => acc + diagnosticosDe(p.id).length,
      0,
    );
    const tratamientosPropuestos = pacientes.reduce(
      (acc, p) => acc + planDe(p.id).items.length,
      0,
    );
    return { diagnosticosActivos, tratamientosPropuestos };
  }, [pacientes, diagnosticosDe, planDe]);

  const recientes = pacientes.slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      <SectionHero
        icon={Tooth}
        tone="blue"
        kicker="Dental Cristo Rey"
        heading={`Hola, ${primerNombre}.`}
        description="Pacientes, historia clínica, odontograma y planes de tratamiento en un solo lugar."
        photo={heroDashboard}
        photoPosition="60% center"
        className="fade-in-up"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={UsersThree}
          label="Pacientes registrados"
          value={pacientes.length}
          tone="blue"
        />
        <StatCard
          icon={ClipboardText}
          label="Diagnósticos registrados"
          value={stats.diagnosticosActivos}
          tone="violet"
        />
        <StatCard
          icon={Tooth}
          label="Ítems en planes de tratamiento"
          value={stats.tratamientosPropuestos}
          tone="green"
        />
        <Card className="flex flex-col justify-between border-dashed p-5">
          <div className="flex items-center gap-2 text-ink-soft">
            <Sparkle size={16} weight="fill" className="text-brand-400" />
            <span className="text-xs font-semibold uppercase tracking-wide">Siguiente paso</span>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            Registra un paciente nuevo para abrir su historia clínica y odontograma.
          </p>
          <Button size="sm" variant="secondary" className="mt-3 w-fit" onClick={() => navigate("/app/pacientes")}>
            Ir a pacientes <ArrowRight size={14} />
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Pacientes recientes</CardTitle>
              <CardDescription>Los últimos ingresados al sistema</CardDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={() => navigate("/app/pacientes")}>
              Ver todos
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-line">
            {recientes.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/app/pacientes/${p.id}`)}
                className="flex items-center justify-between py-3 text-left transition-colors duration-150 ease-out hover:text-brand-700 focus-visible:outline-none"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {p.nombres} {p.apellidos}
                  </p>
                  <p className="text-xs text-ink-muted">CI {p.ci}</p>
                </div>
                <ArrowRight size={15} className="text-ink-muted" />
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="relative flex flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#123a26] via-[#2f6b48] to-[#6fb890] p-6">
          <ClipboardText
            weight="duotone"
            className="pointer-events-none absolute -bottom-8 -right-6 text-white/10"
            style={{ width: 150, height: 150, transform: "rotate(10deg)" }}
          />
          <p className="relative z-10 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            Expediente completo
          </p>
          <p className="relative z-10 mt-2 text-sm leading-relaxed text-white/90">
            Cada paciente queda documentado de principio a fin: registro, historia clínica,
            odontograma y plan de tratamiento en un solo lugar.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof UsersThree;
  label: string;
  value: number;
  tone: "blue" | "violet" | "green";
}) {
  const toneClasses = {
    blue: "bg-pastel-blue-bg text-pastel-blue-fg",
    violet: "bg-pastel-violet-bg text-pastel-violet-fg",
    green: "bg-pastel-green-bg text-pastel-green-fg",
  }[tone];

  return (
    <Card className="lift-hover p-5 transition-[transform,box-shadow] duration-200 ease-out hover:shadow-diffuse">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClasses}`}>
        <Icon size={18} weight="bold" />
      </div>
      <p className="mt-4 text-2xl font-semibold text-ink">{value}</p>
      <p className="text-sm text-ink-muted">{label}</p>
    </Card>
  );
}
