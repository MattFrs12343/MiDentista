import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Buildings,
  CheckCircle,
  Crosshair,
  FloppyDisk,
  ListBullets,
  MagnifyingGlass,
  MapPin,
  MapTrifold,
  NavigationArrow,
  Phone,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SectionToolbar } from "@/components/ui/section-board";
import { cn } from "@/lib/cn";
import { useAuth } from "@/features/auth/AuthContext";
import { usePortalPaciente } from "@/features/portal-paciente/PortalPacienteContext";
import { distanciaKm } from "@/features/portal-paciente/haversine";
import { generarClinicasDemo } from "@/features/portal-paciente/clinicasDemo";
import { MapaHibrido } from "@/features/portal-paciente/MapaHibrido";
import { PortalSubHeader } from "@/features/portal-paciente/PortalHero";
import {
  ApiError,
  afiliarPacientePortalApi,
  listarClinicas,
  type Clinica,
  type DatosAfiliacion,
} from "@/data/api";

const RADIO_KM = 5;
/** Espera antes de filtrar mientras el paciente escribe, en milisegundos. */
const DEMORA_BUSQUEDA_MS = 250;

interface Ubicacion {
  lat: number;
  lon: number;
}

interface ClinicaConDistancia {
  clinica: Clinica;
  distancia: number | null;
  /** Las clínicas de demostración no se pueden afiliar: son ficticias. */
  demo?: boolean;
}

