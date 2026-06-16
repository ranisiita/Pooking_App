import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Shadow } from '../constants/theme';

// ── Re-usable Payment Hall Component ─────────────────────────────────────────
// Used by lodging, cars, flights, attractions (embedded or standalone)

export interface PaymentHallProps {
  // Pricing
  subtotal: number;
  iva: number;
  total: number;
  ivaLabel?: string;
  itemName?: string;
  customDetails?: { name: string; value: number }[];

  // Prefilled user data
  initialNombre?: string;
  initialEmail?: string;
  initialTelefono?: string;

  // Callbacks
  onPagoExitoso: () => void;
  onCancel: () => void;

  // Labels
  buttonLabel?: string;
}

interface DatosPersonales { nombre: string; apellidos: string; email: string; telefono: string; }
interface DatosTarjeta { titular: string; numero: string; expiracion: string; cvc: string; }

// ── Field wrapper ─────────────────────────────────────────────────────────────
function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <View style={ff.wrapper}>
      <Text style={ff.label}>{label}{required && <Text style={{ color: Colors.titulo }}> *</Text>}</Text>
      {children}
      {!!error && (
        <View style={ff.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={Colors.error} />
          <Text style={ff.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const ff = StyleSheet.create({
  wrapper: { gap: 4 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', color: Colors.extra1, letterSpacing: 0.5 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  errorText: { fontSize: 12, color: Colors.error, lineHeight: 16 },
});

// ── Input with icon ───────────────────────────────────────────────────────────
function IconInput({ icon, value, onChangeText, placeholder, keyboardType = 'default', secureTextEntry = false, hasError = false, maxLength, onChangeTextRaw }: any) {
  return (
    <View style={[inp.wrap, hasError && inp.wrapError]}>
      <Ionicons name={icon} size={17} color={Colors.extra2} />
      <TextInput
        style={inp.input}
        value={value}
        onChangeText={onChangeText ?? onChangeTextRaw}
        placeholder={placeholder}
        placeholderTextColor="rgba(96,98,86,0.5)"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
      />
    </View>
  );
}

const inp = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: Colors.accentBorder,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    backgroundColor: Colors.bg,
  },
  wrapError: { borderColor: Colors.error, backgroundColor: Colors.errorLight },
  input: { flex: 1, fontSize: 15, color: Colors.extra1 },
});

// ── Main Component ────────────────────────────────────────────────────────────
export default function PaymentHall({
  subtotal, iva, total, ivaLabel = '15%', itemName = 'Reserva',
  customDetails, initialNombre = '', initialEmail = '', initialTelefono = '',
  onPagoExitoso, onCancel, buttonLabel = 'Pagar de forma segura',
}: PaymentHallProps) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [procesando, setProcesando] = useState(false);
  const [detallesExp, setDetallesExp] = useState(false);

  // Step 1: personal data
  const [datos, setDatos] = useState<DatosPersonales>({
    nombre: initialNombre.split(' ')[0] ?? '',
    apellidos: initialNombre.split(' ').slice(1).join(' ') ?? '',
    email: initialEmail,
    telefono: initialTelefono,
  });
  const [errDatos, setErrDatos] = useState<Partial<Record<keyof DatosPersonales, string>>>({});

  // Step 2: card
  const [tarjeta, setTarjeta] = useState<DatosTarjeta>({ titular: '', numero: '', expiracion: '', cvc: '' });
  const [errTarjeta, setErrTarjeta] = useState<Partial<Record<keyof DatosTarjeta, string>>>({});

  // ── Validation ──────────────────────────────────────────────────────────────
  const validarDatos = (): boolean => {
    const e: typeof errDatos = {};
    if (!datos.nombre.trim() || datos.nombre.trim().length < 4) e.nombre = 'Mínimo 4 caracteres.';
    if (!datos.apellidos.trim() || datos.apellidos.trim().length < 4) e.apellidos = 'Mínimo 4 caracteres.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) e.email = 'Formato de correo inválido.';
    if (!/^\d+$/.test(datos.telefono)) e.telefono = 'Solo puede contener números.';
    else if (datos.telefono.length < 9) e.telefono = 'Mínimo 9 dígitos.';
    setErrDatos(e);
    return Object.keys(e).length === 0;
  };

  const validarTarjeta = (): boolean => {
    const e: typeof errTarjeta = {};
    if (!tarjeta.titular.trim() || tarjeta.titular.trim().length < 4) e.titular = 'Mínimo 4 caracteres.';
    if (tarjeta.numero.replace(/\s/g, '').length !== 16) e.numero = 'Debe tener 16 dígitos.';
    if (!/^\d{2} \/ \d{2}$/.test(tarjeta.expiracion)) e.expiracion = 'Formato inválido. Usa MM / AA.';
    if (tarjeta.cvc.length < 3) e.cvc = 'El CVC debe tener 3 dígitos.';
    setErrTarjeta(e);
    return Object.keys(e).length === 0;
  };

  // ── Formatters ──────────────────────────────────────────────────────────────
  const formatNumero = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 16);
    return d.replace(/(.{4})/g, '$1 ').trim();
  };
  const formatExp = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length >= 3 ? d.slice(0, 2) + ' / ' + d.slice(2) : d;
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  const continuarAlPago = () => { if (validarDatos()) setPaso(2); };
  const pagar = () => {
    if (!validarTarjeta()) return;
    setProcesando(true);
    setTimeout(() => { setProcesando(false); onPagoExitoso(); }, 1800);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PASO 1 — DATOS PERSONALES
  // ─────────────────────────────────────────────────────────────────────────────
  if (paso === 1) {
    return (
      <View style={s.modalWrapper}>
        <View style={s.modalDatos}>
          <Text style={s.modalTitle}>Tus datos</Text>
          <Text style={s.modalDesc}>Revisa tus datos antes de continuar al pago. Modifícalos si es necesario.</Text>

          <View style={s.formGrid}>
            <View style={s.formRow}>
              <View style={{ flex: 1 }}>
                <FormField label="Nombre" required error={errDatos.nombre}>
                  <IconInput icon="person-outline" value={datos.nombre} onChangeText={(v: string) => setDatos({...datos, nombre: v})} placeholder="Ingresa tu nombre" hasError={!!errDatos.nombre} />
                </FormField>
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="Apellidos" required error={errDatos.apellidos}>
                  <IconInput icon="id-card-outline" value={datos.apellidos} onChangeText={(v: string) => setDatos({...datos, apellidos: v})} placeholder="Ingresa tus apellidos" hasError={!!errDatos.apellidos} />
                </FormField>
              </View>
            </View>

            <FormField label="Email" required error={errDatos.email}>
              <IconInput icon="mail-outline" value={datos.email} onChangeText={(v: string) => setDatos({...datos, email: v})} placeholder="correo@ejemplo.com" keyboardType="email-address" hasError={!!errDatos.email} />
            </FormField>

            <FormField label="Teléfono" required error={errDatos.telefono}>
              <IconInput icon="call-outline" value={datos.telefono} onChangeText={(v: string) => setDatos({...datos, telefono: v.replace(/\D/g, '')})} placeholder="600123456" keyboardType="numeric" hasError={!!errDatos.telefono} />
            </FormField>

            <View style={s.modalActions}>
              <TouchableOpacity style={s.btnSecondary} onPress={onCancel} activeOpacity={0.8}>
                <Text style={s.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnPrimary} onPress={continuarAlPago} activeOpacity={0.85}>
                <Text style={s.btnPrimaryText}>Continuar al pago</Text>
                <Ionicons name="arrow-forward" size={17} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PASO 2 — HALL DE PAGOS
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={s.modalPago} contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.lg }}>
      {/* Header */}
      <View style={s.pagoHeader}>
        <Text style={s.modalTitle}>Hall de pagos</Text>
        <TouchableOpacity onPress={onCancel} style={s.closeBtn}>
          <Ionicons name="close" size={24} color={Colors.subtitulo} />
        </TouchableOpacity>
      </View>
      <Text style={s.modalDesc}>Revisa tus datos y completa la información de tu tarjeta para finalizar la reserva.</Text>

      <View style={[s.pagoContent, Platform.OS === 'web' && s.pagoContentWeb]}>

        {/* Columna izquierda: datos personales + resumen */}
        <View style={s.pagoSection}>
          {/* Datos personales */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Datos personales</Text>
            <TouchableOpacity style={s.editBtn} onPress={() => setPaso(1)}>
              <Ionicons name="pencil-outline" size={14} color={Colors.subtitulo} />
              <Text style={s.editBtnText}>Editar</Text>
            </TouchableOpacity>
          </View>
          <View style={s.personalData}>
            <DataItem label="NOMBRE" value={`${datos.nombre} ${datos.apellidos}`} />
            <DataItem label="EMAIL" value={datos.email} />
            <DataItem label="TELÉFONO" value={datos.telefono} full />
          </View>

          {/* Resumen de pago */}
          <View style={s.paymentSummary}>
            <TouchableOpacity style={s.summaryRow} onPress={() => setDetallesExp(!detallesExp)}>
              <View style={s.summaryLabel}>
                <Ionicons name={detallesExp ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.extra1} />
                <Text style={s.summaryLabelText}>Subtotal</Text>
              </View>
              <Text style={s.summaryValue}>${subtotal.toFixed(2)}</Text>
            </TouchableOpacity>

            {detallesExp && (
              <View style={s.detailsExp}>
                {customDetails && customDetails.length > 0 ? customDetails.map(d => (
                  <View key={d.name} style={s.detailRow}>
                    <Text style={s.detailText}>{d.name}</Text>
                    <Text style={s.detailText}>${d.value.toFixed(2)}</Text>
                  </View>
                )) : (
                  <View style={s.detailRow}>
                    <Text style={s.detailText}>{itemName}</Text>
                    <Text style={s.detailText}>${subtotal.toFixed(2)}</Text>
                  </View>
                )}
                <View style={s.detailRow}>
                  <Text style={s.detailText}>IVA ({ivaLabel})</Text>
                  <Text style={s.detailText}>${iva.toFixed(2)}</Text>
                </View>
              </View>
            )}

            <View style={s.summaryTotal}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalValue}>${total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Columna derecha: tarjeta */}
        <View style={s.pagoSection}>
          <View style={s.payMethodHeader}>
            <Text style={s.sectionTitle}>Método de pago — Tarjeta</Text>
            <View style={s.secureBadge}>
              <Ionicons name="lock-closed-outline" size={13} color={Colors.subtitulo} />
              <Text style={s.secureBadgeText}>Pago seguro</Text>
            </View>
          </View>

          <View style={s.formGrid}>
            <FormField label="Nombre del titular de la tarjeta" required error={errTarjeta.titular}>
              <IconInput icon="person-outline" value={tarjeta.titular} onChangeText={(v: string) => setTarjeta({...tarjeta, titular: v})} placeholder="Como aparece en la tarjeta" hasError={!!errTarjeta.titular} />
            </FormField>

            <FormField label="Número de la tarjeta" required error={errTarjeta.numero}>
              <IconInput icon="card-outline" value={tarjeta.numero} onChangeText={(v: string) => setTarjeta({...tarjeta, numero: formatNumero(v)})} placeholder="0000 0000 0000 0000" keyboardType="numeric" hasError={!!errTarjeta.numero} maxLength={19} />
            </FormField>

            <View style={s.formRow}>
              <View style={{ flex: 1 }}>
                <FormField label="Fecha de caducidad" required error={errTarjeta.expiracion}>
                  <IconInput icon="calendar-outline" value={tarjeta.expiracion} onChangeText={(v: string) => setTarjeta({...tarjeta, expiracion: formatExp(v)})} placeholder="MM / AA" keyboardType="numeric" hasError={!!errTarjeta.expiracion} maxLength={7} />
                </FormField>
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="CVC" required error={errTarjeta.cvc}>
                  <IconInput icon="lock-closed-outline" value={tarjeta.cvc} onChangeText={(v: string) => setTarjeta({...tarjeta, cvc: v.replace(/\D/g,'').slice(0,3)})} placeholder="123" keyboardType="numeric" secureTextEntry hasError={!!errTarjeta.cvc} maxLength={3} />
                </FormField>
              </View>
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity style={s.btnSecondary} onPress={onCancel} activeOpacity={0.8}>
                <Text style={s.btnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnPrimary, procesando && { opacity: 0.6 }]} onPress={pagar} disabled={procesando} activeOpacity={0.85}>
                {procesando
                  ? <><ActivityIndicator size="small" color="#fff" /><Text style={s.btnPrimaryText}>Procesando...</Text></>
                  : <><Ionicons name="lock-closed" size={16} color="#fff" /><Text style={s.btnPrimaryText}>{buttonLabel}</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Processing Toast */}
      {procesando && (
        <View style={s.toast}>
          <ActivityIndicator size="small" color="#fff" />
          <View>
            <Text style={s.toastTitle}>Procesando pago...</Text>
            <Text style={s.toastSub}>Esto puede demorar unos segundos.</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function DataItem({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <View style={[s.dataItem, full && { width: '100%' }]}>
      <Text style={s.dataLabel}>{label}</Text>
      <Text style={s.dataValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  // Paso 1 wrapper
  modalWrapper: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalDatos: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 5,
    borderLeftColor: Colors.titulo,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 680,
    ...Shadow.lg,
  },
  // Paso 2
  modalPago: { flex: 1, backgroundColor: Colors.bg },
  pagoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { padding: 4 },
  pagoContent: { gap: Spacing.xl },
  pagoContentWeb: { flexDirection: 'row' as any },
  pagoSection: { flex: 1, gap: Spacing.md },

  modalTitle: { fontSize: 26, fontWeight: '700', color: Colors.titulo, marginBottom: Spacing.xs },
  modalDesc: { fontSize: 13, color: Colors.subtitulo, lineHeight: 20, marginBottom: Spacing.md },

  formGrid: { gap: Spacing.md },
  formRow: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: Spacing.md },

  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  btnSecondary: {
    flex: 1, paddingVertical: 14, borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSecondaryText: { fontWeight: '600', color: Colors.titulo, fontSize: 14 },
  btnPrimary: {
    flex: 1, flexDirection: 'row', gap: Spacing.xs, paddingVertical: 14,
    borderRadius: BorderRadius.md, backgroundColor: Colors.titulo,
    alignItems: 'center', justifyContent: 'center',
    ...Shadow.md,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Personal data section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.titulo },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: 13, color: Colors.subtitulo, fontWeight: '500' },
  personalData: { gap: Spacing.sm },
  dataItem: { gap: 2 },
  dataLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', color: Colors.subtitulo, letterSpacing: 0.5 },
  dataValue: { fontSize: 14, color: Colors.extra1 },

  // Payment summary
  paymentSummary: {
    backgroundColor: 'rgba(198,177,125,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(198,177,125,0.25)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryLabelText: { fontSize: 14, color: Colors.extra1 },
  summaryValue: { fontSize: 14, color: Colors.extra1, fontWeight: '500' },
  detailsExp: { borderLeftWidth: 2, borderLeftColor: 'rgba(198,177,125,0.3)', marginLeft: 8, paddingLeft: 8, gap: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailText: { fontSize: 13, color: Colors.subtitulo },
  summaryTotal: { borderTopWidth: 1.5, borderTopColor: 'rgba(198,177,125,0.3)', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 17, fontWeight: '700', color: Colors.titulo },
  totalValue: { fontSize: 17, fontWeight: '700', color: Colors.titulo },

  // Payment method
  payMethodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  secureBadgeText: { fontSize: 12, color: Colors.subtitulo },

  // Toast
  toast: {
    position: 'absolute' as any,
    top: 24, right: 24,
    backgroundColor: Colors.extra1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    ...Shadow.lg,
    zIndex: 1000,
  },
  toastTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
  toastSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
});
