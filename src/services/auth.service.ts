// Auth Service — registro de usuario/cliente
// Migrado desde Pooking_Interface (signup component + usuario/cliente validators)
// HttpClient (Angular) reemplazado por fetch (built-in), igual que el resto de servicios.

const API_GATEWAY_URL = process.env.EXPO_PUBLIC_API_GATEWAY_URL ?? '';
const BOOKING_BASE = `${API_GATEWAY_URL}/api/v2/booking`;

// ── Tipos ──────────────────────────────────────────────────────────
export type TipoIdentificacion = 'CI' | 'RUC' | 'PASS' | 'EXT';

/** Payload plano enviado a POST /auth/registro (idéntico al de Angular). */
export interface RegistroPayload {
  username: string;
  identificador: string;
  correo: string;
  password: string;
  nombreRol: 'CLIENTE';
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  nombres: string;
  apellidos: string;
  razonSocial: string;
  telefono: string;
  direccion: string;
}

export interface RegistroResult {
  ok: boolean;
  /** Mensajes de error provenientes del backend (uno o varios). */
  messages?: string[];
  status?: number;
}

// ── Helper: interpretar respuesta de disponibilidad ────────────────
// El backend puede devolver un booleano directo, { disponible }, o { data: { disponible } }.
function parseDisponible(res: any): boolean {
  if (typeof res === 'boolean') return res;
  if (res?.data && typeof res.data.disponible === 'boolean') return res.data.disponible;
  if (res && typeof res.disponible === 'boolean') return res.disponible;
  if (res === false) return false;
  return true; // por defecto disponible (no bloquear el registro ante respuestas inesperadas)
}

async function getDisponible(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return true; // ante error de servidor, dejamos pasar (igual que catchError -> of(null) en Angular)
    const data = await res.json();
    return parseDisponible(data);
  } catch {
    return true; // no bloquear el registro si la verificación falla
  }
}

// ── Verificaciones de disponibilidad (validadores async) ───────────
export function checkUsernameDisponible(username: string): Promise<boolean> {
  return getDisponible(`${BOOKING_BASE}/usuarios/disponibilidad/${encodeURIComponent(username)}`);
}

export function checkCorreoDisponible(correo: string): Promise<boolean> {
  return getDisponible(`${BOOKING_BASE}/usuarios/disponibilidad-correo/${encodeURIComponent(correo)}`);
}

const IDENTIFICACION_SEGMENT: Record<TipoIdentificacion, string> = {
  CI: 'ci',
  RUC: 'ruc',
  PASS: 'pasaporte',
  EXT: 'extranjero',
};

export function checkIdentificacionDisponible(
  tipo: TipoIdentificacion,
  numero: string
): Promise<boolean> {
  const segment = IDENTIFICACION_SEGMENT[tipo];
  if (!segment || !numero) return Promise.resolve(true);
  return getDisponible(`${BOOKING_BASE}/clientes/disponibilidad/${segment}/${encodeURIComponent(numero)}`);
}

// ── Registro ───────────────────────────────────────────────────────
/** Extrae los mensajes de error del cuerpo de la respuesta (replica el manejo de Angular). */
function extractErrorMessages(body: any, status: number): string[] {
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { /* se queda como string */ }
  }

  if (Array.isArray(body?.errors)) {
    return body.errors as string[];
  }
  if (body?.errors && typeof body.errors === 'object') {
    return Object.values(body.errors).flat() as string[];
  }

  const raw =
    body?.message ??
    body?.title ??
    body?.detail ??
    (typeof body === 'string' ? body : null) ??
    `Error ${status}: Ocurrió un error al registrarte.`;

  return [typeof raw === 'string' ? raw : JSON.stringify(raw)];
}

export async function registrarUsuario(payload: RegistroPayload): Promise<RegistroResult> {
  try {
    const res = await fetch(`${BOOKING_BASE}/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) return { ok: true };

    let body: any = null;
    try {
      body = await res.json();
    } catch {
      try { body = await res.text(); } catch { body = null; }
    }

    return { ok: false, status: res.status, messages: extractErrorMessages(body, res.status) };
  } catch (err) {
    console.error('Error al registrar usuario:', err);
    return { ok: false, messages: ['No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.'] };
  }
}
