import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Crosshair, SpinnerGap } from "@phosphor-icons/react";
import "leaflet/dist/leaflet.css";

export interface PuntoClinica {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
}

export interface MapaHibridoProps {
  centro: { lat: number; lon: number } | null;
  clinicas: PuntoClinica[];
  radioKm: number;
  clinicaSeleccionadaId?: string | null;
  onSeleccionarClinica?: (id: string) => void;
  /** Mientras se busca la ubicación, el mapa muestra el efecto de bombeo. */
  locating?: boolean;
  /** Botón "Mi ubicación": recentra el mapa en el paciente. */
  onCentrarEnMiUbicacion?: () => void;
  className?: string;
}

export type CapaMapa = "plano" | "hibrido";

/**
 * Fuentes de tiles SIN API key. CARTO y Stadia ya piden clave, así que no se
 * usan: OpenStreetMap para el plano y Esri para el híbrido satelital.
 */
const CAPAS: Record<CapaMapa, { url: string; credito: string; etiquetas?: string }> = {
  plano: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    credito: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  hibrido: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    credito: "Imagen &copy; Esri, Maxar, Earthstar Geographics",
    etiquetas:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  },
};

function escaparHtml(texto: string): string {
  return texto.replace(
    /[&<>"']/g,
    (caracter) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter] ?? caracter,
  );
}

/**
 * Retardo de cada anillo del bombeo. Los tres anillos salen escalonados para
 * que el pulso parezca continuo en lugar de un solo círculo que se agranda.
 */
const RETARDOS_ANILLO_S = [0, 0.9, 1.8];

/**
 * Reubica el overlay de bombeo sobre el punto del paciente. Es un nodo HTML
 * suelto (no un layer de Leaflet), así que hay que recalcular sus píxeles cada
 * vez que el mapa se mueve, hace zoom o cambia de tamaño.
 */
function posicionarPulso(
  mapa: L.Map,
  overlay: HTMLDivElement | null,
  usuario: L.CircleMarker | null,
): void {
  if (!overlay) return;

  // Sin ubicación conocida el punto no está en el mapa: apartamos el overlay de
  // la vista en vez de dejar un halo flotando en el centro.
  if (!usuario || !mapa.hasLayer(usuario)) {
    overlay.style.transform = "translate3d(-9999px, -9999px, 0)";
    return;
  }

  const punto = mapa.latLngToContainerPoint(usuario.getLatLng());
  overlay.style.transform = `translate3d(${Math.round(punto.x)}px, ${Math.round(punto.y)}px, 0)`;
}

/**
 * Mapa 2D para buscar clínicas. Sin API key y sin 3D: el usuario elige entre
 * un plano de callejero (OpenStreetMap, con límites y etiquetas) y un híbrido
 * de imagen satelital con los límites geográficos superpuestos (Esri).
 * Leaflet se usa en modo "vanilla" (refs + efectos), sin react-leaflet.
 */
