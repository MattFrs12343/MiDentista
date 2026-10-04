/** Clínicas de demostración para la pantalla "Buscar clínica" del portal del paciente.
 *
 * Por qué existe: la búsqueda por cercanía filtra las clínicas a un radio de
 * 5 km alrededor del dispositivo del paciente. En desarrollo casi nunca hay una
 * clínica real a menos de 5 km (las cinco del proyecto están en La Paz, El Alto,
 * * Cochabamba y Santa Cruz de la Sierra), así que la pantalla "no muestra nada"
 * y parece rota. Este módulo genera un pequeño conjunto de clínicas ficticias
 * alrededor de la posición reportada por el navegador, para poder demostrar y
 * probar el filtro, el mapa y la lista sin cargar datos en la base.
 *
 * Qué garantiza:
 * - Determinista: el mismo `centro` produce siempre exactamente el mismo
 *   resultado. No usa `Math.random()` ni `Date.now()`, así los tests son estables.
 * - Coherente: cada clínica queda realmente a la distancia que se le pide,
 *   verificada con la fórmula de Haversine que ya usa la búsqueda por cercanía.
 * - Aislada: los ids llevan el prefijo `demo-`, que no puede colisionar con los
 *   UUID de Supabase, y el campo `demo: true` permite etiquetar la tarjeta.
 *
 * No consulta la red ni toca el store: es una función pura de presentación. */

import { distanciaKm } from "./haversine.ts";

export interface ClinicaDemo {
  id: string;
  nombre: string;
  ciudad: string;
  direccion: string;
  telefono: string;
  latitud: number;
  longitud: number;
  /** Marca de datos de demostración: la UI la usa para etiquetar la tarjeta. */
  demo: true;
}

/** Radio por defecto: 4 km, para que siempre queden dentro del filtro de 5 km. */
const RADIO_POR_DEFECTO_KM = 4;
/** Ninguna clínica de demo se pega al punto de partida ni se va demasiado lejos. */
const DISTANCIA_MINIMA_KM = 0.4;
const DISTANCIA_MAXIMA_KM = 3.8;
/** Mismo radio terrestre que usa Haversine, para que las dos cuentas cuadren. */
const RADIO_TIERRA_KM = 6371;
const GRADO_EN_RADIANES = Math.PI / 180;
/** Redondeo de coordenadas: seis decimales son ~11 cm, invisible en el mapa. */
const DECIMALES = 6;

/** Fracción del radio pedido que se le asigna a cada clínica, de más cerca a más lejos. */
const FRACCIONES_DISTANCIA = [0.25, 0.45, 0.65, 0.82, 0.95];

/** Rumbos equiespaciados en 360°: norte, noreste, este-sureste, suckswest, oeste-noroeste. */
const RUMBOS_GRADOS = [0, 72, 144, 216, 288];

interface Calle {
  calle: string;
  zona: string;
}

/** Datos de las ciudades donde el proyecto tiene Presence: dan nombre y barrio coherentes. */
interface Ciudad {
  nombre: string;
  lat: number;
  lon: number;
  barrios: Calle[];
}

const CIUDADES: Ciudad[] = [
  {
    nombre: "La Paz",
    lat: -16.4897,
    lon: -68.1193,
    barrios: [
      { calle: "Av. Sagárnaga", zona: "Casco Viejo" },
      { calle: "Calle México", zona: "Centro" },
      { calle: "Calle Colón", zona: "Garcilazo" },
      { calle: "Calle Soruco", zona: "San Pedro" },
      { calle: "Av. Ballivián", zona: "Calacoto" },
    ],
  },
  {
    nombre: "El Alto",
    lat: -16.5009,
    lon: -68.1507,
    barrios: [
      { calle: "Av. 6 de Agosto", zona: "Ciudadela" },
      { calle: "Av. Raúl Gualberto Villarroel", zona: "Villa Cristina" },
      { calle: "Calle Lanza", zona: "Chijini" },
      { calle: "Av. 16 de Julio", zona: "Villa Fátima" },
      { calle: "Av. Antonio Mendoza", zona: "12 de Octubre" },
    ],
  },
  {
    nombre: "Cochabamba",
    lat: -17.3895,
    lon: -66.1568,
    barrios: [
      { calle: "Calle España", zona: "Centro" },
      { calle: "Av. Melchior Urriolagoitía", zona: "Central" },
      { calle: "Av. Blanco Galindo", zona: "El Alto Colorado" },
      { calle: "Av. Amarú", zona: "Queru Queri" },
      { calle: "Calle Potosí", zona: "Sierra Nevada" },
    ],
  },
  {
    nombre: "Santa Cruz de la Sierra",
    lat: -17.7833,
    lon: -63.1821,
    barrios: [
      { calle: "Av. Cristóbal de Mendoza", zona: "Centro" },
      { calle: "Av. San Martín", zona: "Equipetrol" },
      { calle: "Av. Paurito", zona: "Plan Tres Mil" },
      { calle: "Av. Grigotá", zona: "Las Ramonas" },
      { calle: "Av. Che Guevara", zona: "Equipetrol Norte" },
    ],
  },
];

/** Nombre y teléfono: datos Bolivianos verosímiles, distintos entre sí para que
 * el paciente pueda elegir sin ver dos tarjetas iguales. */
const PLANTILLAS = [
  { nombre: "Consultorio Dental Sonrisa", calleNumero: "245", telefono: "70123456" },
  { nombre: "Clínica Dental Nueva Vida", calleNumero: "1420", telefono: "71234567" },
  { nombre: "Centro Odontológico Los Cusis", calleNumero: "458", telefono: "72345678" },
  { nombre: "Dental Vida Norte", calleNumero: "2315", telefono: "73456789" },
  { nombre: "Odontología Integral Sur", calleNumero: "87", telefono: "74567890" },
];

