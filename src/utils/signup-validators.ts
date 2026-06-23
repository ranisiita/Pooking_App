// Validadores del registro — portados 1:1 desde Pooking_Interface
//   - usuario.validators.ts  (username, correo, password)
//   - cliente.validators.ts  (tipo/numero identificacion, nombres, apellidos, razon social, telefono)
//   - password-match.validator.ts
// Cada función devuelve el mensaje de error (string) o '' si el campo es válido.

import type { TipoIdentificacion } from '../services/auth.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Paso 1 ─────────────────────────────────────────────────────────
export function validateUsername(value: string): string {
  const v = value ?? '';
  if (!v.trim()) return 'El usuario es requerido.';
  if (v.length < 4) return 'Mínimo 4 caracteres.';
  if (v.length > 50) return 'Máximo 50 caracteres.';
  return '';
}

export function validateCorreo(value: string): string {
  const v = value ?? '';
  if (!v.trim()) return 'El correo es requerido.';
  if (!v.includes('@')) return 'Falta el símbolo @ en el correo.';
  const parts = v.split('@');
  if (parts.length !== 2 || !parts[1]) return 'El dominio después del @ está vacío.';
  if (!parts[1].includes('.')) return 'Falta el punto (.) en el dominio del correo.';
  if (!EMAIL_RE.test(v)) return 'Formato de correo inválido.';
  if (v.length > 120) return 'Máximo 120 caracteres.';
  return '';
}

export function validatePassword(value: string): string {
  const p = value ?? '';
  if (!p) return 'La contraseña es requerida.';
  if (p.length < 8) return 'Mínimo 8 caracteres.';
  if (!/[0-9]/.test(p)) return 'Debe contener al menos un número.';
  if (!/[^A-Za-z0-9]/.test(p)) return 'Debe contener al menos un carácter especial (!@#$...).';
  return '';
}

export function validateConfirmPassword(password: string, confirm: string): string {
  if (!confirm) return 'Debes confirmar tu contraseña.';
  if (password !== confirm) return 'Las contraseñas no coinciden.';
  return '';
}

// ── Fuerza de contraseña (solo UI) ─────────────────────────────────
export interface PasswordStrength {
  label: string;
  score: number; // 0-4
  color: string;
}

export function passwordStrength(p: string): PasswordStrength {
  if (!p) return { label: '', score: 0, color: '' };
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
  const colors = ['', '#e74c3c', '#e67e22', '#3498db', '#27ae60'];
  return { label: labels[score], score, color: colors[score] };
}

export function passwordRules(p: string) {
  return {
    length: p.length >= 8,
    uppercase: /[A-Z]/.test(p),
    number: /[0-9]/.test(p),
    special: /[^A-Za-z0-9]/.test(p),
  };
}

// ── Paso 2 ─────────────────────────────────────────────────────────
export function validateTipoIdentificacion(value: string): string {
  if (!value) return 'Selecciona un tipo de identificación.';
  return '';
}

export function validateNumeroIdentificacion(value: string, tipo: string): string {
  const v = (value ?? '').trim();
  if (!v) return 'El número de identificación es requerido.';

  switch (tipo) {
    case 'CI':
      if (!/^\d+$/.test(v)) return 'La cédula solo debe contener números.';
      if (v.length !== 10) return 'La cédula debe tener exactamente 10 dígitos.';
      break;
    case 'RUC':
      if (!/^\d+$/.test(v)) return 'El RUC solo debe contener números.';
      if (v.length !== 13) return 'El RUC debe tener exactamente 13 dígitos.';
      if (!v.endsWith('001')) return 'El RUC debe terminar en 001.';
      break;
    case 'PASS':
      if (!/^[A-Za-z0-9]+$/.test(v)) return 'El pasaporte solo admite letras y números.';
      if (v.length < 6 || v.length > 9) return 'El pasaporte debe tener entre 6 y 9 caracteres.';
      break;
    case 'EXT':
      if (!/^[A-Za-z0-9]+$/.test(v)) return 'El documento extranjero solo admite letras y números.';
      if (v.length < 6 || v.length > 13) return 'El documento debe tener entre 6 y 13 caracteres.';
      break;
  }
  return '';
}

export function validateNombres(value: string): string {
  if (!(value ?? '').trim()) return 'Los nombres son requeridos.';
  return '';
}

export function validateApellidos(value: string): string {
  if (!(value ?? '').trim()) return 'Los apellidos son requeridos.';
  return '';
}

export function validateRazonSocial(value: string): string {
  if (!(value ?? '').trim()) return 'La razón social es requerida.';
  return '';
}

export function validateTelefono(value: string): string {
  const v = (value ?? '').trim();
  if (!v) return ''; // opcional
  if (!/^\d+$/.test(v)) return 'El teléfono solo debe contener números.';
  if (v.length < 7 || v.length > 15) return 'El teléfono debe tener entre 7 y 15 dígitos.';
  return '';
}

// ── Helpers de tipo ────────────────────────────────────────────────
export const PERSONA_NATURAL: TipoIdentificacion[] = ['CI', 'PASS', 'EXT'];

export function isPersonaNatural(tipo: string): boolean {
  return (PERSONA_NATURAL as string[]).includes(tipo);
}

export function isRUC(tipo: string): boolean {
  return tipo === 'RUC';
}

// ── Mapeo de errores del backend a campos (replica mapBackendErrors) ─
export type SignupField =
  | 'username' | 'correo' | 'password'
  | 'tipo_identificacion' | 'numero_identificacion'
  | 'nombres' | 'apellidos' | 'razon_social' | 'telefono' | 'direccion';

const FIELD_MAP: { keywords: string[]; field: SignupField; step: 1 | 2 }[] = [
  { keywords: ['usuario', 'username'], field: 'username', step: 1 },
  { keywords: ['correo', 'email'], field: 'correo', step: 1 },
  { keywords: ['contraseña', 'password'], field: 'password', step: 1 },
  { keywords: ['tipo'], field: 'tipo_identificacion', step: 2 },
  { keywords: ['identificaci'], field: 'numero_identificacion', step: 2 },
  { keywords: ['nombre'], field: 'nombres', step: 2 },
  { keywords: ['apellido'], field: 'apellidos', step: 2 },
  { keywords: ['raz'], field: 'razon_social', step: 2 },
  { keywords: ['teléfono', 'telefono'], field: 'telefono', step: 2 },
  { keywords: ['direcci'], field: 'direccion', step: 2 },
];

export interface MappedBackendErrors {
  fieldErrors: Partial<Record<SignupField, string>>;
  unmapped: string[];
  /** Paso al que se debe regresar (2 si hay errores de paso 2, si no 1). */
  step: 1 | 2;
}

export function mapBackendErrors(messages: string[]): MappedBackendErrors {
  const fieldErrors: Partial<Record<SignupField, string>> = {};
  const unmapped: string[] = [];
  let hasStep2Error = false;

  messages.forEach((msg) => {
    const lower = msg.toLowerCase();
    const match = FIELD_MAP.find((m) => m.keywords.some((k) => lower.includes(k)));
    if (match) {
      fieldErrors[match.field] = msg;
      if (match.step === 2) hasStep2Error = true;
    } else {
      unmapped.push(msg);
    }
  });

  return { fieldErrors, unmapped, step: hasStep2Error ? 2 : 1 };
}
