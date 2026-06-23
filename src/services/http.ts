// ─────────────────────────────────────────────────────────────────────────────
// fetch con timeout PORTABLE (web + nativo / Expo Go).
//
// NO usamos `AbortSignal.timeout(ms)` porque el polyfill de React Native
// (abort-controller@3.0.0, ver react-native/Libraries/Core/setUpXHR.js) NO implementa
// ese método estático. En Hermes/Expo Go `AbortSignal.timeout` es `undefined`, así que
// `fetch(url, { signal: AbortSignal.timeout(ms) })` lanzaba un TypeError y, al estar dentro
// de un try/catch, hacía que la llamada "fallara" silenciosamente (p. ej. el listado de
// alojamientos quedaba vacío en el celular, aunque en web —donde sí existe— funcionaba).
//
// `AbortController` SÍ está disponible (polyfilleado por RN), por eso combinamos
// AbortController + setTimeout, que funciona igual en web y en nativo.
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchWithTimeout(
  input: string,
  ms: number,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
