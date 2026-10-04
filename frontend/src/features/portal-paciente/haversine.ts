/** Distancia en kilómetros entre dos coordenadas (fórmula de Haversine).
 * La usa la búsqueda de clínicas por cercanía (radio 5 km, US-1.7). */
export function distanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const RADIO_TIERRA_KM = 6371;
  const aRadianes = (grados: number) => (grados * Math.PI) / 180;

  const dLat = aRadianes(lat2 - lat1);
  const dLon = aRadianes(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRadianes(lat1)) * Math.cos(aRadianes(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(a));
}
