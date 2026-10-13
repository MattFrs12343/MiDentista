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
  /** Resalta un pin al pasar el cursor: la lista y el mapa dejan de ser dos vistas aisladas. */
  onResaltarClinica?: (id: string | null) => void;
  /** Mientras se busca la ubicación, el mapa muestra el efecto de bombeo. */
  locating?: boolean;
  /** Botón "Mi ubicación": recentra el mapa en el paciente. */
  onCentrarEnMiUbicacion?: () => void;
  /** Clases de alto. Por defecto el recorte chico de siempre; la vista de
   * onboarding (sin header, mapa de punta a punta) pasa una más alta. */
  altura?: string;
  className?: string;
}

export type CapaMapa = "plano" | "hibrido";

/**
 * Azules del mapa, alineados con la rampa de marca.
 *
 * Leaflet dibuja en canvas y no puede leer tokens de CSS, así que estos valores
 * repiten los de `--color-brand-*` en `index.css`. Es la única forma de que el
 * mapa no se desincronice de la interfaz; si se cambia la marca, se cambian
 * los dos lados.
 */
const TONE_MARCA = {
  /** `--color-brand-500`: pines de clínica. */
  relleno: "#3d84b8",
  /** `--color-brand-600`: borde del radio de búsqueda. */
  borde: "#2f6a9a",
  /** `--color-brand-900`: clínica seleccionada y posición del paciente. */
  oscuro: "#142845",
} as const;

/**
 * Fuentes de tiles SIN API key, las dos en el mismo host de Esri.
 *
 * El plano probó primero el basemap raster clásico de CARTO (Voyager), pero
 * CARTO empezó a exigir clave también ahí: los tiles seguían devolviendo
 * `200 OK` con un PNG válido, así que un chequeo por código de estado no lo
 * detecta — el PNG en sí es el cartel "API KEY REQUIRED". Esri's "Light Gray
 * Canvas" da el mismo resultado (plano, colores atenuados, estilo app de
 * viajes) sin ese problema: es el mismo host y el mismo contrato REST que ya
 * usa el híbrido satelital, que sigue funcionando sin clave. Nativo hasta
 * zoom 16; pasado eso el servicio devuelve tiles en blanco, de ahí
 * `maxNativeZoom`.
 */
const CAPAS: Record<
  CapaMapa,
  { url: string; credito: string; etiquetas?: string; maxZoomNativo?: number }