/** Cantidad de clínicas de demostración: siempre cinco, salvo que el centro no sirva. */
const CANTIDAD = 5;

/**
 * Genera cinco clínicas de demostración alrededor de `centro`.
 *
 * @param centro Punto de partida: el mismo que devuelve la geolocalización.
 * @param radioKm Radio máximo de búsqueda. Por defecto 4 km, para que entre en
 *   el filtro de 5 km de `BuscarClinicaPage`. Si no es un número positivo
 *   finito, se usa el radio por defecto.
 * @returns Las cinco clínicas, siempre en el mismo orden y con distancias
 *   crecientes, o `[]` si `centro` no trae números finitos. Ante un radio menor
 *   a 0.4 km gana la restricción de radio: las clínicas quedan sobre un anillo
 *   a exactamente `radioKm`, para no inventar resultados fuera del filtro.
 */
export function generarClinicasDemo(
  centro: { lat: number; lon: number },
  radioKm: number = RADIO_POR_DEFECTO_KM,
): ClinicaDemo[] {
  const lat = centro?.lat;
  const lon = centro?.lon;
  if (
    typeof lat !== "number" ||
    typeof lon !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    return [];
  }

  const origen = { lat, lon };
  const tope = topeUtilizable(radioKm);
  const minima = Math.min(DISTANCIA_MINIMA_KM, tope);
  const ciudad = ciudadMasCercana(lat, lon);

  const clinicas: ClinicaDemo[] = [];
  for (let indice = 0; indice < CANTIDAD; indice += 1) {
    const plantilla = PLANTILLAS[indice];
    const barrio = ciudad.barrios[indice % ciudad.barrios.length];

    const deseada = Math.min(
      Math.max(FRACCIONES_DISTANCIA[indice] * tope, minima),
      tope,
    );
    const punto = ajustarDistancia(
      origen,
      desplazar(origen, deseada, RUMBOS_GRADOS[indice]),
      deseada,
    );

    clinicas.push({
      id: `demo-${indice + 1}`,
      nombre: plantilla.nombre,
      ciudad: ciudad.nombre,
      direccion: `${barrio.calle} ${plantilla.calleNumero}, ${barrio.zona}, ${ciudad.nombre}`,
      telefono: plantilla.telefono,
      latitud: redondear(punto.lat),
      longitud: redondear(punto.lon),
      demo: true,
    });
  }
  return clinicas;
}

/** Radio con el que realmente se dibuja el anillo: nunca más de 3.8 km.
 * Un `radioKm` no usable (no numérico, NaN, Infinity, cero o negativo) cae al
 * radio por defecto, y ese también pasa por el tope. */
function topeUtilizable(radioKm: number): number {
  const radio =
    typeof radioKm === "number" && Number.isFinite(radioKm) && radioKm > 0
      ? radioKm
      : RADIO_POR_DEFECTO_KM;
  return Math.min(DISTANCIA_MAXIMA_KM, radio);
}

/** Ciudad de las cuatro del proyecto más cercana al paciente: el barrio y el
 * nombre de la demo quedan creíbles aunque el tester se mueva de ciudad. */
function ciudadMasCercana(lat: number, lon: number): Ciudad {
  let elegida = CIUDADES[0];
  let menorDistancia = distanciaKm(lat, lon, elegida.lat, elegida.lon);
  for (let indice = 1; indice < CIUDADES.length; indice += 1) {
    const candidata = CIUDADES[indice];
    const distancia = distanciaKm(lat, lon, candidata.lat, candidata.lon);
    if (distancia < menorDistancia) {
      elegida = candidata;
      menorDistancia = distancia;
    }
  }
  return elegida;
}

/** Desplaza el centro `distancia` km hacia `rumboGrados` (0 = norte, 90 = este). */
function desplazar(
  centro: { lat: number; lon: number },
  distancia: number,
  rumboGrados: number,
): { lat: number; lon: number } {
  const lat1 = centro.lat * GRADO_EN_RADIANES;
  const lon1 = centro.lon * GRADO_EN_RADIANES;
  // Distancia angular en radianes: longitud del arco sobre la esfera.
  const arco = distancia / RADIO_TIERRA_KM;
  const rumbo = rumboGrados * GRADO_EN_RADIANES;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(arco) + Math.cos(lat1) * Math.sin(arco) * Math.cos(rumbo),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(rumbo) * Math.sin(arco) * Math.cos(lat1),
      Math.cos(arco) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { lat: lat2 / GRADO_EN_RADIANES, lon: normalizarLongitud(lon2 / GRADO_EN_RADIANES) };
}

/** Corrige el desvío que introduce la trigonometría: la distancia final se mide
 * con la misma Haversine de la búsqueda, y si no da la pedida se escala el
 * desplazamiento. Así lo que la pantalla muestra coincide con lo que se pidió. */
function ajustarDistancia(
  centro: { lat: number; lon: number },
  punto: { lat: number; lon: number },
  objetivo: number,
): { lat: number; lon: number } {
  const real = distanciaKm(centro.lat, centro.lon, punto.lat, punto.lon);
  if (real <= 0 || real === objetivo) return punto;
  const factor = objetivo / real;
  return {
    lat: centro.lat + (punto.lat - centro.lat) * factor,
    lon: centro.lon + (punto.lon - centro.lon) * factor,
  };
}

/** Deja la longitud en [-180, 180] para que el mapa no la lea al otro lado del mundo. */
function normalizarLongitud(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

function redondear(valor: number): number {
  return Number(valor.toFixed(DECIMALES));
}