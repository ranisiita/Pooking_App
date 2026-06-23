import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Modal, FlatList, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Colors, Spacing, BorderRadius, Shadow } from '../constants/theme';
import { COUNTRY_CODES } from '../constants/country-codes';
import {
  registrarUsuario, checkUsernameDisponible, checkCorreoDisponible,
  checkIdentificacionDisponible, type TipoIdentificacion,
} from '../services/auth.service';
import { getUserFriendlyErrorMessage } from '../services/error-messages';
import {
  validateUsername, validateCorreo, validatePassword, validateConfirmPassword,
  validateTipoIdentificacion, validateNumeroIdentificacion, validateNombres,
  validateApellidos, validateRazonSocial, validateTelefono,
  passwordStrength, passwordRules, isPersonaNatural, isRUC,
  mapBackendErrors, type SignupField,
} from '../utils/signup-validators';

type AvailStatus = 'idle' | 'checking' | 'available' | 'taken';

// ── Input con ícono (mismo patrón que login.tsx) + adornos a la derecha ──
function IconInput({
  icon, value, onChangeText, onBlur, placeholder, keyboardType = 'default',
  secureTextEntry = false, hasError = false, autoCapitalize = 'none', right,
}: any) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={[inp.wrap, focus && inp.wrapFocus, hasError && inp.wrapError]}>
      <Ionicons name={icon} size={18} color={Colors.extra2} />
      <TextInput
        style={inp.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(96,98,86,0.5)"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocus(true)}
        onBlur={() => { setFocus(false); onBlur?.(); }}
      />
      {right}
    </View>
  );
}

const inp = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: Colors.accentBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: Colors.bg },
  wrapFocus: { borderColor: Colors.titulo, shadowColor: Colors.titulo, shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
  wrapError: { borderColor: Colors.error, backgroundColor: Colors.errorLight },
  input: { flex: 1, fontSize: 15, color: Colors.extra1 },
});

// ── Hook: verificación de disponibilidad con debounce (500ms) ──────
function useAvailability(value: string, enabled: boolean, check: (v: string) => Promise<boolean>, depKey = ''): AvailStatus {
  const [status, setStatus] = useState<AvailStatus>('idle');
  const reqId = useRef(0);
  useEffect(() => {
    if (!enabled) { setStatus('idle'); return; }
    setStatus('checking');
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const ok = await check(value);
        if (id === reqId.current) setStatus(ok ? 'available' : 'taken');
      } catch {
        if (id === reqId.current) setStatus('idle');
      }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled, depKey]);
  return status;
}

const TIPOS: { value: TipoIdentificacion; label: string }[] = [
  { value: 'CI', label: 'Cédula' },
  { value: 'RUC', label: 'RUC' },
  { value: 'PASS', label: 'Pasaporte' },
  { value: 'EXT', label: 'Extranjero' },
];