export function MapaHibrido({
  centro,
  clinicas,
  radioKm,
  clinicaSeleccionadaId = null,
  onSeleccionarClinica,
  locating = false,
  onCentrarEnMiUbicacion,
  className = "",
}: MapaHibridoProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const radioRef = useRef<L.Circle | null>(null);
  const usuarioRef = useRef<L.CircleMarker | null>(null);
  const capaRef = useRef<L.LayerGroup | null>(null);
  const baseRef = useRef<L.TileLayer | null>(null);
  const etiquetasRef = useRef<L.TileLayer | null>(null);
  const pulsoRef = useRef<HTMLDivElement | null>(null);

  const radioKmRef = useRef(radioKm);
  const [capa, setCapa] = useState<CapaMapa>("plano");

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    const mapa = L.map(contenedor, {
      attributionControl: true,
      zoomControl: true,
      minZoom: 2,
      maxZoom: 19,
    });
    mapaRef.current = mapa;

    baseRef.current = L.tileLayer(CAPAS[capa].url, {
      maxZoom: 19,
      attribution: CAPAS[capa].credito,
    }).addTo(mapa);

    // Sin ubicación del paciente mostramos Bolivia, que es donde están las
    // clínicas, para no arrancar en un punto arbitrario del mundo.
    const puntoInicial: [number, number] = centro ? [centro.lat, centro.lon] : [-17.2, -65.6];
    mapa.setView(puntoInicial, centro ? 14 : 6);

    radioRef.current = L.circle(puntoInicial, {
      radius: radioKmRef.current * 1000,
      color: "#2563eb",
      weight: 1,
      fillColor: "#3b82f6",
      fillOpacity: 0.08,
      interactive: false,
    }).addTo(mapa);

    // El punto del paciente solo existe cuando conocemos su ubicación.
    usuarioRef.current = L.circleMarker(puntoInicial, {
      radius: 7,
      color: "#ffffff",
      weight: 3,
      fillColor: "#2563eb",
      fillOpacity: 1,
      interactive: false,
    });
    if (centro) usuarioRef.current.addTo(mapa);

    capaRef.current = L.layerGroup().addTo(mapa);

    // El bombeo es un overlay HTML dentro del contenedor del mapa (igual que
    // los panes de Leaflet): los anillos se crean una sola vez y la animación
    // se activa/desactiva con una clase, no recreando nodos.
    const posicionar = () => posicionarPulso(mapa, pulsoRef.current, usuarioRef.current);
    mapa.on("move zoom resize", posicionar);
    posicionar();

    const observador = new ResizeObserver(() => {
      mapa.invalidateSize();
      posicionar();
    });
    observador.observe(contenedor);

    return () => {
      observador.disconnect();
      mapa.off("move zoom resize", posicionar);
      mapa.remove();
      mapaRef.current = null;
      radioRef.current = null;
      usuarioRef.current = null;
      capaRef.current = null;
      baseRef.current = null;
      etiquetasRef.current = null;
      pulsoRef.current = null;
    };
    // Solo al montar: el resto de cambios se resuelven en los efectos de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambia la fuente de tiles sin recrear el mapa.
  useEffect(() => {
    const mapa = mapaRef.current;
    const base = baseRef.current;
    if (!mapa || !base) return;

    base.setUrl(CAPAS[capa].url);
    base.options.attribution = CAPAS[capa].credito;

    const urlEtiquetas = CAPAS[capa].etiquetas;
    if (urlEtiquetas) {
      if (!etiquetasRef.current) {
        // Se agrega después de la base, así los límites y rótulos quedan por encima
        // de la imagen pero por debajo de los marcadores (overlayPane).
        etiquetasRef.current = L.tileLayer(urlEtiquetas, { maxZoom: 19 });
      } else {
        etiquetasRef.current.setUrl(urlEtiquetas);
      }
      if (!mapa.hasLayer(etiquetasRef.current)) etiquetasRef.current.addTo(mapa);
    } else if (etiquetasRef.current && mapa.hasLayer(etiquetasRef.current)) {
      mapa.removeLayer(etiquetasRef.current);
    }
  }, [capa]);

  // Actualiza centro/radio cuando cambian
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !radioRef.current || !usuarioRef.current) return;

    radioKmRef.current = radioKm;

    if (centro) {
      const punto: [number, number] = [centro.lat, centro.lon];
      radioRef.current.setLatLng(punto).setRadius(radioKm * 1000);
      usuarioRef.current.setLatLng(punto).addTo(mapa);
      mapa.panTo(punto, { animate: true, duration: 0.25 });
    } else {
      // Sin ubicación: sin círculo de radio y sin punto del paciente.
      radioRef.current.setRadius(0);
      mapa.removeLayer(usuarioRef.current);
    }

    // El punto pudo cambiar de lugar o desaparecer, así que el overlay de
    // bombeo se reancla (o se aparta) en la misma pasada.
    posicionarPulso(mapa, pulsoRef.current, usuarioRef.current);
  }, [centro, radioKm]);

  // Dibuja marcadores de clínicas
  useEffect(() => {
    const capa = capaRef.current;
    if (!capa) return;
    capa.clearLayers();

    clinicas.forEach((clinica) => {
      const seleccionada = clinica.id === clinicaSeleccionadaId;
      L.circleMarker([clinica.lat, clinica.lon], {
        radius: seleccionada ? 10 : 7,
        color: "#ffffff",
        weight: 2,
        fillColor: seleccionada ? "#0f172a" : "#0ea5e9",
        fillOpacity: 1,
      })
        .bindTooltip(escaparHtml(clinica.nombre), { direction: "top" })
        .on("click", () => onSeleccionarClinica?.(clinica.id))
        .addTo(capa);
    });
  }, [clinicas, clinicaSeleccionadaId, onSeleccionarClinica]);

  return (
    <div
      className={`mapa-hibrido relative w-full overflow-hidden rounded-2xl border border-line bg-surface-sunken h-[320px] sm:h-[420px] md:h-[480px] ${className}`}
    >
      <div ref={contenedorRef} className="relative h-full w-full">
        <div
          ref={pulsoRef}
          aria-hidden="true"
          className={`mapa-hibrido-pulso ${locating && centro ? "mapa-hibrido-pulso-activo" : ""}`}
        >
          {RETARDOS_ANILLO_S.map((retardo) => (
            <span
              key={retardo}
              className="mapa-hibrido-anillo"
              style={{ animationDelay: `${retardo}s` }}
            />
          ))}
        </div>
      </div>

      <div className="absolute right-2.5 top-2.5 z-[500] flex overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        {(["plano", "hibrido"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setCapa(id)}
            aria-pressed={capa === id}
            className={`px-2.5 py-1.5 text-xs font-medium capitalize transition-colors ${
              capa === id ? "bg-brand-600 text-white" : "bg-white text-ink-soft hover:bg-brand-50"
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      {onCentrarEnMiUbicacion ? (
        <button
          type="button"
          onClick={() => onCentrarEnMiUbicacion()}
          disabled={locating}
          aria-busy={locating}
          aria-label={locating ? "Buscando tu ubicación" : "Posicionarme en el mapa"}
          title={locating ? "Buscando tu ubicación" : "Posicionarme en el mapa"}
          className="absolute bottom-8 right-3 z-[500] flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-brand-700 shadow-md transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 disabled:cursor-progress disabled:opacity-90"
        >
          {locating ? (
            <SpinnerGap size={20} className="animate-spin" />
          ) : (
            <Crosshair size={20} weight="bold" />
          )}
        </button>
      ) : null}

      <style>{`
        .mapa-hibrido .leaflet-container { font: inherit; }
        .mapa-hibrido .leaflet-popup-content-wrapper { border-radius: 0.75rem; }
        .mapa-hibrido .leaflet-tooltip { border-radius: 0.5rem; padding: 4px 8px; }

        /* Efecto de bombeo: overlay HTML anclado al punto del paciente. */
        .mapa-hibrido-pulso {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 450;
          width: 0;
          height: 0;
          pointer-events: none;
          visibility: hidden;
          opacity: 0;
          transition: opacity 220ms ease-out;
        }
        .mapa-hibrido-pulso-activo {
          visibility: visible;
          opacity: 1;
        }
        .mapa-hibrido-anillo {
          position: absolute;
          top: 0;
          left: 0;
          display: block;
          width: 26px;
          height: 26px;
          margin: -13px 0 0 -13px;
          border: 2px solid #2f6a9a;
          border-radius: 9999px;
          opacity: 0;
        }
        .mapa-hibrido-pulso-activo .mapa-hibrido-anillo {
          animation: mapa-hibrido-bombeo 2.7s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
          animation-fill-mode: both;
        }
        @keyframes mapa-hibrido-bombeo {
          0%   { transform: scale(0.25); opacity: 0.55; }
          70%  { opacity: 0.18; }
          100% { transform: scale(4.2); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mapa-hibrido-pulso { transition: none; }
          .mapa-hibrido-pulso-activo .mapa-hibrido-anillo {
            animation: none;
            transform: scale(2.6);
            opacity: 0.22;
          }
        }
      `}</style>
    </div>
  );
}
