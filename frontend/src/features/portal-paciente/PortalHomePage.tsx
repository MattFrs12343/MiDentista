import { Navigate } from "react-router-dom";
import { useState } from "react";
import {
  CalendarBlank,
  CalendarPlus,
  ClipboardText,
  FileText,
  MapPin,
  Receipt,
  Tooth,
} from "@phosphor-icons/react";
import { SectionStatStrip, type SectionMetric } from "@/components/ui/section-board";
import { usePortalPaciente } from "@/features/portal-paciente/PortalPacienteContext";
import { CardAcceso } from "@/features/portal-paciente/CardAcceso";
import { PortalHero } from "@/features/portal-paciente/PortalHero";
import { PortalCargando, PortalError } from "@/features/portal-paciente/PortalEstado";
import { formatearFechaCorta, formatearHora, formatearMoneda } from "@/features/portal-paciente/portalFormato";

export function PortalHomePage() {
  const { ficha, cargando, error, recargar } = usePortalPaciente();

  /* `hoy` se lee una vez por montaje y antes de cualquier return temprano:
     `new Date()` durante el render es impuro (lo marca el linter), y el hook
     tiene que ejecutarse siempre o React se descuadra en el orden de hooks.
     El dia no cambia dentro de una sesion, asi que el valor es estable. */
  const [hoy] = useState(() => new Date().toISOString().slice(0, 10));

  if (cargando) return <PortalCargando />;
  if (error) return <PortalError mensaje={error} onReintentar={() => void recargar()} />;

  if (!ficha) return null;
  if (ficha.sinClinica) return <Navigate to="/portal/buscar" replace />;

  const proximaCita = ficha.citas
    .filter((c) => c.fechaCita >= hoy && (c.estado === "reservada" || c.estado === "confirmada"))
    .sort((a, b) => a.fechaCita.localeCompare(b.fechaCita))[0];

  /* Porcentaje ya pagado, para la barra de la tarjeta de pagos. Se calcula sobre
     pagado + pendiente y no sobre el total histórico: si el paciente pagó cinco
     treatments y no debe nada, la barra tiene que decir 100, no 40. Sin saldo
     pendiente la barra se marca completa explícitamente, porque `0` como avance
     se lee como "nunca pagó". El mínimo de 3% evita que una barra de 1px
     desaparezca en las pantallas de alta densidad. */
  const totalCuenta = ficha.resumen.totalPagado + ficha.resumen.saldoPendiente;
  const avancePago =
    ficha.resumen.saldoPendiente === 0
      ? 100
      : totalCuenta > 0
        ? Math.round((ficha.resumen.totalPagado / totalCuenta) * 100)
        : 0;

  /* La fila de métricas reemplaza a la tarjeta de tres cifras sueltas. El saldo
     es el número que el paciente busca de verdad, así que va primero y
     destacado; el resto acompaña en orden de importancia. */
  const metricas: SectionMetric[] = [
    {
      label: "Saldo pendiente",
      value: formatearMoneda(ficha.resumen.saldoPendiente),
      icon: Receipt,
      tone: ficha.resumen.saldoPendiente > 0 ? "orange" : "neutral",
      hint: ficha.resumen.saldoPendiente > 0 ? "Tenés saldo a pagar" : "Estás al día",
      destacado: true,
    },
    {
      label: "Próxima cita",
      value: proximaCita ? formatearFechaCorta(proximaCita.fechaCita) : "—",
      icon: CalendarBlank,
      tone: proximaCita ? "blue" : "neutral",
      hint: proximaCita ? formatearHora(proximaCita.horaInicio) : "No tenés citas próximas",
    },
    {
      label: "Evoluciones",
      value: ficha.evoluciones.length,
      icon: FileText,
      tone: "violet",
      hint: "Registros en tu historia",
    },
    {
      label: "Tratamientos",
      value: ficha.planes.length,
      icon: Tooth,
      tone: "teal",
      hint:
        ficha.diagnosticos.length > 0
          ? `${ficha.diagnosticos.length} diagnósticos`
          : "Sin diagnósticos",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PortalHero
        nombre={ficha.perfil.nombre}
        clinica={ficha.clinica?.nombre ?? null}
        ciudad={ficha.clinica?.ciudad ?? null}
        proximaCita={
          proximaCita
            ? {
                texto: `${formatearFechaCorta(proximaCita.fechaCita)} · ${formatearHora(proximaCita.horaInicio)}`,
              }
            : null
        }
        saldoPendiente={ficha.resumen.saldoPendiente}
      />

      <SectionStatStrip metrics={metricas} />

      {/* Accesos directos: lo único que hay bajo la fila de métricas. Antes de este
          bloque vivían aquí dos tarjetas de consulta ("Tu clínica" y "Resumen de
          tu atención") que repetían datos que ya están en el hero y en el
          strip, y ocupaban la pantalla de arriba del todo sin ofrecer ninguna
          acción. El nombre de la clínica y su ciudad ahora viajan en el subtítulo
          de la tarjeta "Cambiar de clínica", y las cifras van en el subtítulo de
          la tarjeta a la que corresponden. */}
      <section aria-labelledby="accesos" className="flex flex-col gap-3">
        <h2
          id="accesos"
          className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted"
        >
          ¿Qué querés hacer?
        </h2>
        {/* 3 columnas en escritorio con `auto-rows-fr`: todas las tarjetas de una
            fila miden lo mismo sin fijar alturas, así que el contenido más largo
            estira la fila y las demás se emparejan solas. Con `min-h` fijo
            quedaban altas y con aire sobrante. */}
        <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CardAcceso
            to="/portal/citas"
            icono={<CalendarPlus size={20} weight="duotone" />}
            titulo="Agendar cita"
            detalle={
              proximaCita
                ? `Tu próxima: ${formatearFechaCorta(proximaCita.fechaCita)}`
                : "Pedí una atención en tu clínica"
            }
            variante="cita"
            destacada
            badge={proximaCita ? undefined : "Principal"}
          />
          <CardAcceso
            to="/portal/odontograma"
            icono={<Tooth size={20} weight="duotone" />}
            titulo="Mi odontograma"
            detalle={
              ficha.diagnosticos.length > 0
                ? `${ficha.diagnosticos.length} diagnósticos · ${ficha.planes.length} tratamientos`
                : "Estado de cada pieza dental"
            }
            variante="odontograma"
          />
          <CardAcceso
            to="/portal/historia"
            icono={<ClipboardText size={20} weight="duotone" />}
            titulo="Mi historia"
            detalle={`${ficha.evoluciones.length} evoluciones registradas`}
            variante="historia"
          />
          <CardAcceso
            to="/portal/pagos"
            icono={<Receipt size={20} weight="duotone" />}
            titulo="Pagos y saldo"
            detalle={
              ficha.resumen.saldoPendiente > 0
                ? `${formatearMoneda(ficha.resumen.saldoPendiente)} pendientes`
                : `Al día · ${formatearMoneda(ficha.resumen.totalPagado)} pagado`
            }
            variante="pagos"
            avance={avancePago}
          />
          <CardAcceso
            to="/portal/evoluciones"
            icono={<CalendarBlank size={20} weight="duotone" />}
            titulo="Evoluciones"
            detalle="Consultas por fecha y pieza"
            variante="evoluciones"
          />
          <CardAcceso
            to="/portal/buscar"
            icono={<MapPin size={20} weight="duotone" />}
            titulo={ficha.clinica ? "Cambiar de clínica" : "Buscar clínica"}
            detalle={
              ficha.clinica
                ? `${ficha.clinica.nombre}${ficha.clinica.ciudad ? ` · ${ficha.clinica.ciudad}` : ""}`
                : "Elegí la clínica donde atenderte"
            }
            variante="clinica"
          />
        </div>
      </section>
    </div>
  );
}