const STEPS = ['Datos de acceso', 'Datos personales', 'Confirmación'];

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Paso 1
  const [username, setUsername] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Paso 2
  const [tipo, setTipo] = useState<string>('');
  const [numero, setNumero] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [prefijo, setPrefijo] = useState('+593');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [prefixOpen, setPrefixOpen] = useState(false);

  // Errores: del backend (por campo) + generales
  const [backendErrors, setBackendErrors] = useState<Partial<Record<SignupField, string>>>({});
  const [generalError, setGeneralError] = useState('');
  const [touched, setTouched] = useState(false); // marca todos los campos como tocados al intentar avanzar

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // ── Validaciones síncronas ──
  const errUsername = validateUsername(username);
  const errCorreo = validateCorreo(correo);
  const errPassword = validatePassword(password);
  const errConfirmar = validateConfirmPassword(password, confirmar);
  const errTipo = validateTipoIdentificacion(tipo);
  const errNumero = validateNumeroIdentificacion(numero, tipo);
  const errNombres = isPersonaNatural(tipo) ? validateNombres(nombres) : '';
  const errApellidos = isPersonaNatural(tipo) ? validateApellidos(apellidos) : '';
  const errRazon = isRUC(tipo) ? validateRazonSocial(razonSocial) : '';
  const errTelefono = validateTelefono(telefono);

  // ── Disponibilidad async ──
  const usernameAvail = useAvailability(username.trim(), !errUsername, checkUsernameDisponible);
  const correoAvail = useAvailability(correo.trim(), !errCorreo, checkCorreoDisponible);
  const numeroAvail = useAvailability(
    numero.trim(),
    !errNumero && !!tipo,
    (v) => checkIdentificacionDisponible(tipo as TipoIdentificacion, v),
    tipo,
  );

  const strength = passwordStrength(password);
  const rules = passwordRules(password);

  // muestra error de campo: sync -> disponibilidad -> backend
  const fieldError = (sync: string, avail: AvailStatus | undefined, takenMsg: string, backendKey: SignupField): string => {
    if (sync) return sync;
    if (avail === 'taken') return takenMsg;
    if (backendErrors[backendKey]) return backendErrors[backendKey]!;
    return '';
  };

  const clearBackend = (key: SignupField) => {
    if (backendErrors[key]) setBackendErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  };

  // ── Validez de cada paso ──
  const step1Valid =
    !errUsername && !errCorreo && !errPassword && !errConfirmar &&
    usernameAvail !== 'taken' && correoAvail !== 'taken' &&
    usernameAvail !== 'checking' && correoAvail !== 'checking';

  const step2Valid =
    !errTipo && !errNumero && !errNombres && !errApellidos && !errRazon && !errTelefono &&
    numeroAvail !== 'taken' && numeroAvail !== 'checking';

  const next = () => {
    setTouched(true);
    if (step === 1) {
      if (!step1Valid) { showToast('Por favor corrige los errores marcados antes de continuar.'); return; }
    } else if (step === 2) {
      if (!step2Valid) { showToast('Por favor corrige los errores marcados antes de continuar.'); return; }
    }
    setTouched(false);
    setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
  };

  const prev = () => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));

  // ── Submit ──
  const onSubmit = async () => {
    setStatus('loading');
    setGeneralError('');
    setBackendErrors({});

    const result = await registrarUsuario({
      username,
      identificador: username,
      correo,
      password,
      nombreRol: 'CLIENTE',
      tipoIdentificacion: tipo,
      numeroIdentificacion: numero,
      nombres: nombres || '',
      apellidos: apellidos || '',
      razonSocial: razonSocial || '',
      telefono: telefono ? `${prefijo}${telefono}` : '',
      direccion: direccion || '',
    });

    if (result.ok) {
      setStatus('success');
      showToast('¡Cuenta y perfil creados exitosamente!', 'success');
      setTimeout(() => router.replace('/login'), 2500);
      return;
    }

    setStatus('error');
    const messages = result.messages ?? ['Ocurrió un error al registrarte.'];
    const mapped = mapBackendErrors(messages);
    setBackendErrors(mapped.fieldErrors);
    // 409 en registro = usuario/correo ya registrado. Si el backend no mapeó a un campo,
    // mostramos un mensaje claro y consistente; si sí lo mapeó, conservamos el del backend.
    const noFieldMapped = Object.keys(mapped.fieldErrors).length === 0;
    const general = result.status === 409 && noFieldMapped
      ? getUserFriendlyErrorMessage(409, 'auth')
      : mapped.unmapped.join(' • ');
    setGeneralError(general);
    showToast(general || messages.join(' • '));
    setTouched(true);
    setStep(mapped.step);
  };

  // indicador de disponibilidad a la derecha del input
  const availAdornment = (sync: string, avail: AvailStatus) => {
    if (sync) return null;
    if (avail === 'checking') return <ActivityIndicator size="small" color={Colors.extra2} />;
    if (avail === 'available') return <Ionicons name="checkmark-circle" size={18} color={Colors.success} />;
    if (avail === 'taken') return <Ionicons name="close-circle" size={18} color={Colors.error} />;
    return null;
  };

  const selectedFlag = COUNTRY_CODES.find((c) => c.code === prefijo)?.flag ?? '🌐';

  return (
    <View style={s.root}>
      <Navbar />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <View style={s.logoWrap}>
            <Text style={s.logo}>Pooking.com</Text>
            <Text style={s.logoSub}>Crea tu cuenta</Text>
          </View>

          {/* Stepper */}
          <View style={s.stepper}>
            {STEPS.map((label, i) => {
              const n = (i + 1) as 1 | 2 | 3;
              const active = step === n;
              const done = step > n;
              return (
                <React.Fragment key={label}>
                  <View style={s.stepItem}>
                    <View style={[s.stepDot, active && s.stepDotActive, done && s.stepDotDone]}>
                      {done
                        ? <Ionicons name="checkmark" size={14} color="#fff" />
                        : <Text style={[s.stepNum, (active || done) && { color: '#fff' }]}>{n}</Text>}
                    </View>
                    <Text style={[s.stepLabel, active && { color: Colors.titulo, fontWeight: '700' }]} numberOfLines={1}>{label}</Text>
                  </View>
                  {i < STEPS.length - 1 && <View style={[s.stepLine, step > n && { backgroundColor: Colors.titulo }]} />}
                </React.Fragment>
              );
            })}
          </View>

          {!!generalError && (
            <View style={s.generalBox}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
              <Text style={s.generalText}>{generalError}</Text>
            </View>
          )}

          {/* ── PASO 1 ── */}
          {step === 1 && (
            <View style={s.form}>
              <Field label="Usuario" error={touched ? fieldError(errUsername, usernameAvail, 'Este usuario ya está en uso.', 'username') : ''}>
                <IconInput icon="person-outline" value={username} onChangeText={(v: string) => { setUsername(v); clearBackend('username'); }} placeholder="juan123"
                  hasError={touched && !!fieldError(errUsername, usernameAvail, ' ', 'username')}
                  right={availAdornment(errUsername, usernameAvail)} />
                {!errUsername && usernameAvail === 'available' && <Text style={s.okText}>¡Usuario disponible!</Text>}
              </Field>

              <Field label="Correo electrónico" error={touched ? fieldError(errCorreo, correoAvail, 'Este correo ya está registrado.', 'correo') : ''}>
                <IconInput icon="mail-outline" value={correo} onChangeText={(v: string) => { setCorreo(v); clearBackend('correo'); }} placeholder="ejemplo@correo.com" keyboardType="email-address"
                  hasError={touched && !!fieldError(errCorreo, correoAvail, ' ', 'correo')}
                  right={availAdornment(errCorreo, correoAvail)} />
                {!errCorreo && correoAvail === 'available' && <Text style={s.okText}>¡Correo disponible!</Text>}
              </Field>

              <Field label="Contraseña" error={touched ? (errPassword || backendErrors.password || '') : ''}>
                <IconInput icon="lock-closed-outline" value={password} onChangeText={(v: string) => { setPassword(v); clearBackend('password'); }} placeholder="Mínimo 8 caracteres" secureTextEntry={!showPass}
                  hasError={touched && !!(errPassword || backendErrors.password)}
                  right={<TouchableOpacity onPress={() => setShowPass((p) => !p)}><Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.extra2} /></TouchableOpacity>} />
                {!!password && (
                  <>
                    <View style={s.strengthRow}>
                      {[1, 2, 3, 4].map((i) => (
                        <View key={i} style={[s.strengthBar, { backgroundColor: i <= strength.score ? strength.color : Colors.border }]} />
                      ))}
                    </View>
                    {!!strength.label && <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>}
                    <View style={s.rules}>
                      <Rule ok={rules.length} text="Mínimo 8 caracteres" />
                      <Rule ok={rules.number} text="Al menos un número" />
                      <Rule ok={rules.special} text="Un carácter especial (!@#$...)" />
                      <Rule ok={rules.uppercase} text="Al menos una mayúscula" />
                    </View>
                  </>
                )}
              </Field>

              <Field label="Confirmar contraseña" error={touched ? errConfirmar : ''}>
                <IconInput icon="lock-closed-outline" value={confirmar} onChangeText={setConfirmar} placeholder="Repite tu contraseña" secureTextEntry={!showConfirm}
                  hasError={touched && !!errConfirmar}
                  right={<TouchableOpacity onPress={() => setShowConfirm((p) => !p)}><Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.extra2} /></TouchableOpacity>} />
              </Field>

              <TouchableOpacity style={s.btn} onPress={next} activeOpacity={0.85}>
                <Text style={s.btnText}>Siguiente</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* ── PASO 2 ── */}
          {step === 2 && (
            <View style={s.form}>
              <Field label="Tipo de identificación" error={touched ? errTipo : ''}>
                <View style={s.chips}>
                  {TIPOS.map((t) => (
                    <TouchableOpacity key={t.value} onPress={() => setTipo(t.value)} style={[s.chip, tipo === t.value && s.chipActive]} activeOpacity={0.8}>
                      <Text style={[s.chipText, tipo === t.value && s.chipTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>

              <Field label="Número de identificación" error={touched ? fieldError(errNumero, numeroAvail, 'Este número de identificación ya está registrado.', 'numero_identificacion') : ''}>
                <IconInput icon="card-outline" value={numero} onChangeText={(v: string) => { setNumero(v); clearBackend('numero_identificacion'); }} placeholder="Número único"
                  keyboardType={tipo === 'CI' || tipo === 'RUC' ? 'number-pad' : 'default'}
                  hasError={touched && !!fieldError(errNumero, numeroAvail, ' ', 'numero_identificacion')}
                  right={tipo ? availAdornment(errNumero, numeroAvail) : null} />
                {!errNumero && numeroAvail === 'available' && <Text style={s.okText}>¡Número disponible!</Text>}
              </Field>

              {isPersonaNatural(tipo) && (
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Field label="Nombres" error={touched ? (errNombres || backendErrors.nombres || '') : ''}>
                      <IconInput icon="person-outline" value={nombres} onChangeText={(v: string) => { setNombres(v); clearBackend('nombres'); }} placeholder="Tus nombres" autoCapitalize="words" hasError={touched && !!(errNombres || backendErrors.nombres)} />
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Apellidos" error={touched ? (errApellidos || backendErrors.apellidos || '') : ''}>
                      <IconInput icon="people-outline" value={apellidos} onChangeText={(v: string) => { setApellidos(v); clearBackend('apellidos'); }} placeholder="Tus apellidos" autoCapitalize="words" hasError={touched && !!(errApellidos || backendErrors.apellidos)} />
                    </Field>
                  </View>
                </View>
              )}

              {isRUC(tipo) && (
                <Field label="Razón social" error={touched ? (errRazon || backendErrors.razon_social || '') : ''}>
                  <IconInput icon="business-outline" value={razonSocial} onChangeText={(v: string) => { setRazonSocial(v); clearBackend('razon_social'); }} placeholder="Nombre legal de la empresa" autoCapitalize="words" hasError={touched && !!(errRazon || backendErrors.razon_social)} />
                </Field>
              )}

              <Field label="Teléfono (opcional)" error={touched ? (errTelefono || backendErrors.telefono || '') : ''}>
                <View style={s.phoneRow}>
                  <TouchableOpacity style={s.prefixBtn} onPress={() => setPrefixOpen(true)} activeOpacity={0.8}>
                    <Text style={s.prefixFlag}>{selectedFlag}</Text>
                    <Text style={s.prefixCode}>{prefijo}</Text>
                    <Ionicons name="chevron-down" size={14} color={Colors.extra2} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <IconInput icon="call-outline" value={telefono} onChangeText={(v: string) => { setTelefono(v); clearBackend('telefono'); }} placeholder="991234567" keyboardType="phone-pad" hasError={touched && !!(errTelefono || backendErrors.telefono)} />
                  </View>
                </View>
              </Field>

              <Field label="Dirección (opcional)" error={touched ? (backendErrors.direccion || '') : ''}>
                <IconInput icon="location-outline" value={direccion} onChangeText={(v: string) => { setDireccion(v); clearBackend('direccion'); }} placeholder="Tu dirección" autoCapitalize="sentences" />
              </Field>

              <View style={s.navRow}>
                <TouchableOpacity style={s.btnGhost} onPress={prev} activeOpacity={0.85}>
                  <Ionicons name="arrow-back" size={18} color={Colors.titulo} />
                  <Text style={s.btnGhostText}>Atrás</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={next} activeOpacity={0.85}>
                  <Text style={s.btnText}>Siguiente</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── PASO 3 ── */}
          {step === 3 && (
            <View style={s.form}>
              <Text style={s.summaryTitle}>Revisa tus datos</Text>
              <View style={s.summary}>
                <SummaryRow label="Usuario" value={username} />
                <SummaryRow label="Correo" value={correo} />
                <SummaryRow label="Tipo de identificación" value={TIPOS.find((t) => t.value === tipo)?.label ?? tipo} />
                <SummaryRow label="N° identificación" value={numero} />
                {isPersonaNatural(tipo) && <SummaryRow label="Nombres" value={`${nombres} ${apellidos}`.trim()} />}
                {isRUC(tipo) && <SummaryRow label="Razón social" value={razonSocial} />}
                {!!telefono && <SummaryRow label="Teléfono" value={`${prefijo}${telefono}`} />}
                {!!direccion && <SummaryRow label="Dirección" value={direccion} />}
              </View>

              {status === 'success' && (
                <View style={[s.generalBox, { backgroundColor: 'rgba(39,174,96,0.1)', borderColor: Colors.success }]}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={[s.generalText, { color: Colors.success }]}>¡Cuenta creada! Redirigiendo al login...</Text>
                </View>
              )}

              <View style={s.navRow}>
                <TouchableOpacity style={[s.btnGhost, status === 'loading' && { opacity: 0.5 }]} onPress={prev} disabled={status === 'loading'} activeOpacity={0.85}>
                  <Ionicons name="arrow-back" size={18} color={Colors.titulo} />
                  <Text style={s.btnGhostText}>Atrás</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, { flex: 1 }, (status === 'loading' || status === 'success') && { opacity: 0.6 }]} onPress={onSubmit} disabled={status === 'loading' || status === 'success'} activeOpacity={0.85}>
                  {status === 'loading'
                    ? <Text style={s.btnText}>Registrando...</Text>
                    : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={s.btnText}>Confirmar registro</Text></>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={s.loginRow}>
            <Text style={s.loginText}>¿Ya tienes cuenta?</Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={s.loginLink}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Footer />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal selector de prefijo telefónico */}
      <Modal visible={prefixOpen} transparent animationType="fade" onRequestClose={() => setPrefixOpen(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setPrefixOpen(false)}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Selecciona un país</Text>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item, i) => `${item.code}-${i}`}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.countryRow} onPress={() => { setPrefijo(item.code); setPrefixOpen(false); }} activeOpacity={0.7}>
                  <Text style={s.countryFlag}>{item.flag}</Text>
                  <Text style={s.countryName}>{item.name}</Text>
                  <Text style={s.countryCode}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Toast — debajo de la barra de estado (safe area), nunca encima de ella */}
      {!!toast && (
        <View style={[s.toastWrap, { top: Platform.OS === 'web' ? 24 : insets.top + 8 }]} pointerEvents="box-none">
          <View style={[s.toast, toast.type === 'success' ? s.toastSuccess : s.toastError]}>
            <Ionicons name={toast.type === 'success' ? 'checkmark-circle' : 'alert-circle'} size={20} color={toast.type === 'success' ? Colors.success : Colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={s.toastTitle}>{toast.type === 'success' ? '¡Éxito!' : 'Error en el registro'}</Text>
              <Text style={s.toastMsg}>{toast.msg}</Text>
            </View>
            <TouchableOpacity onPress={() => setToast(null)}><Ionicons name="close" size={18} color={Colors.textMuted} /></TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Subcomponentes ──
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      {children}
      {!!error && <Text style={s.err}>{error}</Text>}
    </View>
  );
}

function Rule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={s.ruleRow}>
      <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={ok ? Colors.success : Colors.textMuted} />
      <Text style={[s.ruleText, ok && { color: Colors.success }]}>{text}</Text>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryValue}>{value || '—'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1 },
  card: {
    margin: Spacing.xl, marginTop: Spacing.xxl,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 5, borderLeftColor: Colors.titulo,
    padding: Spacing.xl, gap: Spacing.lg,
    maxWidth: 580, alignSelf: 'center', width: '100%', ...Shadow.lg,
  },
  logoWrap: { alignItems: 'center', gap: 4 },
  logo: { fontSize: 28, fontWeight: '700', color: Colors.titulo, letterSpacing: 0.5 },
  logoSub: { fontSize: 15, color: Colors.subtitulo },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  stepItem: { alignItems: 'center', gap: 4, maxWidth: 90 },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  stepDotActive: { backgroundColor: Colors.titulo, borderColor: Colors.titulo },
  stepDotDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  stepNum: { fontSize: 13, fontWeight: '700', color: Colors.subtitulo },
  stepLabel: { fontSize: 10, color: Colors.subtitulo, textAlign: 'center' },
  stepLine: { flex: 1, height: 2, backgroundColor: Colors.border, marginHorizontal: 4, marginBottom: 16, maxWidth: 40 },

  form: { gap: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.md },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', color: Colors.extra1, letterSpacing: 0.5, marginBottom: 6 },
  err: { fontSize: 12, color: Colors.error, marginTop: 3 },
  okText: { fontSize: 12, color: Colors.success, marginTop: 3 },

  generalBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: BorderRadius.sm, backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error },
  generalText: { flex: 1, fontSize: 13, color: Colors.error },

  // Fuerza de contraseña
  strengthRow: { flexDirection: 'row', gap: 4, marginTop: 8 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  rules: { marginTop: 8, gap: 4 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleText: { fontSize: 12, color: Colors.subtitulo },

  // Chips tipo identificación
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.accentBorder, backgroundColor: Colors.bg },
  chipActive: { backgroundColor: Colors.titulo, borderColor: Colors.titulo },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.subtitulo },
  chipTextActive: { color: '#fff' },

  // Teléfono
  phoneRow: { flexDirection: 'row', gap: 8 },
  prefixBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: Colors.accentBorder, borderRadius: 10, paddingHorizontal: 12, backgroundColor: Colors.bg },
  prefixFlag: { fontSize: 18 },
  prefixCode: { fontSize: 14, color: Colors.extra1, fontWeight: '600' },

  // Botones
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.titulo, borderRadius: BorderRadius.md, paddingVertical: 15, marginTop: 4, ...Shadow.md },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnGhost: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: BorderRadius.md, paddingVertical: 15, paddingHorizontal: 18, borderWidth: 1.5, borderColor: Colors.titulo, marginTop: 4 },
  btnGhostText: { color: Colors.titulo, fontWeight: '700', fontSize: 15 },
  navRow: { flexDirection: 'row', gap: Spacing.md },

  // Resumen paso 3
  summaryTitle: { fontSize: 16, fontWeight: '700', color: Colors.titulo },
  summary: { gap: 2, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  summaryLabel: { fontSize: 13, color: Colors.subtitulo },
  summaryValue: { fontSize: 13, color: Colors.extra1, fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  loginRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  loginText: { fontSize: 14, color: Colors.subtitulo },
  loginLink: { fontSize: 14, color: Colors.titulo, fontWeight: '600', textDecorationLine: 'underline' },

  // Modal país
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', padding: Spacing.lg },
  modalCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, maxHeight: '70%', maxWidth: 420, width: '100%', alignSelf: 'center', ...Shadow.lg },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.titulo, marginBottom: 8, paddingHorizontal: 4 },
  countryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  countryFlag: { fontSize: 22 },
  countryName: { flex: 1, fontSize: 14, color: Colors.extra1 },
  countryCode: { fontSize: 14, color: Colors.subtitulo, fontWeight: '600' },

  // Toast
  toastWrap: { position: 'absolute', top: Platform.OS === 'web' ? 24 : 60, left: 0, right: 0, alignItems: 'center', paddingHorizontal: Spacing.md },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 14, maxWidth: 460, width: '100%', borderLeftWidth: 4, ...Shadow.lg },
  toastError: { borderLeftColor: Colors.error },
  toastSuccess: { borderLeftColor: Colors.success },
  toastTitle: { fontSize: 14, fontWeight: '700', color: Colors.extra1 },
  toastMsg: { fontSize: 13, color: Colors.subtitulo, marginTop: 2 },
});
