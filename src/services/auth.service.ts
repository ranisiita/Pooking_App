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

// ── Manejo de errores compartido (login + registro) ────────────────
/** Extrae los mensajes de error del cuerpo de la respuesta (replica el manejo de Angular). */
function extractErrorMessages(body: any, status: number, defaultMsg = 'Ocurrió un error.'): string[] {
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
    `Error ${status}: ${defaultMsg}`;

  return [typeof raw === 'string' ? raw : JSON.stringify(raw)];
}

// ── Login ──────────────────────────────────────────────────────────
export interface LoginResult {
  ok: boolean;
  token?: string;
  usuarioGuid?: string;
  roles?: string[];
  guidCliente?: string;
  status?: number;
  messages?: string[];
  /** Errores mapeados a campos del formulario de login. */
  fieldErrors?: Partial<Record<'identificador' | 'password', string>>;
}

/** Mapea errores de validación del backend a los campos del login. */
function extractLoginFieldErrors(body: any): Partial<Record<'identificador' | 'password', string>> {
  const out: Partial<Record<'identificador' | 'password', string>> = {};
  if (body?.errors && typeof body.errors === 'object' && !Array.isArray(body.errors)) {
    Object.keys(body.errors).forEach((key) => {
      const lk = key.toLowerCase();
      const raw = (body.errors as any)[key];
      const msg = Array.isArray(raw) ? raw[0] : raw;
      if (typeof msg !== 'string') return;
      if (lk.includes('identificador') || lk.includes('usuario') || lk.includes('correo')) out.identificador = msg;
      if (lk.includes('password') || lk.includes('contrase')) out.password = msg;
    });
  }
  return out;
}

/** Obtiene el guidCliente asociado al usuario (segundo endpoint, igual que Angular). */
export async function fetchGuidCliente(usuarioGuid: string): Promise<string | null> {
  try {
    const res = await fetch(`${BOOKING_BASE}/clientes/usuario-guid/${encodeURIComponent(usuarioGuid)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.guidCliente ?? null;
  } catch (err) {
    console.error('Error obteniendo guidCliente:', err);
    return null;
  }
}

export async function loginUsuario(identificador: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch(`${BOOKING_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identificador, password }),
    });

    if (!res.ok) {
      let body: any = null;
      try { body = await res.json(); } catch { try { body = await res.text(); } catch { body = null; } }
      return {
        ok: false,
        status: res.status,
        messages: extractErrorMessages(body, res.status, 'Credenciales inválidas. Por favor intenta de nuevo.'),
        fieldErrors: extractLoginFieldErrors(body),
      };
    }

    const response = await res.json();
    const token = response?.data?.token || response?.token;
    const usuarioGuid =
      response?.data?.usuarioGuid || response?.usuarioGuid || response?.data?.guid || response?.guid;
    const roles = response?.data?.roles || response?.roles || [];

    let guidCliente: string | undefined;
    if (token && usuarioGuid) {
      guidCliente = (await fetchGuidCliente(usuarioGuid)) ?? undefined;
    }

    return { ok: true, token, usuarioGuid, roles, guidCliente };
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    return { ok: false, messages: ['No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.'] };
  }
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

    return { ok: false, status: res.status, messages: extractErrorMessages(body, res.status, 'Ocurrió un error al registrarte.') };
  } catch (err) {
    console.error('Error al registrar usuario:', err);
    return { ok: false, messages: ['No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.'] };
  }
}
