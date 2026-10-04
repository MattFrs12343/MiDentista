import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Buildings,
  CheckCircle,
  Crosshair,
  FloppyDisk,
  MagnifyingGlass,
  MapPin,
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
import { useAuth } from "@/features/auth/AuthContext";
import { usePortalPaciente } from "@/features/portal-paciente/PortalPacienteContext";
import { distanciaKm } from "@/features/portal-paciente/haversine";
import { generarClinicasDemo } from "@/features/portal-paciente/clinicasDemo";
import { MapaHibrido } from "@/features/portal-paciente/MapaHibrido";
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

  const seleccionarDesdeMapa = useCallback(
    (id: string) => {
      if (yaAfiliado) return;
      // Las clínicas de demostración no existen en la base: no se pueden afiliar.
      if (id.startsWith("demo-")) return;
      const clinica = clinicas.find((c) => c.id === id);
      if (clinica) setSeleccionada(clinica);
    },
    [clinicas, yaAfiliado],
  );

  if (cargandoFicha) {
    return (
      <div className="flex items-center justify-center py-20">
        <SpinnerGap size={26} className="animate-spin text-ink-soft" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Buscar clínica</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Buscá por nombre o activá tu ubicación para ver las clínicas dentro de {RADIO_KM} km. Las
          clínicas solo aparecen cuando iniciás una búsqueda.
        </p>
      </div>

      {yaAfiliado ? (
        <Card className="border-pastel-green-fg/20 bg-pastel-green-bg">
          <CardContent className="flex items-center gap-3 p-4 text-pastel-green-fg">
            <CheckCircle size={22} weight="fill" className="shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">Ya estás afiliado a {yaAfiliado.nombre}</p>
              <p className="text-pastel-green-fg/80">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">
            {cargando
              ? "Buscando clínicas…"
              : `${visibles.length} ${visibles.length === 1 ? "clínica" : "clínicas"} encontrada${
                  visibles.length === 1 ? "" : "s"
                }`}
          </p>
          <div className="flex gap-2" role="tablist" aria-label="Elegir vista">
            <Button
              type="button"
              size="sm"
              variant={vista === "lista" ? "primary" : "secondary"}
              onClick={() => setVista("lista")}
              aria-pressed={vista === "lista"}
            >
              Lista
            </Button>
            <Button
              type="button"
              size="sm"
              variant={vista === "mapa" ? "primary" : "secondary"}
              onClick={() => setVista("mapa")}
              aria-pressed={vista === "mapa"}
            >
              Mapa
            </Button>
          </div>
        </div>
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
            radioKm={RADIO_KM}
            clinicaSeleccionadaId={seleccionada?.id ?? null}
            onSeleccionarClinica={seleccionarDesdeMapa}
            locating={estadoUbicacion === "buscando"}
            onCentrarEnMiUbicacion={pedirUbicacion}
          />
        )
      ) : null}

      {haBuscado && visibles.length > 0 && visibles.every((r) => r.demo) ? (
        <p className="flex items-start gap-2 rounded-xl border border-dashed border-brand-600/30 bg-brand-50 p-3 text-sm text-ink-soft">
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
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
          {visibles.map(({ clinica, distancia, demo: esDemo }) => (
            <Card key={clinica.id} className={esDemo ? "border-dashed" : undefined}>
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-ink">{clinica.nombre}</h2>
                    {clinica.ciudad ? (
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-muted">
                        <MapPin size={14} weight="duotone" /> {clinica.ciudad}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {distancia != null ? <Badge tone="blue">{distancia.toFixed(1)} km</Badge> : null}
                    {esDemo ? <Badge tone="yellow">Demo</Badge> : null}
                  </div>
                </div>

                {clinica.direccion ? <p className="text-sm text-ink-soft">{clinica.direccion}</p> : null}
                {clinica.telefono ? (
                  <p className="flex items-center gap-1.5 text-sm text-ink-soft">
                    <Phone size={14} weight="duotone" /> {clinica.telefono}
                  </p>
                ) : null}

                <div className="mt-auto pt-2">
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
                className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
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