export function BuscarClinicaPage() {
  const navigate = useNavigate();
  const { refrescarSesion } = useAuth();
  const { ficha, cargando: cargandoFicha, recargar } = usePortalPaciente();

  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [estadoUbicacion, setEstadoUbicacion] = useState<"inactiva" | "buscando" | "activa" | "error">("inactiva");
  const [seleccionada, setSeleccionada] = useState<Clinica | null>(null);
  const [haBuscado, setHaBuscado] = useState(false);
  const [vista, setVista] = useState<"lista" | "mapa">("mapa");
  /** Texto ya diferido: es el que realmente filtra, para no filtrar en cada tecla. */
  const [termino, setTermino] = useState("");
  /** Clínica resaltada: la que el paciente está mirando en el mapa. */
  const [idEnfocada, setIdEnfocada] = useState<string | null>(null);

  const yaAfiliado = ficha?.clinica ?? null;

  useEffect(() => {
    let activo = true;
    listarClinicas()
      .then((datos) => {
        if (activo) setClinicas(datos);
      })
      .catch((fallo) => {
        if (activo) setError(fallo instanceof ApiError ? fallo.message : "No se pudieron cargar las clínicas");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const pedirUbicacion = () => {
    if (!navigator.geolocation) {
      setEstadoUbicacion("error");
      return;
    }
    setEstadoUbicacion("buscando");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacion({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setEstadoUbicacion("activa");
        setHaBuscado(true);
        setVista("mapa");
      },
      () => setEstadoUbicacion("error"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  // Diferimos el término para que la búsqueda sea "en vivo" sin filtrar en cada tecla.
  useEffect(() => {
    const espera = window.setTimeout(() => setTermino(texto.trim().toLowerCase()), DEMORA_BUSQUEDA_MS);
    return () => window.clearTimeout(espera);
  }, [texto]);

  const resultados = useMemo<ClinicaConDistancia[]>(() => {
    // No mostrar resultados hasta que el usuario haya buscado explícitamente
    if (!haBuscado) return [];

    const conDistancia: ClinicaConDistancia[] = clinicas
      .filter((c) => {
        if (!termino) return true;
        return (
          c.nombre.toLowerCase().includes(termino) ||
          (c.ciudad ?? "").toLowerCase().includes(termino)
        );
      })
      .map((clinica) => {
        const tieneCoords = clinica.latitud != null && clinica.longitud != null;
        const distancia =
          ubicacion && tieneCoords
            ? distanciaKm(ubicacion.lat, ubicacion.lon, clinica.latitud!, clinica.longitud!)
            : null;
        return { clinica, distancia };
      });

    if (ubicacion) {
      return conDistancia
        .filter((c) => c.distancia != null && c.distancia <= RADIO_KM)
        .sort((a, b) => (a.distancia ?? 0) - (b.distancia ?? 0));
    }
    return conDistancia;
  }, [clinicas, termino, ubicacion, haBuscado]);

  /**
   * Si la búsqueda por cercanía no arroja nada (casi siempre en desarrollo: las
   * clínicas reales están en La Paz, Cochabamba y Santa Cruz), mostramos un
   * conjunto de clínicas de demostración alrededor del paciente para que se
   * puedan probar el filtro, el mapa y la lista.
   */
  const demo = useMemo<ClinicaConDistancia[]>(() => {
    const conCoords = clinicas.find((c) => c.latitud != null && c.longitud != null);
    const centro = ubicacion ??
      (conCoords ? { lat: conCoords.latitud as number, lon: conCoords.longitud as number } : null);
    if (!centro) return [];

    return generarClinicasDemo(centro, RADIO_KM).map((c) => ({
      clinica: {
        id: c.id,
        nombre: c.nombre,
        slug: "",
        ciudad: c.ciudad,
        pais: "Bolivia",
        email: null,
        telefono: c.telefono,
        direccion: c.direccion,
        latitud: c.latitud,
        longitud: c.longitud,
      },
      distancia: distanciaKm(centro.lat, centro.lon, c.latitud, c.longitud),
      demo: true,
    }));
  }, [clinicas, ubicacion]);

  /** Lo que se muestra: las reales si las hay; si no, las de demostración.
   * La demo solo entra en la búsqueda por cercanía, nunca cuando el paciente
   * escribe un nombre que no coincide con nada. */
  const visibles = useMemo<ClinicaConDistancia[]>(() => {
    if (resultados.length > 0) return resultados;
    if (haBuscado && !termino) return demo;
    return resultados;
  }, [resultados, demo, haBuscado, termino]);

  /**
   * Distancia de la clínica enfocada a la más cercana realmente disponible.
   *
   * El filtro por cercanía recorta a `RADIO_KM`, así que el radio del mapa no
   * siempre corresponde a lo que hay alrededor. Resolver el vecino mas próximo
   * del set actual evita que el círculo sugiera un radio de búsqueda distinto
   * al que el paciente está viendo.
   */
  const alcanceEfectivo = useMemo(() => {
    if (!visibles.length) return RADIO_KM;
    const conDistancia = visibles
      .map((r) => r.distancia)
      .filter((d): d is number => d != null);
    if (!conDistancia.length) return RADIO_KM;
    return Math.min(RADIO_KM, Math.ceil(Math.max(...conDistancia)));
  }, [visibles]);

  // Centro del mapa: la ubicación del paciente si la hay; si no, el primer
  // resultado con coordenadas. `useMemo` mantiene estable la identidad del
  // objeto para no re-disparar los efectos del mapa en cada render.
  const centroMapa = useMemo(() => {
    if (ubicacion) return { lat: ubicacion.lat, lon: ubicacion.lon };
    const conCoords = visibles.find((r) => r.clinica.latitud != null);
    if (conCoords) return { lat: conCoords.clinica.latitud as number, lon: conCoords.clinica.longitud as number };
    const conCoordsClinicas = clinicas.find((c) => c.latitud != null && c.longitud != null);
    return conCoordsClinicas ? { lat: conCoordsClinicas.latitud as number, lon: conCoordsClinicas.longitud as number } : null;
  }, [ubicacion, visibles, clinicas]);

  const clinicasMapa = useMemo(
    () =>
      visibles
        .filter((r) => r.clinica.latitud != null && r.clinica.longitud != null)
        .map((r) => ({
          id: r.clinica.id,
          nombre: r.clinica.nombre,
          lat: r.clinica.latitud as number,
          lon: r.clinica.longitud as number,
        })),
    [visibles],
  );

  /* Al tocar un pin del mapa solo se resalta la tarjeta; el alta se sigue
     haciendo con un botón explícito. Abrir el diálogo desde un pin hacía que un
     toque perdido (dedo gordo, mapa con scroll) dejara el formulario de
     afiliación abierto sobre el mapa sin haberlo pedido. */
  const seleccionarDesdeMapa = useCallback(
    (id: string) => {
      setIdEnfocada(id);
      if (yaAfiliado) return;
      // Las clínicas de demostración no existen en la base: no se pueden afiliar.
      if (id.startsWith("demo-")) return;
      const clinica = clinicas.find((c) => c.id === id);
      if (clinica) setSeleccionada(clinica);
    },
    [clinicas, yaAfiliado],
  );

  /* Al cambiar de vista se limpia el enfoque: si no, la tarjeta bordering
     queda resaltada en un sitio donde el paciente no la está viendo. */
  useEffect(() => {
    setIdEnfocada(null);
  }, [vista]);

  if (cargandoFicha) {
    return (
      <div className="flex items-center justify-center py-20">
        <SpinnerGap size={26} className="animate-spin text-ink-soft" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PortalSubHeader
        icono={MapPin}
        titulo="Buscar clínica"
        descripcion="Buscá por nombre o activá tu ubicación para ver las clínicas cercanas."
        seccion="clinica"
      />

      {/* Aviso informativo, no estado de éxito: el azul de marca es el lenguaje
          neutro del portal. Pintarlo de verde sumaba un tono ajeno sin decir nada
          que el título no dijera ya. */}
      {yaAfiliado ? (
        <Card variant="flat" tone="brand" accent>
          <CardContent className="flex items-center gap-3 p-4 text-brand-700">
            <CheckCircle size={22} weight="fill" className="shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">Ya estás afiliado a {yaAfiliado.nombre}</p>
              <p className="text-brand-600">
                Por ahora una cuenta de paciente pertenece a una sola clínica.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <Input
            value={texto}
            onChange={(e) => {
              const valor = e.target.value;
              setTexto(valor);
              // Escribir ya cuenta como buscar: no hace falta apretar el botón.
              if (valor.trim()) setHaBuscado(true);
            }}
            placeholder="Nombre de la clínica o ciudad"
            className="bg-white pl-10"
            aria-label="Buscar clínica por nombre o ciudad"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button type="button" onClick={() => setHaBuscado(true)} className="shrink-0">
            <MagnifyingGlass size={16} weight="bold" />
            Buscar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={pedirUbicacion}
            disabled={estadoUbicacion === "buscando"}
            className="shrink-0"
          >
            {estadoUbicacion === "buscando" ? (
              <SpinnerGap size={16} className="animate-spin" />
            ) : (
              <Crosshair size={16} weight="bold" />
            )}
            {ubicacion ? `${RADIO_KM} km a la redonda` : "Usar mi ubicación"}
          </Button>
        </div>
      </div>

      {estadoUbicacion === "error" ? (
        <p className="flex items-center gap-2 text-sm text-pastel-red-fg">
          <WarningCircle size={16} weight="fill" /> No pudimos obtener tu ubicación. Buscá por nombre.
        </p>
      ) : null}

      {estadoUbicacion === "buscando" ? (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <SpinnerGap size={16} className="animate-spin" /> Buscando tu ubicación…
        </p>
      ) : null}

      {!haBuscado ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
            <MagnifyingGlass size={28} weight="duotone" className="text-ink-muted" />
            <p className="text-sm font-semibold text-ink">Todavía no buscaste</p>
            <p className="text-sm text-ink-soft">
              Escribí el nombre de una clínica y presioná <strong>Buscar</strong>, o usá tu ubicación para
              ver las clínicas a menos de {RADIO_KM} km.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {haBuscado ? (
        <SectionToolbar className="justify-between">
          <p className="min-w-0 truncate text-sm text-ink-soft">
            {cargando
              ? "Buscando clínicas…"
              : `${visibles.length} ${visibles.length === 1 ? "clínica" : "clínicas"} encontrada${
                  visibles.length === 1 ? "" : "s"
                }${
                  ubicacion
                    ? ` · buscando en un radio de ${alcanceEfectivo} km`
                    : ""
                }`}
          </p>
          {/* `SegmentedControl` y no dos botones: el estado activo se lee por
              relleno, no solo por color, así que no depende del color para
              comunicar cuál de las dos vistas está activa. */}
          <div
            role="tablist"
            aria-label="Elegir vista"
            className="flex shrink-0 gap-0.5 rounded-full bg-surface-sunken p-1"
          >
            {(["mapa", "lista"] as const).map((opcion) => (
              <button
                key={opcion}
                type="button"
                role="tab"
                aria-selected={vista === opcion}
                onClick={() => setVista(opcion)}
                className={cn(
                  "press inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
                  vista === opcion
                    ? "bg-surface text-ink shadow-e1"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {opcion === "mapa" ? <MapTrifold size={15} weight="duotone" /> : null}
                {opcion === "lista" ? <ListBullets size={15} weight="duotone" /> : null}
                {opcion === "mapa" ? "Mapa" : "Lista"}
              </button>
            ))}
          </div>
        </SectionToolbar>
      ) : null}

      {haBuscado && vista === "mapa" ? (
        cargando ? (
          <div className="flex items-center justify-center rounded-2xl border border-line bg-surface-sunken py-16">
            <SpinnerGap size={24} className="animate-spin text-ink-soft" />
          </div>
        ) : (
          <MapaHibrido
            centro={centroMapa}
            clinicas={clinicasMapa}
            /* `alcanceEfectivo` y no el radio fijo: el filtro recorta a
               `RADIO_KM`, asi que el circulo dibujado puede ser mayor que el
               area con resultados y sugerir un alcance que no existe. */
            radioKm={alcanceEfectivo}
            clinicaSeleccionadaId={seleccionada?.id ?? null}
            onSeleccionarClinica={seleccionarDesdeMapa}
            onResaltarClinica={setIdEnfocada}
            locating={estadoUbicacion === "buscando"}
            onCentrarEnMiUbicacion={pedirUbicacion}
          />
        )
      ) : null}

      {haBuscado && visibles.length > 0 && visibles.every((r) => r.demo) ? (
        <p className="flex items-start gap-2 rounded-tile border border-dashed border-brand-600/30 bg-brand-50 p-3 text-sm text-ink-soft">
          <FloppyDisk size={16} weight="duotone" className="mt-0.5 shrink-0 text-brand-600" />
          <span>
            <strong className="text-ink">Datos de demostración.</strong> No hay clínicas registradas a
            menos de {RADIO_KM} km de tu posición, así que te mostramos clínicas ficticias para que puedas
            probar la búsqueda y el mapa. No se pueden afiliar.
          </span>
        </p>
      ) : null}

      {haBuscado && vista === "lista" ? (
        cargando ? (
          <div className="flex items-center justify-center py-16">
            <SpinnerGap size={24} className="animate-spin text-ink-soft" />
          </div>
        ) : error ? (
          <p className="flex items-center gap-2 text-sm text-pastel-red-fg">
            <WarningCircle size={16} weight="fill" /> {error}
          </p>
        ) : visibles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <Buildings size={28} weight="duotone" className="text-ink-muted" />
              <p className="text-sm text-ink-soft">
                {ubicacion
                  ? `No hay clínicas dentro de ${RADIO_KM} km. Probá sin usar la ubicación.`
                  : "No encontramos clínicas con ese criterio."}
              </p>
              {/* Salida del atasco: sin esto el paciente queda mirando un
                  vacío sin forma de seguir buscando. */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => {
                  if (ubicacion) {
                    setUbicacion(null);
                    setEstadoUbicacion("inactiva");
                  }
                  setTexto("");
                  setTermino("");
                  setHaBuscado(false);
                }}
              >
                {ubicacion ? "Buscar sin ubicación" : "Limpiar búsqueda"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
          {visibles.map(({ clinica, distancia, demo: esDemo }) => (
            /* `tone` sigue la cercanía: la clínica a la que el paciente realmente puede
       ir es la de menos kilómetros, y el acento lo dice antes de leer el número.
       `accent` marca además cuál está enfocada en el mapa, para que al pasar
       de la vista mapa a la lista se sepa dónde estabas mirando. */
          <Card
              key={clinica.id}
              variant={idEnfocada === clinica.id ? "overlay" : "raised"}
              accent
              className={cn(
                esDemo && "border-dashed",
                distancia != null &&
                  distancia <= 1 &&
                  "border-brand-300 bg-brand-50",
                distancia != null && distancia > 1 && distancia <= 3 && "border-brand-200",
              )}
            >
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold break-words text-ink">{clinica.nombre}</h3>
                    {clinica.ciudad ? (
                      <p className="mt-0.5 flex items-center gap-1 text-sm break-words text-ink-muted">
                        <MapPin size={14} weight="duotone" className="shrink-0" />{" "}
                        <span className="break-words">{clinica.ciudad}</span>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {distancia != null ? (
                      <Badge tone={distancia <= 1 ? "blue" : "neutral"}>
                        {distancia.toFixed(1)} km
                      </Badge>
                    ) : null}
                    {esDemo ? <Badge tone="yellow">Demo</Badge> : null}
                  </div>
                </div>

                {clinica.direccion ? (
                  <p className="text-sm break-words text-ink-soft">{clinica.direccion}</p>
                ) : null}
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
                  {clinica.telefono ? (
                    <a
                      href={`tel:${clinica.telefono.replace(/\s/g, "")}`}
                      className="press inline-flex min-h-9 items-center gap-1.5 text-sm text-ink-soft hover:text-brand-600"
                    >
                      <Phone size={14} weight="duotone" className="shrink-0" />
                      {clinica.telefono}
                    </a>
                  ) : null}
                  {/* Ir por calle: `geo:` con destino. Solo cuando hay
                      coordenadas; sin ellas el botón no llevaría a ningún lado. */}
                  {clinica.latitud != null && clinica.longitud != null ? (
                    <a
                      href={`geo:${clinica.latitud},${clinica.longitud}?q=${encodeURIComponent(clinica.nombre)}`}
                      className="press inline-flex min-h-9 items-center gap-1.5 text-sm text-ink-soft hover:text-brand-600"
                    >
                      <NavigationArrow size={14} weight="duotone" className="shrink-0" />
                      Cómo llegar
                    </a>
                  ) : null}
                </div>

                <div className="mt-2 pt-1">
                  <Button
                    type="button"
                    className="w-full"
                    disabled={Boolean(yaAfiliado) || Boolean(esDemo)}
                    onClick={() => setSeleccionada(clinica)}
                  >
                    {esDemo ? (
                      <>
                        <FloppyDisk size={16} /> Datos de demostración
                      </>
                    ) : yaAfiliado ? (
                      "Ya estás afiliado"
                    ) : (
                      "Afiliarme"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        )
      ) : null}

      {seleccionada ? (
        <DialogAfiliacion
          clinica={seleccionada}
          datosIniciales={{
            nombreCompleto: ficha?.perfil.nombre ?? "",
            telefono: ficha?.perfil.telefono ?? "",
          }}
          onCerrar={() => setSeleccionada(null)}
          onExito={async () => {
            await refrescarSesion();
            await recargar();
            navigate("/portal", { replace: true });
          }}
        />
      ) : null}
    </div>
  );
}

function DialogAfiliacion({
  clinica,
  datosIniciales,
  onCerrar,
  onExito,
}: {
  clinica: Clinica;
  datosIniciales: { nombreCompleto: string; telefono: string };
  onCerrar: () => void;
  onExito: () => Promise<void>;
}) {
  const [datos, setDatos] = useState<DatosAfiliacion>({
    nombreCompleto: datosIniciales.nombreCompleto,
    telefono: datosIniciales.telefono,
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actualizar = (campo: keyof DatosAfiliacion, valor: string) =>
    setDatos((previos) => ({ ...previos, [campo]: valor }));

  const enviar = async () => {
    if (enviando) return;
    if (!datos.nombreCompleto.trim()) {
      setError("El nombre completo es obligatorio");
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      await afiliarPacientePortalApi(clinica.id, {
        ...datos,
        nombreCompleto: datos.nombreCompleto.trim(),
        telefono: datos.telefono?.trim() || undefined,
      });
      await onExito();
    } catch (fallo) {
      setError(fallo instanceof ApiError ? fallo.message : "No se pudo completar la afiliación");
      setEnviando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(abierto) => (abierto ? undefined : onCerrar())}>
      <DialogContent
        title={`Afiliarme a ${clinica.nombre}`}
        description="Estos datos son los que verá la clínica para tu atención."
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void enviar();
          }}
        >
          <Field label="Nombre completo" htmlFor="af-nombre">
            <Input
              id="af-nombre"
              required
              value={datos.nombreCompleto}
              onChange={(e) => actualizar("nombreCompleto", e.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cédula de identidad" htmlFor="af-ci">
              <Input id="af-ci" value={datos.ci ?? ""} onChange={(e) => actualizar("ci", e.target.value)} />
            </Field>
            <Field label="Fecha de nacimiento" htmlFor="af-fecha">
              <Input
                id="af-fecha"
                type="date"
                value={datos.fechaNacimiento ?? ""}
                onChange={(e) => actualizar("fechaNacimiento", e.target.value)}
              />
            </Field>
            <Field label="Género" htmlFor="af-genero">
              <select
                id="af-genero"
                value={datos.genero ?? ""}
                onChange={(e) => actualizar("genero", e.target.value)}
                className="h-11 w-full rounded-tile border border-line bg-white px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <option value="">Sin especificar</option>
                <option value="F">Femenino</option>
                <option value="M">Masculino</option>
                <option value="Otro">Otro</option>
              </select>
            </Field>
            <Field label="Teléfono" htmlFor="af-telefono">
              <Input
                id="af-telefono"
                type="tel"
                value={datos.telefono ?? ""}
                onChange={(e) => actualizar("telefono", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Dirección" htmlFor="af-direccion">
            <Input id="af-direccion" value={datos.direccion ?? ""} onChange={(e) => actualizar("direccion", e.target.value)} />
          </Field>

          <fieldset className="rounded-2xl border border-line p-4">
            <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Contacto de emergencia
            </legend>
            <div className="grid gap-4">
              <Field label="Nombre" htmlFor="af-em-nombre">
                <Input
                  id="af-em-nombre"
                  value={datos.contactoEmergenciaNombre ?? ""}
                  onChange={(e) => actualizar("contactoEmergenciaNombre", e.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Teléfono" htmlFor="af-em-telefono">
                  <Input
                    id="af-em-telefono"
                    value={datos.contactoEmergenciaTelefono ?? ""}
                    onChange={(e) => actualizar("contactoEmergenciaTelefono", e.target.value)}
                  />
                </Field>
                <Field label="Parentesco" htmlFor="af-em-parentesco">
                  <Input
                    id="af-em-parentesco"
                    value={datos.contactoEmergenciaParentesco ?? ""}
                    onChange={(e) => actualizar("contactoEmergenciaParentesco", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </fieldset>

          {error ? (
            <p role="alert" className="flex items-center gap-2 text-sm text-pastel-red-fg">
              <WarningCircle size={16} weight="fill" /> {error}
            </p>
          ) : null}

          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCerrar} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando ? <SpinnerGap size={16} className="animate-spin" /> : <CheckCircle size={16} weight="bold" />}
              Confirmar afiliación
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
