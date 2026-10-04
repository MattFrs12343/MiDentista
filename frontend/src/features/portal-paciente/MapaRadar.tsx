import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface PuntoClinica {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
}

export interface MapaRadarProps {
  centro: { lat: number; lon: number };
  clinicas: PuntoClinica[];
  radioKm: number;
  clinicaSeleccionadaId?: string | null;
  onSeleccionarClinica?: (id: string) => void;
  className?: string;
}

/** Escapa el nombre de la clínica antes de meterlo en el HTML del tooltip. */
function escaparHtml(texto: string): string {
  return texto.replace(
    /[&<>"']/g,
    (caracter) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter] ?? caracter,
  );
}

/**
 * Mapa real (OpenStreetMap vía Leaflet, sin API key) centrado en la ubicación
 * del paciente, con un círculo de radio y un efecto de radar animado. Leaflet
 * se usa en modo "vanilla" (refs + efectos), no react-leaflet, para no arrastrar
 * problemas de peer deps y para controlar el overlay del radar a mano.
 */
export function MapaRadar({
  centro,
  clinicas,
  radioKm,
  clinicaSeleccionadaId = null,
  onSeleccionarClinica,
  className = "",
}: MapaRadarProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const radioRef = useRef<L.Circle | null>(null);
  const usuarioRef = useRef<L.CircleMarker | null>(null);
  const capaRef = useRef<L.LayerGroup | null>(null);

  // Refs para que los handlers de Leaflet lean siempre los valores actuales.
  const centroRef = useRef(centro);
  const radioKmRef = useRef(radioKm);

  const posicionarOverlay = () => {
    const mapa = mapaRef.current;
    const overlay = overlayRef.current;
    if (!mapa || !overlay) return;
    const { lat, lon } = centroRef.current;
    const punto = mapa.latLngToContainerPoint([lat, lon]);
    // Radio en píxeles: proyectamos un punto a `radioKm` al este y medimos.
    const deltaLon = radioKmRef.current / (111.32 * Math.cos((lat * Math.PI) / 180));
    const borde = mapa.latLngToContainerPoint([lat, lon + deltaLon]);
    const radioPx = Math.max(28, Math.hypot(borde.x - punto.x, borde.y - punto.y));
    const lado = Math.round(radioPx * 2);
    overlay.style.width = `${lado}px`;
    overlay.style.height = `${lado}px`;
    overlay.style.left = `${Math.round(punto.x)}px`;
    overlay.style.top = `${Math.round(punto.y)}px`;
  };

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    const mapa = L.map(contenedor, { attributionControl: true, zoomControl: true, minZoom: 2, maxZoom: 19 });
    mapaRef.current = mapa;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa);

    const { lat, lon } = centroRef.current;
    mapa.setView([lat, lon], 14);

    radioRef.current = L.circle([lat, lon], {
      radius: radioKmRef.current * 1000,
      color: "#2563eb",
      weight: 1.5,
      fillColor: "#60a5fa",
      fillOpacity: 0.12,
      interactive: false,
    }).addTo(mapa);

    usuarioRef.current = L.circleMarker([lat, lon], {
      radius: 7,
      color: "#ffffff",
      weight: 3,
      fillColor: "#2563eb",
      fillOpacity: 1,
      interactive: false,
    }).addTo(mapa);

    capaRef.current = L.layerGroup().addTo(mapa);

    const overlay = document.createElement("div");
    overlay.className = "mapa-radar__overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="radar-core"></div><div class="radar-sweep"></div>' +
      '<div class="radar-ring r1"></div><div class="radar-ring r2"></div><div class="radar-ring r3"></div>';
    contenedor.appendChild(overlay);
    overlayRef.current = overlay;
    posicionarOverlay();

    const alMover = () => posicionarOverlay();
    mapa.on("move zoom resize", alMover);

    const observador = new ResizeObserver(() => {
      mapa.invalidateSize();
      posicionarOverlay();
    });
    observador.observe(contenedor);

    return () => {
      observador.disconnect();
      mapa.off("move zoom resize", alMover);
      overlay.remove();
      overlayRef.current = null;
      mapa.remove();
      mapaRef.current = null;
      radioRef.current = null;
      usuarioRef.current = null;
      capaRef.current = null;
    };
  }, []);

  // Actualiza centro y radio del círculo, y sigue al usuario con el mapa.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !radioRef.current || !usuarioRef.current) return;
    centroRef.current = centro;
    radioKmRef.current = radioKm;
    const punto: [number, number] = [centro.lat, centro.lon];
    radioRef.current.setLatLng(punto).setRadius(radioKm * 1000);
    usuarioRef.current.setLatLng(punto);
    mapa.panTo(punto, { animate: true, duration: 0.3 });
    const temporizador = window.setTimeout(posicionarOverlay, 320);
    return () => window.clearTimeout(temporizador);
  }, [centro, radioKm]);

  // Dibuja (y redibuja) los marcadores de las clínicas.
  useEffect(() => {
    const capa = capaRef.current;
    if (!capa) return;
    capa.clearLayers();
    clinicas.forEach((clinica) => {
      const seleccionada = clinica.id === clinicaSeleccionadaId;
      L.circleMarker([clinica.lat, clinica.lon], {
        radius: seleccionada ? 11 : 8,
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
      className={`mapa-radar relative w-full overflow-hidden rounded-2xl border border-line bg-surface-sunken h-[320px] sm:h-[420px] ${className}`}
    >
      <div ref={contenedorRef} className="relative h-full w-full" />
      <style>{`
        .mapa-radar__overlay {
          position: absolute;
          z-index: 450;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .radar-core {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(96,165,250,0.95) 0%, rgba(96,165,250,0) 70%);
        }
        .radar-sweep {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          transform-origin: 50% 50%;
          background: conic-gradient(
            from 0deg,
            rgba(96,165,250,0) 0deg,
            rgba(96,165,250,0) 300deg,
            rgba(96,165,250,0.32) 355deg,
            rgba(96,165,250,0.5) 360deg
          );
          animation: radar-sweep 2.4s linear infinite;
        }
        .radar-ring {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 30%;
          height: 30%;
          border-radius: 9999px;
          border: 1.5px solid rgba(96,165,250,0.55);
          background: radial-gradient(circle, rgba(96,165,250,0.16) 0%, rgba(96,165,250,0) 70%);
          transform: translate(-50%, -50%) scale(0.3);
          opacity: 0;
          animation: radar-pulse 2.8s ease-out infinite;
        }
        .radar-ring.r2 { animation-delay: 0.9s; }
        .radar-ring.r3 { animation-delay: 1.8s; }
        @keyframes radar-sweep {
          to { transform: rotate(360deg); }
        }
        @keyframes radar-pulse {
          0%   { opacity: 0;   transform: translate(-50%, -50%) scale(0.3); }
          22%  { opacity: 0.9; }
          100% { opacity: 0;   transform: translate(-50%, -50%) scale(3.4); }
        }
        @media (prefers-reduced-motion: reduce) {
          .radar-sweep { animation: none; opacity: 0.28; }
          .radar-ring.r1, .radar-ring.r2, .radar-ring.r3 {
            animation: none;
            opacity: 0.18;
            transform: translate(-50%, -50%) scale(2);
          }
        }
        .mapa-radar .leaflet-container { font: inherit; }
        .mapa-radar .leaflet-popup-content-wrapper { border-radius: 0.75rem; }
        .mapa-radar .leaflet-tooltip { border-radius: 0.5rem; padding: 4px 8px; }
      `}</style>
    </div>
  );
}
