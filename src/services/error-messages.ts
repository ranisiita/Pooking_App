// ─────────────────────────────────────────────────────────────────────────────
// Mensajes de error amigables para el usuario (coherentes con Pooking_Interface).
//
// Centraliza el mapeo de códigos HTTP → texto en español según el contexto del
// flujo, para no duplicar lógica de mensajes en cada pantalla.
//
// Uso:
//   getUserFriendlyErrorMessage(error, 'booking')  → 409 = "Ya no existe disponibilidad en el horario escogido."
//   getUserFriendlyErrorMessage(error, 'auth')     → 409 = "El usuario o correo ya se encuentra registrado."
//
// `error` puede ser: un número (status), un objeto { status }, un ApiError,
// un TypeError de red, o cualquier cosa. Nunca devuelve texto técnico ni JSON crudo.
// ─────────────────────────────────────────────────────────────────────────────

export type ErrorContext =
  | 'auth'         // login / registro / sesión
  | 'booking'      // crear reserva
  | 'availability' // disponibilidad / cupos / horarios
  | 'checkout'     // checkout
  | 'payment'      // pago
  | 'generic';

/** Error de API que transporta el código HTTP. Lo lanzan los servicios ante respuestas no-OK. */
export class ApiError extends Error {
  status: number;
  body?: any;
  constructor(status: number, body?: any) {
    super(`API error ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// Contextos en los que un 409 significa conflicto de disponibilidad/horario/cupo.
const AVAILABILITY_CONTEXTS: ErrorContext[] = ['booking', 'availability', 'checkout', 'payment'];

export const ERROR_MESSAGES = {
  conflictAvailability: 'Ya no existe disponibilidad en el horario escogido.',
  conflictAuth: 'El usuario o correo ya se encuentra registrado.',
  badRequest: 'Revisa la información ingresada e inténtalo nuevamente.',
  unauthorized: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
  forbidden: 'No tienes permisos para realizar esta acción.',
  notFound: 'No se encontró la información solicitada.',
  server: 'Ocurrió un problema en el servidor. Inténtalo más tarde.',
  network: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.',
  timeout: 'La solicitud tardó demasiado. Inténtalo nuevamente.',
  generic: 'Ocurrió un error inesperado. Inténtalo nuevamente.',
} as const;

function getStatus(error: unknown): number | undefined {
  if (typeof error === 'number') return error;
  if (error && typeof error === 'object') {
    const s = (error as any).status;
    if (typeof s === 'number') return s;
  }
  return undefined;
}

function isTimeout(error: unknown): boolean {
  const name = (error as any)?.name;
  return name === 'TimeoutError' || name === 'AbortError';
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true; // fetch lanza TypeError ante fallo de red
  const msg = String((error as any)?.message ?? '').toLowerCase();
  return msg.includes('network') || msg.includes('failed to fetch') || msg.includes('conexión');
}

/**
 * Devuelve un mensaje claro y en español para mostrar al usuario final.
 * El `context` decide el significado del 409 (disponibilidad vs. usuario/correo existente).
 */
export function getUserFriendlyErrorMessage(error: unknown, context: ErrorContext = 'generic'): string {
  if (isTimeout(error)) return ERROR_MESSAGES.timeout;

  const status = getStatus(error);

  // Sin status numérico → error de red/conexión (o status 0 que usamos para fallos de fetch).
  if (status === undefined || status === 0) {
    return isNetworkError(error) || status === 0 ? ERROR_MESSAGES.network : ERROR_MESSAGES.generic;
  }

  switch (status) {
    case 400:
      return ERROR_MESSAGES.badRequest;
    case 401:
      return ERROR_MESSAGES.unauthorized;
    case 403:
      return ERROR_MESSAGES.forbidden;
    case 404:
      return ERROR_MESSAGES.notFound;
    case 408:
    case 504:
      return ERROR_MESSAGES.timeout;
    case 409:
      return AVAILABILITY_CONTEXTS.includes(context)
        ? ERROR_MESSAGES.conflictAvailability
        : ERROR_MESSAGES.conflictAuth;
    default:
      if (status >= 500) return ERROR_MESSAGES.server;
      if (status >= 400) return ERROR_MESSAGES.badRequest;
      return ERROR_MESSAGES.generic;
  }
}