> = {
  plano: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    credito: "&copy; Esri &mdash; Esri, HERE, Garmin, FAO, NOAA, USGS",
    etiquetas:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
    maxZoomNativo: 16,
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

/** Cuánto tarda la onda en crecer del centro al radio real antes de reiniciar. */
const DURACION_ONDA_MS = 2600;

/**
 * Arranca (o reinicia) el loop de la onda de radar sobre el círculo de
 * búsqueda: un anillo que crece de 0 al radio real y se desvanece, en bucle,
 * igual que el "buscando cerca tuyo" de una app de viajes. Cancela cualquier
 * loop anterior antes de arrancar uno nuevo, así un cambio de centro o de
 * radio no deja dos animaciones corriendo en paralelo.
 */
function animarOnda(
  ondaRef: { current: L.Circle | null },
  frameRef: { current: number | null },
  punto: L.LatLngExpression,
  radioMetros: number,
): void {
  if (frameRef.current !== null) {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }

  const onda = ondaRef.current;
  if (!onda) return;

  onda.setLatLng(punto);

  if (radioMetros <= 0) {
    onda.setRadius(0).setStyle({ opacity: 0, fillOpacity: 0 });
    return;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // Sin animación: un anillo fijo a mitad de camino, para no perder la
    // señal de "esta es el área de búsqueda" sin depender del movimiento.
    onda.setRadius(radioMetros * 0.55).setStyle({ opacity: 0.22, fillOpacity: 0.05 });
    return;
  }

  let inicio: number | null = null;
  const paso = (marca: number) => {
    if (inicio === null) inicio = marca;
    const progreso = ((marca - inicio) % DURACION_ONDA_MS) / DURACION_ONDA_MS;
    const desvanecido = 1 - progreso;
    onda.setRadius(progreso * radioMetros).setStyle({
      opacity: desvanecido * 0.5,
      fillOpacity: desvanecido * 0.12,
    });
    frameRef.current = requestAnimationFrame(paso);
  };
  frameRef.current = requestAnimationFrame(paso);
}

/**
 * Mapa 2D para buscar clínicas. Sin API key y sin 3D: el usuario elige entre
 * un plano de callejero estilo "app de viajes" (Esri Light Gray Canvas,
 * colores atenuados y legibles en pantallas chicas) y un híbrido de imagen
 * satelital con los límites geográficos superpuestos (también Esri).
 * Leaflet se usa en modo "vanilla" (refs + efectos), sin react-leaflet.
 */
export function MapaHibrido({
  centro,
  clinicas,
  radioKm,
  clinicaSeleccionadaId = null,
  onSeleccionarClinica,
  onResaltarClinica,
  locating = false,
  onCentrarEnMiUbicacion,
  altura = "h-[320px] sm:h-[420px] md:h-[480px]",
  className = "",
}: MapaHibridoProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const radioRef = useRef<L.Circle | null>(null);
  const ondaRef = useRef<L.Circle | null>(null);
  const ondaFrameRef = useRef<number | null>(null);
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
      // Sin botones +/-: igual que las apps de viajes en el celular, el mapa
      // se maneja a pellizcos y con doble tap. Sin ellos el mobile queda
      // limpio y los controles propios (capas, ubicarme) no compiten por
      // espacio con la cruz de zoom de Leaflet.
      zoomControl: false,
      minZoom: 2,
      maxZoom: 19,
    });
    mapaRef.current = mapa;
    // La atribución por defecto va abajo a la derecha, el mismo rincón que
    // "ubicarme": se mueve a la izquierda para que no se pisen.
    mapa.attributionControl.setPosition("bottomleft");

    baseRef.current = L.tileLayer(CAPAS[capa].url, {
      maxZoom: 19,
      maxNativeZoom: CAPAS[capa].maxZoomNativo,
      attribution: CAPAS[capa].credito,
    }).addTo(mapa);

    // Sin ubicación del paciente mostramos Bolivia, que es donde están las
    // clínicas, para no arrancar en un punto arbitrario del mundo.
    const puntoInicial: [number, number] = centro ? [centro.lat, centro.lon] : [-17.2, -65.6];
    mapa.setView(puntoInicial, centro ? 14 : 6);

    /* Leaflet dibuja en canvas y no puede leer tokens de CSS, asi que el radio
       de búsqueda lleva los mismos valores que `--color-brand-*` en
       `index.css`. `#2563eb` / `#3b82f6` eran el azul genérico de otra
       librería y se veían más saturados que el resto de la interfaz. */
    radioRef.current = L.circle(puntoInicial, {
      radius: radioKmRef.current * 1000,
      color: TONE_MARCA.borde,
      weight: 1,
      fillColor: TONE_MARCA.relleno,
      fillOpacity: 0.1,
      interactive: false,
      className: "mapa-hibrido-radio",
    }).addTo(mapa);

    /* Onda de radar, al estilo "buscando cerca tuyo" de las apps de viajes:
       un círculo propio que crece de 0 hasta el radio real y se desvanece, en
       loop. Es un layer de Leaflet con radio geográfico (no un overlay HTML
       como el bombeo del punto del paciente), a propósito: así, al hacer zoom
       o pan a mitad de la animación, sigue representando el área real en vez
       de desalinearse como lo haría una animación en píxeles. */
    ondaRef.current = L.circle(puntoInicial, {
      radius: 0,
      color: TONE_MARCA.borde,
      weight: 1.5,
      fillColor: TONE_MARCA.relleno,
      fillOpacity: 0,
      opacity: 0,
      interactive: false,
      className: "mapa-hibrido-onda",
    }).addTo(mapa);

    // El punto del paciente solo existe cuando conocemos su ubicación. Va en
    // `brand-700` (no en el azul claro de los pines) para que "yo" y "las
    // clínicas" no se confundan: el paciente es el punto de referencia, no una
    // clínica más.
    usuarioRef.current = L.circleMarker(puntoInicial, {
      radius: 7,
      color: "#ffffff",
      weight: 3,
      fillColor: TONE_MARCA.oscuro,
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
      if (ondaFrameRef.current !== null) cancelAnimationFrame(ondaFrameRef.current);
      mapa.remove();
      mapaRef.current = null;
      radioRef.current = null;
      ondaRef.current = null;
      ondaFrameRef.current = null;
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
    // `setUrl` solo cambia la plantilla de URL: `maxNativeZoom` hay que
    // pisarlo a mano en las opciones (Leaflet lo relee en cada tile), si no
    // la capa que sí tiene zoom nativo completo (el satelital) se queda con
    // el límite de 16 que necesita el plano.
    base.options.maxNativeZoom = CAPAS[capa].maxZoomNativo;

    const urlEtiquetas = CAPAS[capa].etiquetas;
    if (urlEtiquetas) {
      if (!etiquetasRef.current) {
        // Se agrega después de la base, así los límites y rótulos quedan por encima
        // de la imagen pero por debajo de los marcadores (overlayPane).
        etiquetasRef.current = L.tileLayer(urlEtiquetas, {
          maxZoom: 19,
          maxNativeZoom: CAPAS[capa].maxZoomNativo,
        });
      } else {
        etiquetasRef.current.setUrl(urlEtiquetas);
        etiquetasRef.current.options.maxNativeZoom = CAPAS[capa].maxZoomNativo;
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
      animarOnda(ondaRef, ondaFrameRef, punto, radioKm * 1000);
    } else {
      // Sin ubicación: sin círculo de radio, sin punto del paciente y sin onda.
      radioRef.current.setRadius(0);
      mapa.removeLayer(usuarioRef.current);
      animarOnda(ondaRef, ondaFrameRef, radioRef.current.getLatLng(), 0);
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
      /* El pin es la superficie mas saturada del mapa y tiene que salir del mismo
         azul que el resto de la app. La seleccionada se distingue por relleno
         oscuro Y por radio (10 contra 7), para que se lea sin depender del
         color. */
      L.circleMarker([clinica.lat, clinica.lon], {
        radius: seleccionada ? 10 : 7,
        color: "#ffffff",
        weight: 2,
        fillColor: seleccionada ? TONE_MARCA.oscuro : TONE_MARCA.relleno,
        fillOpacity: 1,
      })
        .bindTooltip(escaparHtml(clinica.nombre), { direction: "top" })
        /* El `mouseover` resalta la tarjeta de la lista: con mapa y lista en la
           misma pantalla, el pin dice "esta" y la tarjeta dice "aquí". Sin esto
           el paciente tiene que recordar cuál era. */
        .on("mouseover", () => onResaltarClinica?.(clinica.id))
        .on("mouseout", () => onResaltarClinica?.(null))
        .on("click", () => onSeleccionarClinica?.(clinica.id))
        .addTo(capa);
    });
  }, [clinicas, clinicaSeleccionadaId, onSeleccionarClinica, onResaltarClinica]);

  return (
    // `isolate`: los controles propios (selector de capas, "ubicarme") usan
    // z-index altos (500+) para ganarle a los panes internos de Leaflet, que
    // también llegan a esos valores. Sin `isolate` ese z-index no queda
    // contenido acá adentro — compite directo contra el resto de la app (p.
    // ej. la barra de herramientas del portal, z-50) y le gana aunque esté
    // muy por debajo en el documento, pintándose encima de ella.
    <div
      className={`mapa-hibrido relative isolate w-full overflow-hidden rounded-2xl border border-line bg-surface-sunken ${altura} ${capa === "plano" ? "mapa-hibrido-plano" : ""} ${className}`}
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

      {/* Pill flotante estilo app de viajes: opaca, sombra amplia, sin bordes
          duros. 44px de alto por segmento para que el pulgar no falle. */}
      <div className="absolute right-3 top-3 z-[500] flex overflow-hidden rounded-full bg-surface shadow-e2">
        {(["plano", "hibrido"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setCapa(id)}
            aria-pressed={capa === id}
            className={`min-h-11 px-4 text-xs font-semibold capitalize transition-colors ${
              capa === id ? "bg-brand-600 text-white" : "bg-surface text-ink-soft hover:bg-surface-sunken"
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
          className="absolute bottom-3 right-3 z-[500] flex size-12 items-center justify-center rounded-full bg-surface text-brand-700 shadow-e2 transition-transform duration-150 ease-out hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 active:scale-90 disabled:cursor-progress disabled:opacity-90"
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

        /* El Light Gray Canvas de Esri es gris neutro de fábrica. Un filtro
           le da el mismo tinte cálido que el resto de la app (el canvas de
           fondo es un blanco cálido, no un gris frío): nunca toca el
           satelital ("hibrido"), que necesita sus colores reales. Valores
           suaves a propósito: es un filtro de CSS a ciegas sobre tiles de
           terceros, no un estilo propio, así que no busca un tinte fuerte. */
        .mapa-hibrido-plano .leaflet-tile-pane {
          filter: sepia(22%) saturate(130%) brightness(1.01);
        }

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
          border: 2px solid var(--color-brand-600);
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
