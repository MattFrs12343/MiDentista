import { useState } from "react";
import { ArrowRight, CheckCircle, SkipForward, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { usePortalPaciente } from "@/features/portal-paciente/PortalPacienteContext";
import { guardarPrediagnostico } from "@/features/portal-paciente/sintomasService";
import {
  MENSAJE_SEVERIDAD,
  TARJETAS_DURACION,
  TARJETAS_INTENSIDAD,
  TARJETAS_SINTOMAS,
  alSeleccionarSintoma,
  calcularCondicionPosible,
  calcularSeveridad,
  requiereIntensidadYDuracion,
  type Duracion,
  type Intensidad,
  type Severidad,
  type SintomaId,
} from "@/features/portal-paciente/sintomasArbol";

import imgDolorMuela from "@/assets/sintomas/dolor-muela.png";
import imgDolorMandibula from "@/assets/sintomas/dolor-mandibula.png";
import imgSangrado from "@/assets/sintomas/sangrado.png";
import imgInflamacion from "@/assets/sintomas/inflamacion.png";
import imgFiebre from "@/assets/sintomas/fiebre.png";
import imgTraumaDental from "@/assets/sintomas/trauma-dental.png";
import imgSensibilidad from "@/assets/sintomas/sensibilidad.png";
import imgPusMalAliento from "@/assets/sintomas/pus-mal-aliento.png";
import imgNinguno from "@/assets/sintomas/ninguno.png";
import imgIntensidadLeve from "@/assets/sintomas/intensidad-leve.png";
import imgIntensidadModerado from "@/assets/sintomas/intensidad-moderado.png";
import imgIntensidadSevero from "@/assets/sintomas/intensidad-severo.png";
import imgDuracionHoras from "@/assets/sintomas/duracion-horas.png";
import imgDuracionDias from "@/assets/sintomas/duracion-dias.png";
import imgDuracionMasDias from "@/assets/sintomas/duracion-mas-dias.png";
import imgPortada from "@/assets/sintomas/portada-cuestionario.png";

const IMAGENES_SINTOMAS: Record<SintomaId, string> = {
  dolor_muela: imgDolorMuela,
  dolor_mandibula: imgDolorMandibula,
  sangrado: imgSangrado,
  inflamacion: imgInflamacion,
  fiebre: imgFiebre,
  trauma_dental: imgTraumaDental,
  sensibilidad: imgSensibilidad,
  pus_mal_aliento: imgPusMalAliento,
  ninguno: imgNinguno,
};

const IMAGENES_INTENSIDAD: Record<Intensidad, string> = {
  leve: imgIntensidadLeve,
  moderado: imgIntensidadModerado,
  severo: imgIntensidadSevero,
};

const IMAGENES_DURACION: Record<Duracion, string> = {
  horas: imgDuracionHoras,
  dias: imgDuracionDias,
  mas_dias: imgDuracionMasDias,
};

type Paso = "sintomas" | "intensidad" | "duracion" | "resultado";

/** Tarjeta a clic sobre imagen — misma pieza visual para los tres pasos del
 * wizard, solo cambia qué significa estar "seleccionada". */
function TarjetaOpcion({
  imagen,
  etiqueta,
  seleccionada,
  onClick,
}: {
  imagen: string;
  etiqueta: string;
  seleccionada: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={seleccionada}
      className={cn(
        "press flex flex-col items-center gap-2 rounded-panel border p-4 text-center transition-colors",
        seleccionada
          ? "border-brand-600 bg-brand-50 shadow-e1"
          : "border-line bg-surface hover:border-line-strong hover:bg-surface-sunken",
      )}
    >
      {/* Decorativo: la etiqueta de texto ya describe el síntoma, repetirlo
          en el alt duplicaría el anuncio para lectores de pantalla. */}
      <img src={imagen} alt="" className="h-16 w-16 object-contain sm:h-20 sm:w-20" />
      <span className={cn("text-sm font-medium", seleccionada ? "text-brand-900" : "text-ink")}>
        {etiqueta}
      </span>
    </button>
  );
}

function EncabezadoPaso({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="title-ios text-xl font-semibold text-ink sm:text-2xl">{titulo}</h1>
      <p className="text-sm text-ink-soft">{descripcion}</p>
    </div>
  );
}

/**
 * Wizard de síntomas (pieza A del módulo 17 — ver
 * docs/modules/17-asistente-ia/arbol-sintomas.md). Componente reutilizable:
 * lo monta `SintomasWizardPage` (ruta de pantalla completa, primer ingreso
 * tras afiliarse) y `AsistenteSintomasFlotante` (botón flotante del portal,
 * para repetirlo cuando el paciente quiera). `onTerminar` decide qué pasa al
 * saltar o al terminar — navegar a `/portal` en un caso, cerrar el panel en
 * el otro — el wizard mismo no sabe ni le importa cuál de los dos es.
 */
export function SintomasWizard({
  onTerminar,
  textoBotonFinal = "Continuar",
}: {
  onTerminar: () => void;
  textoBotonFinal?: string;
}) {
  const { ficha } = usePortalPaciente();

  const [paso, setPaso] = useState<Paso>("sintomas");
  const [sintomas, setSintomas] = useState<SintomaId[]>([]);
  const [intensidad, setIntensidad] = useState<Intensidad | null>(null);
  const [duracion, setDuracion] = useState<Duracion | null>(null);
  const [severidad, setSeveridad] = useState<Severidad | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derivado, no se guarda como columna propia: se recalcula a partir de los
  // mismos sintomas/intensidad que ya se persisten (ver calcularCondicionPosible).
  const condicionPosible = calcularCondicionPosible(sintomas, intensidad);

  const finalizar = async (duracionFinal: Duracion | null) => {
    const resultado = calcularSeveridad(sintomas, intensidad);
    setSeveridad(resultado);
    setPaso("resultado");

    // Sin ficha de paciente/clínica todavía resuelta no hay dónde guardar el
    // resultado — se muestra igual el mensaje, pero no se persiste nada.
    const pacienteId = ficha?.paciente?.id;
    const clinicaId = ficha?.clinica?.id;
    if (!pacienteId || !clinicaId) return;

    setGuardando(true);
    setError(null);
    try {
      await guardarPrediagnostico(pacienteId, clinicaId, {
        sintomas,
        intensidad,
        duracion: duracionFinal,
        severidad: resultado,
      });
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo guardar tu respuesta");
    } finally {
      setGuardando(false);
    }
  };

  const siguienteDesdeSintomas = () => {
    if (requiereIntensidadYDuracion(sintomas)) setPaso("intensidad");
    else void finalizar(null);
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {paso === "sintomas" ? (
        <>
          <div className="flex flex-col items-center gap-3 text-center">
            <img src={imgPortada} alt="" className="h-28 w-28 object-contain" />
            <EncabezadoPaso
              titulo="Antes de empezar, contanos qué sentís"
              descripcion="Elegí todo lo que te esté pasando. Es opcional y no reemplaza la evaluación de tu odontólogo."
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TARJETAS_SINTOMAS.map((t) => (
              <TarjetaOpcion
                key={t.id}
                imagen={IMAGENES_SINTOMAS[t.id]}
                etiqueta={t.etiqueta}
                seleccionada={sintomas.includes(t.id)}
                onClick={() => setSintomas((actuales) => alSeleccionarSintoma(actuales, t.id))}
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" onClick={onTerminar}>
              <SkipForward size={16} weight="bold" />
              Saltar por ahora
            </Button>
            <Button type="button" onClick={siguienteDesdeSintomas} disabled={sintomas.length === 0}>
              Siguiente
              <ArrowRight size={16} weight="bold" />
            </Button>
          </div>
        </>
      ) : null}

      {paso === "intensidad" ? (
        <>
          <EncabezadoPaso titulo="¿Qué tan fuerte es el dolor?" descripcion="Elegí la opción que más se parece a lo que sentís." />
          <div className="grid grid-cols-3 gap-3">
            {TARJETAS_INTENSIDAD.map((t) => (
              <TarjetaOpcion
                key={t.id}
                imagen={IMAGENES_INTENSIDAD[t.id]}
                etiqueta={t.etiqueta}
                seleccionada={intensidad === t.id}
                onClick={() => setIntensidad(t.id)}
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" onClick={onTerminar}>
              <SkipForward size={16} weight="bold" />
              Saltar por ahora
            </Button>
            <Button type="button" onClick={() => setPaso("duracion")} disabled={!intensidad}>
              Siguiente
              <ArrowRight size={16} weight="bold" />
            </Button>
          </div>
        </>
      ) : null}

      {paso === "duracion" ? (
        <>
          <EncabezadoPaso titulo="¿Desde cuándo te sentís así?" descripcion="Última pregunta." />
          <div className="grid grid-cols-3 gap-3">
            {TARJETAS_DURACION.map((t) => (
              <TarjetaOpcion
                key={t.id}
                imagen={IMAGENES_DURACION[t.id]}
                etiqueta={t.etiqueta}
                seleccionada={duracion === t.id}
                onClick={() => setDuracion(t.id)}
              />
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" onClick={onTerminar}>
              <SkipForward size={16} weight="bold" />
              Saltar por ahora
            </Button>
            <Button type="button" onClick={() => void finalizar(duracion)} disabled={!duracion}>
              Ver resultado
              <ArrowRight size={16} weight="bold" />
            </Button>
          </div>
        </>
      ) : null}

      {paso === "resultado" && severidad ? (
        <Card variant="raised">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            {severidad === "emergencia" ? (
              <WarningCircle size={40} weight="fill" className="text-pastel-red-fg" />
            ) : (
              <CheckCircle size={40} weight="fill" className="text-pastel-green-fg" />
            )}
            <p className="text-base text-ink">{MENSAJE_SEVERIDAD[severidad]}</p>
            {condicionPosible ? (
              <div className="w-full rounded-tile border border-dashed border-line-strong bg-surface-sunken/60 p-4 text-left">
                <p className="text-sm font-semibold text-ink">{condicionPosible.nombre}</p>
                <p className="mt-1 text-sm text-ink-soft">{condicionPosible.descripcion}</p>
                <p className="mt-2 text-xs text-ink-muted">
                  Esto es solo una orientación a partir de lo que marcaste, no un diagnóstico. Tu odontólogo lo
                  va a confirmar con un examen real.
                </p>
              </div>
            ) : null}
            {guardando ? (
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <SpinnerGap size={16} className="animate-spin" /> Guardando tu respuesta…
              </p>
            ) : null}
            {error ? (
              <p className="flex items-center gap-2 text-sm text-pastel-red-fg">
                <WarningCircle size={16} weight="fill" /> {error}
              </p>
            ) : null}
            <Button type="button" onClick={onTerminar} disabled={guardando}>
              {textoBotonFinal}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
