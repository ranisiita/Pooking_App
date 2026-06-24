import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform, useWindowDimensions,
  Pressable, Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import PaymentHall from '../../../components/PaymentHall';
import { crearReserva } from '../../../services/lodging.service';
import { getUserFriendlyErrorMessage } from '../../../services/error-messages';
import { getStorageItem, setStorageItem } from '../../../services/storage';
import { Colors, Spacing, BorderRadius, Shadow } from '../../../constants/theme';

const API_GATEWAY_URL = process.env.EXPO_PUBLIC_API_GATEWAY_URL ?? '';

// ── Field wrapper ────────────────────────────────────────────────────────────
function FormField({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <View style={ff.wrapper}>
      <Text style={ff.label}>
        {label}
        {required && <Text style={{ color: Colors.titulo }}> *</Text>}
      </Text>
      {children}
      {hint && !error && <Text style={ff.hint}>{hint}</Text>}
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
  hint: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  errorText: { fontSize: 11, color: Colors.error },
});

// ── Icon Input ───────────────────────────────────────────────────────────────
function IconInput({ icon, value, onChangeText, placeholder, keyboardType = 'default', hasError = false, maxLength }: any) {
  return (
    <View style={[inp.wrap, hasError && inp.wrapError]}>
      <Ionicons name={icon} size={16} color={Colors.extra2} />
      <TextInput
        style={inp.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(96,98,86,0.5)"
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
    </View>
  );
}

const inp = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: Colors.accentBorder,
    borderRadius: BorderRadius.sm, paddingHorizontal: 10,
    height: 40, backgroundColor: Colors.bg,
  },
  wrapError: { borderColor: Colors.error },
  input: { flex: 1, fontSize: 13, color: Colors.extra1, minWidth: 0 },
});

// ── Picker dropdown for tipoIdentificacion ───────────────────────────────────
function TipoDocPicker({ value, onChange, hasError }: {
  value: string; onChange: (v: string) => void; hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [triggerLayout, setTriggerLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const triggerRef = React.useRef<View>(null);

  const options = [
    { label: 'Cédula (CED)', value: 'CED' },
    { label: 'RUC', value: 'RUC' },
    { label: 'Pasaporte (PAS)', value: 'PAS' },
  ];
  const selected = options.find(o => o.value === value);

  const openPicker = () => {
    if (triggerRef.current) {
      triggerRef.current.measure((_fx, _fy, width, height, px, py) => {
        setTriggerLayout({ x: px, y: py, width, height });
        setOpen(true);
      });
    } else {
      setOpen(true);
    }
  };

  return (
    <View>
      <TouchableOpacity
        ref={triggerRef as any}
        style={[inp.wrap, hasError && inp.wrapError]}
        onPress={openPicker}
        activeOpacity={0.8}
      >
        <Ionicons name="card-outline" size={16} color={Colors.extra2} />
        <Text style={[inp.input, !selected && { color: 'rgba(96,98,86,0.5)' }]}>
          {selected ? selected.label : 'Selecciona…'}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.extra1} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={ddp.backdrop} onPress={() => setOpen(false)}>
          <View
            style={[
              ddp.menu,
              triggerLayout && {
                position: 'absolute',
                top: triggerLayout.y + triggerLayout.height + 4,
                left: triggerLayout.x,
                width: triggerLayout.width,
              },
            ]}
          >
            {options.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={ddp.item}
                onPress={() => { onChange(opt.value); setOpen(false); }}
              >
                <Text style={[ddp.text, value === opt.value && ddp.textActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const ddp = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'transparent' },
  menu: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, ...Shadow.md },
  item: { paddingVertical: 12, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  text: { fontSize: 13, color: Colors.extra1 },
  textActive: { fontWeight: '700', color: Colors.titulo },
});

// ── Main Component ────────────────────────────────────────────────────────────
export default function LodgingBookingScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const isWide = (containerWidth || windowWidth) >= 768;

  const params = useLocalSearchParams<{
    id?: string; provider?: string; roomName?: string;
    precio?: string; llegada?: string; salida?: string;
    adultos?: string; ninos?: string; seleccion?: string;
    hotelNombre?: string; hotelImagen?: string; hotelCategoria?: string;
    hotelDireccion?: string; hotelPrecioDesde?: string;
    hotelCheckIn?: string; hotelCheckOut?: string;
  }>();

  // Parse selected rooms from params
  const selectedRooms: any[] = useMemo(() => {
    try { return params.seleccion ? JSON.parse(params.seleccion) : []; }
    catch { return []; }
  }, [params.seleccion]);

  const nights = useMemo(() => {
    if (!params.llegada || !params.salida) return 1;
    return Math.max(1, Math.round((new Date(params.salida).getTime() - new Date(params.llegada).getTime()) / 86400000));
  }, [params.llegada, params.salida]);

  // Format date like the Angular booking component: "vie, 20 may"
  const fmtDate = (val: string): string => {
    if (!val) return '—';
    try {
      return new Date(val + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch { return val; }
  };

  const fmtDateLong = (val: string): string => {
    if (!val) return '—';
    try {
      return new Date(val + 'T12:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return val; }
  };

  const subtotal = useMemo(() => {
    if (selectedRooms.length > 0) {
      return selectedRooms.reduce((sum: number, sel: any) => sum + (sel.precio * sel.habitaciones), 0) * nights;
    }
    return parseFloat(params.precio ?? '0') * nights;
  }, [selectedRooms, params.precio, nights]);

  const iva = +(subtotal * 0.15).toFixed(2);
  const total = +(subtotal + iva).toFixed(2);

  const roomDescription = useMemo(() => {
    if (selectedRooms.length > 0) {
      return selectedRooms.map((sel: any) => `${sel.roomName} (x${sel.habitaciones})`).join(', ');
    }
    return params.roomName ?? 'Habitación';
  }, [selectedRooms, params.roomName]);

  const paymentDetails = useMemo(() => {
    if (selectedRooms.length > 0) {
      return selectedRooms.map((sel: any) => ({
        name: `${sel.roomName} ×${sel.habitaciones} × ${nights}n`,
        value: sel.precio * sel.habitaciones * nights,
      }));
    }
    return [{ name: `${roomDescription} × ${nights} noches`, value: subtotal }];
  }, [selectedRooms, roomDescription, nights, subtotal]);

  // ── Guest Data State ─────────────────────────────────────────────────────────
  const [tipoIdentificacion, setTipoIdentificacion] = useState('');
  const [numeroIdentificacion, setNumeroIdentificacion] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Prefill from auth storage
  useEffect(() => {
    (async () => {
      const token = await getStorageItem('token');
      const usuarioGuid = await getStorageItem('usuarioGuid');
      if (token && usuarioGuid) {
        try {
          const res = await fetch(`${API_GATEWAY_URL}/api/v2/booking/clientes/usuario-guid/${usuarioGuid}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const json = await res.json();
            const c = json?.data;
            if (c) {
              if (c.tipoIdentificacion) setTipoIdentificacion(c.tipoIdentificacion === 'CI' || c.tipoIdentificacion === 'CEDULA' ? 'CED' : 'PAS');
              if (c.numeroIdentificacion) setNumeroIdentificacion(c.numeroIdentificacion || '');
              if (c.nombres) setNombres(c.nombres || '');
              if (c.apellidos) setApellidos(c.apellidos || '');
              if (c.correo) setCorreo(c.correo || '');
              if (c.telefono) setTelefono(c.telefono || '');
              if (c.direccion) setDireccion(c.direccion || '');
            }
          }
        } catch {}
      }
    })();
  }, []);

  // ── Validation ───────────────────────────────────────────────────────────────
  function getFieldError(field: string): string {
    if (!touched.has(field)) return '';
    if (field === 'tipoIdentificacion' && !tipoIdentificacion) return 'Selecciona el tipo de identificación';
    if (field === 'numeroIdentificacion') {
      if (!numeroIdentificacion) return 'El número de identificación es requerido';
      if (tipoIdentificacion === 'CED' && !/^\d{10}$/.test(numeroIdentificacion)) return 'La cédula debe tener exactamente 10 dígitos';
      if (tipoIdentificacion === 'RUC' && !/^\d{13}$/.test(numeroIdentificacion)) return 'El RUC debe tener exactamente 13 dígitos';
      if (tipoIdentificacion === 'PAS' && (numeroIdentificacion.length < 5 || numeroIdentificacion.length > 20)) return 'El pasaporte debe tener entre 5 y 20 caracteres';
    }
    if (field === 'nombres' && !nombres.trim()) return 'Los nombres son requeridos';
    if (field === 'correo') {
      if (!correo) return 'El correo electrónico es requerido';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return 'El correo debe tener un dominio válido';
    }
    if (field === 'telefono') {
      if (!telefono) return 'El teléfono es requerido';
      if (!/^\d{9,15}$/.test(telefono)) return 'El teléfono debe tener entre 9 y 15 dígitos';
    }
    if (field === 'direccion' && !direccion.trim()) return 'La dirección es requerida';
    return '';
  }

  function validateAll(): boolean {
    const fields = ['tipoIdentificacion', 'numeroIdentificacion', 'nombres', 'correo', 'telefono', 'direccion'];
    const newTouched = new Set(fields);
    setTouched(newTouched);
    const newErrors: Record<string, string> = {};
    fields.forEach(f => {
      const err = getFieldError(f);
      if (err) newErrors[f] = err;
    });
    // Run again with full touched set
    const errMap: Record<string, string> = {};
    if (!tipoIdentificacion) errMap['tipoIdentificacion'] = 'Selecciona el tipo de identificación';
    if (!numeroIdentificacion) errMap['numeroIdentificacion'] = 'El número de identificación es requerido';
    else if (tipoIdentificacion === 'CED' && !/^\d{10}$/.test(numeroIdentificacion)) errMap['numeroIdentificacion'] = 'La cédula debe tener exactamente 10 dígitos';
    else if (tipoIdentificacion === 'RUC' && !/^\d{13}$/.test(numeroIdentificacion)) errMap['numeroIdentificacion'] = 'El RUC debe tener exactamente 13 dígitos';
    else if (tipoIdentificacion === 'PAS' && (numeroIdentificacion.length < 5 || numeroIdentificacion.length > 20)) errMap['numeroIdentificacion'] = 'El pasaporte debe tener entre 5 y 20 caracteres';
    if (!nombres.trim()) errMap['nombres'] = 'Los nombres son requeridos';
    if (!correo) errMap['correo'] = 'El correo electrónico es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errMap['correo'] = 'El correo debe tener un dominio válido';
    if (!telefono) errMap['telefono'] = 'El teléfono es requerido';
    else if (!/^\d{9,15}$/.test(telefono)) errMap['telefono'] = 'El teléfono debe tener entre 9 y 15 dígitos';
    if (!direccion.trim()) errMap['direccion'] = 'La dirección es requerida';
    setErrors(errMap);
    return Object.keys(errMap).length === 0;
  }

  // ── Steps ────────────────────────────────────────────────────────────────────
  const [paso, setPaso] = useState<'datos' | 'pago'>('datos');
  const [procesando, setProcesando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reservaExitosa, setReservaExitosa] = useState<{ codigo: string; total: number } | null>(null);

  const submitDatos = () => {
    if (!validateAll()) return;
    setPaso('pago');
  };

  // Called when PaymentHall signals payment done — do the real API POST
  const procesarPagoYReserva = async () => {
    if (!params.id || !params.provider) return;
    setProcesando(true);
    setErrorMsg(null);

    const habitacionesPayload = selectedRooms.map((sel: any) => ({
      tipoHabitacionGuid: sel.roomId,
      numHabitaciones: sel.habitaciones,
      numAdultos: sel.adultos,
      numNinos: sel.ninos,
    }));

    const payload = {
      sucursalGuid: params.id,
      fechaInicio: (params.llegada || '') + 'T14:00:00.000Z',
      fechaFin: (params.salida || '') + 'T12:00:00.000Z',
      observaciones: observaciones || 'Reserva desde marketplace',
      esWalkin: false,
      origenCanalReserva: 'MARKETPLACE',
      cliente: {
        tipoIdentificacion,
        numeroIdentificacion,
        nombres,
        apellidos: apellidos || '',
        correo,
        telefono,
        direccion,
      },
      habitaciones: habitacionesPayload,
    };

    let res;
    try {
      res = await crearReserva(params.provider, payload);
    } catch (err) {
      // 409 → "Ya no existe disponibilidad en el horario escogido." (y otros status mapeados)
      setProcesando(false);
      setErrorMsg(getUserFriendlyErrorMessage(err, 'booking'));
      return;
    }
    setProcesando(false);

    // Save to middleware
    const token = await getStorageItem('token');
    const guidCliente = await getStorageItem('guidCliente') || await getStorageItem('clienteGuid') || await getStorageItem('usuarioGuid') || '';
    if (guidCliente) {
      try {
        await fetch(`${API_GATEWAY_URL}/api/v2/booking/clientes/reservas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            guidCliente,
            guidServicioRef: res.sucursalGuid || params.id,
            nombreServicioSnap: params.provider,
            tipoServicioSnap: 'alojamiento',
            nombreProveedor: params.provider,
            idReservaExterna: res.reservaGuid || '',
            fechaInicio: (params.llegada || '') + 'T14:00:00.000Z',
            fechaFin: (params.salida || '') + 'T12:00:00.000Z',
            canalOrigen: 'MARKETPLACE',
            montoTotal: res.totalReserva || total,
            moneda: 'USD',
            observaciones: observaciones || 'Reserva desde marketplace',
          }),
        });
      } catch {}
    }

    const successCode = res.codigoReserva || `RES-${Math.floor(Math.random() * 90000 + 10000)}`;
    setReservaExitosa({ codigo: successCode, total: res.totalReserva || total });
  };

  if (reservaExitosa) {
    return (
      <View style={s.root}>
        <Navbar />
        <ScrollView contentContainerStyle={[s.scroll, { padding: Spacing.md, paddingBottom: 80, alignItems: 'center', justifyContent: 'center' }]}>
          <View style={s.successCard}>
            <View style={s.successIconCircle}>
              <Ionicons name="checkmark" size={32} color={Colors.success} />
            </View>
            <Text style={s.successTitle}>¡Reserva confirmada!</Text>
            <Text style={s.successSub}>
              Tu solicitud fue enviada exitosamente. El hotel procesará tu reserva y recibirás la confirmación en tu correo.
            </Text>

            <View style={s.successCodeBox}>
              <Text style={s.successCodeLabel}>Código de reserva</Text>
              <Text style={s.successCodeVal}>{reservaExitosa.codigo}</Text>
            </View>

            {/* success-meta grid like Angular */}
            <View style={s.successMetaGrid}>
              <View style={s.successMetaItemFull}>
                <Text style={s.successMetaLabel}>Alojamiento</Text>
                <Text style={s.successMetaVal}>{params.hotelNombre || 'Hotel'}</Text>
              </View>

              <View style={s.successMetaRow}>
                <View style={s.successMetaItem}>
                  <Text style={s.successMetaLabel}>Check-in</Text>
                  <Text style={s.successMetaVal}>{fmtDateLong(params.llegada || '')}</Text>
                </View>
                <View style={s.successMetaItem}>
                  <Text style={s.successMetaLabel}>Check-out</Text>
                  <Text style={s.successMetaVal}>{fmtDateLong(params.salida || '')}</Text>
                </View>
              </View>

              <View style={s.successMetaRow}>
                <View style={s.successMetaItem}>
                  <Text style={s.successMetaLabel}>Total reserva</Text>
                  <Text style={s.successMetaVal}>${reservaExitosa.total.toFixed(2)} USD</Text>
                </View>
                <View style={s.successMetaItem}>
                  <Text style={s.successMetaLabel}>Saldo pendiente</Text>
                  <Text style={s.successMetaVal}>${reservaExitosa.total.toFixed(2)} USD</Text>
                </View>
              </View>
            </View>

            <View style={s.successActionsCol}>
              <TouchableOpacity style={s.successBtnPrimary} onPress={() => router.push('/profile')}>
                <Text style={s.successBtnPrimaryText}>Ver mis reservas →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.successBtnSecondary} onPress={() => router.push('/alojamiento/resultados' as any)}>
                <Text style={s.successBtnSecondaryText}>Ver más hoteles</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Footer />
        </ScrollView>
      </View>
    );
  }

  // ── Payment Hall ─────────────────────────────────────────────────────────────
  if (paso === 'pago') {
    return (
      <View style={s.root}>
        <Navbar />
        {procesando && (
          <View style={s.toast}>
            <ActivityIndicator size="small" color="#fff" />
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Realizando reserva...</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>Esto puede demorar unos segundos.</Text>
            </View>
          </View>
        )}
        <PaymentHall
          subtotal={subtotal}
          iva={iva}
          total={total}
          ivaLabel="15%"
          itemName={roomDescription}
          customDetails={paymentDetails}
          initialNombre={`${nombres} ${apellidos}`.trim()}
          initialEmail={correo}
          initialTelefono={telefono}
          onPagoExitoso={procesarPagoYReserva}
          onCancel={() => setPaso('datos')}
          buttonLabel="Confirmar reserva"
          footer={<Footer />}
        />
        {errorMsg && (
          <View style={s.errorBar}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={{ fontSize: 13, color: Colors.error, flex: 1 }}>{errorMsg}</Text>
            <TouchableOpacity onPress={() => setErrorMsg(null)}><Ionicons name="close" size={18} color={Colors.subtitulo} /></TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  const renderSidebar = () => (
    <View style={s.bookingCard}>
      {/* Hotel mini-card */}
      {params.hotelNombre && (
        <View style={s.bcHotel}>
          {params.hotelImagen ? (
            <Image source={{ uri: params.hotelImagen }} style={s.bcHotelImg} resizeMode="cover" />
          ) : (
            <View style={[s.bcHotelImg, { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="business" size={24} color={Colors.titulo} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.bcHotelName} numberOfLines={2}>{params.hotelNombre}</Text>
            {params.hotelCategoria && parseInt(params.hotelCategoria) > 0 && (
              <View style={s.bcStarsRow}>
                {Array(parseInt(params.hotelCategoria)).fill(0).map((_, i) => (
                  <Text key={i} style={s.bcStar}>★</Text>
                ))}
              </View>
            )}
            {params.hotelDireccion && (
              <Text style={s.bcHotelLoc} numberOfLines={2}>{params.hotelDireccion}</Text>
            )}
          </View>
        </View>
      )}

      {/* Precio desde */}
      {params.hotelPrecioDesde && (
        <View>
          <Text style={s.bcDesde}>desde</Text>
          <View style={s.bcPriceLine}>
            <Text style={s.bcPrice}>${params.hotelPrecioDesde}</Text>
            <Text style={s.bcNoche}> USD / noche</Text>
          </View>
        </View>
      )}

      {/* Separator */}
      <View style={s.pbDivider} />

      {/* Date grid */}
      <View style={s.dateGrid}>
        <View style={s.dateCell}>
          <Text style={s.dcLabel}>Check-in</Text>
          <Text style={s.dcVal}>{fmtDate(params.llegada || '')}</Text>
          <Text style={s.dcSub}>desde {params.hotelCheckIn || '14:00'}</Text>
        </View>
        <View style={[s.dateCell, { borderLeftWidth: 1, borderLeftColor: Colors.border }]}>
          <Text style={s.dcLabel}>Check-out</Text>
          <Text style={s.dcVal}>{fmtDate(params.salida || '')}</Text>
          <Text style={s.dcSub}>hasta {params.hotelCheckOut || '12:00'}</Text>
        </View>
      </View>

      {/* Huéspedes y habitaciones */}
      <View style={s.guestsRow}>
        <Ionicons name="people-outline" size={16} color={Colors.extra2} />
        <View style={{ flex: 1 }}>
          <Text style={s.grLabel}>Huéspedes y habitaciones</Text>
          <Text style={s.grVal}>
            {params.adultos} adulto{parseInt(params.adultos || '1') !== 1 ? 's' : ''}
            {params.ninos && params.ninos !== '0' ? ` · ${params.ninos} niño${parseInt(params.ninos) !== 1 ? 's' : ''}` : ''}
            {selectedRooms.length > 0 ? ` · ${selectedRooms.reduce((s, r) => s + r.habitaciones, 0)} hab.` : ''}
          </Text>
        </View>
      </View>

      {/* Precio breakdown */}
      <View style={s.priceBreakdown}>
        <Text style={s.pbTitle}>Desglose del precio</Text>
        {paymentDetails.map((d, i) => (
          <View key={i} style={s.pbRow}>
            <Text style={s.pbLabel} numberOfLines={3}>{d.name}</Text>
            <Text style={s.pbVal}>${d.value.toFixed(2)}</Text>
          </View>
        ))}
        <View style={s.pbRow}>
          <Text style={s.pbLabel}>IVA (15%)</Text>
          <Text style={s.pbVal}>${iva.toFixed(2)}</Text>
        </View>
        <View style={s.pbDivider} />
        <View style={s.pbRow}>
          <Text style={[s.pbLabel, { fontWeight: '700', color: Colors.titulo }]}>Total reserva</Text>
          <Text style={[s.pbVal, { fontWeight: '800', color: Colors.titulo, fontSize: 16 }]}>${total.toFixed(2)}</Text>
        </View>
        <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 4 }}>Saldo pendiente: ${total.toFixed(2)} USD</Text>
      </View>

      {/* CTA */}
      <TouchableOpacity style={s.btnReservar} onPress={submitDatos} activeOpacity={0.85}>
        <Ionicons name="heart" size={16} color="#fff" />
        <Text style={s.btnReservarText}>Confirmar reserva</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btnVolver} onPress={() => router.back()}>
        <Text style={s.btnVolverText}>← Volver al hotel</Text>
      </TouchableOpacity>
      <View style={s.securityRow}>
        <Ionicons name="shield-checkmark-outline" size={14} color={Colors.subtitulo} />
        <Text style={{ fontSize: 11, color: Colors.subtitulo }}>Reserva segura · sin cargos ocultos</Text>
      </View>
    </View>
  );

  // ── Step 1: Guest Data Form ──────────────────────────────────────────────────
  return (
    <View style={s.root} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      <Navbar />
      <ScrollView contentContainerStyle={[s.scroll, { padding: isWide ? Spacing.xl : Spacing.md }]} keyboardShouldPersistTaps="handled">

        {/* Page header with step indicator */}
        <View style={s.stepperRow}>
          <View style={[s.step, s.stepDone]}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
          <View style={[s.stepLine, s.stepLineDone]} />
          <View style={[s.step, s.stepDone]}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
          <View style={[s.stepLine, s.stepLineDone]} />
          <View style={[s.step, s.stepActive]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>3</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg, paddingHorizontal: 4 }}>
          {['Alojamiento', 'Habitación', 'Confirmación'].map((lbl, i) => (
            <Text key={i} style={{ fontSize: 10, color: i === 2 ? Colors.titulo : Colors.subtitulo, fontWeight: i === 2 ? '700' : '400', flex: 1, textAlign: i === 1 ? 'center' : i === 0 ? 'left' : 'right' }}>{lbl}</Text>
          ))}
        </View>

        <View style={[s.pageWrap, isWide && s.pageWrapWide]}>

          {/* ── MAIN COLUMN ── */}
          <View style={[s.mainCol, isWide && { flex: 2 }]}>

            {/* Section: Datos del huésped */}
            <View style={s.card}>
              <Text style={s.sectionTitle}>Datos del huésped</Text>
              <View style={s.formGrid}>
                <View style={[s.row, isWide && s.rowWide, { zIndex: 999 }]}>
                  <View style={isWide && { flex: 1 }}>
                    <FormField label="Tipo de identificación" required error={errors['tipoIdentificacion']}>
                      <TipoDocPicker
                        value={tipoIdentificacion}
                        onChange={(v) => { setTipoIdentificacion(v); setTouched(p => new Set([...p, 'tipoIdentificacion'])); }}
                        hasError={!!errors['tipoIdentificacion']}
                      />
                    </FormField>
                  </View>
                  <View style={isWide && { flex: 1 }}>
                    <FormField label="Número de identificación" required error={errors['numeroIdentificacion']}>
                      <IconInput icon="id-card-outline" value={numeroIdentificacion}
                        onChangeText={(v: string) => { setNumeroIdentificacion(v); setTouched(p => new Set([...p, 'numeroIdentificacion'])); }}
                        placeholder="Ej. 1723456789" keyboardType="default" hasError={!!errors['numeroIdentificacion']} />
                    </FormField>
                  </View>
                </View>

                <View style={[s.row, isWide && s.rowWide]}>
                  <View style={isWide && { flex: 1 }}>
                    <FormField label="Nombres" required error={errors['nombres']}>
                      <IconInput icon="person-outline" value={nombres}
                        onChangeText={(v: string) => { setNombres(v); setTouched(p => new Set([...p, 'nombres'])); }}
                        placeholder="Ej. Juan Carlos" hasError={!!errors['nombres']} />
                    </FormField>
                  </View>
                  <View style={isWide && { flex: 1 }}>
                    <FormField label="Apellidos" hint="Opcional">
                      <IconInput icon="person-outline" value={apellidos}
                        onChangeText={setApellidos}
                        placeholder="Ej. Pérez García" />
                    </FormField>
                  </View>
                </View>

                <View style={[s.row, isWide && s.rowWide]}>
                  <View style={isWide && { flex: 1 }}>
                    <FormField label="Correo electrónico" required error={errors['correo']} hint={!errors['correo'] ? 'Te enviaremos la confirmación aquí' : undefined}>
                      <IconInput icon="mail-outline" value={correo}
                        onChangeText={(v: string) => { setCorreo(v); setTouched(p => new Set([...p, 'correo'])); }}
                        placeholder="correo@ejemplo.com" keyboardType="email-address" hasError={!!errors['correo']} />
                    </FormField>
                  </View>
                  <View style={isWide && { flex: 1 }}>
                    <FormField label="Teléfono" required error={errors['telefono']}>
                      <IconInput icon="call-outline" value={telefono}
                        onChangeText={(v: string) => { setTelefono(v.replace(/\D/g, '')); setTouched(p => new Set([...p, 'telefono'])); }}
                        placeholder="Ej. 0999999999" keyboardType="numeric" hasError={!!errors['telefono']} />
                    </FormField>
                  </View>
                </View>

                <FormField label="Dirección" required error={errors['direccion']}>
                  <IconInput icon="location-outline" value={direccion}
                    onChangeText={(v: string) => { setDireccion(v); setTouched(p => new Set([...p, 'direccion'])); }}
                    placeholder="Ej. Quito, Pichincha" hasError={!!errors['direccion']} />
                </FormField>
              </View>
            </View>

            {/* Section: Habitaciones seleccionadas */}
            <View style={s.card}>
              <Text style={s.sectionTitle}>Habitaciones seleccionadas</Text>
              {selectedRooms.length === 0 ? (
                <Text style={{ fontSize: 13, color: Colors.subtitulo, fontStyle: 'italic' }}>No hay habitaciones seleccionadas.</Text>
              ) : (
                selectedRooms.map((sel: any, i: number) => (
                  <View key={i} style={s.roomRow}>
                    <View style={s.roomRowCheck}>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.titulo} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.roomRowName}>{sel.roomName}</Text>
                      <View style={s.roomRowMeta}>
                        <View style={s.roomMetaPill}>
                          <Text style={s.roomMetaPillText}>{sel.habitaciones} hab.</Text>
                        </View>
                        <View style={s.roomMetaPill}>
                          <Text style={s.roomMetaPillText}>{sel.adultos} adultos</Text>
                        </View>
                        {sel.ninos > 0 && (
                          <View style={s.roomMetaPill}>
                            <Text style={s.roomMetaPillText}>{sel.ninos} niños</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={s.roomRowPrice}>${(sel.precio * sel.habitaciones).toFixed(0)}/n</Text>
                  </View>
                ))
              )}
            </View>

            {/* Section: Peticiones especiales */}
            <View style={s.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Ionicons name="create-outline" size={18} color={Colors.titulo} />
                <Text style={s.sectionTitle}>Peticiones especiales</Text>
              </View>
              <Text style={{ fontSize: 12, color: Colors.subtitulo, lineHeight: 18, marginBottom: Spacing.sm }}>
                ¿Tienes alguna necesidad particular? Házselo saber al hotel (preferencia de cama, horario de check-in, etc.).
              </Text>
              <View style={[inp.wrap, { height: 'auto', alignItems: 'flex-start', paddingVertical: 10 }]}>
                <TextInput
                  style={{ flex: 1, fontSize: 13, color: Colors.extra1, minHeight: 70, textAlignVertical: 'top' }}
                  value={observaciones}
                  onChangeText={setObservaciones}
                  placeholder="Ej. Llegamos después de las 20:00, preferimos habitación en piso alto..."
                  placeholderTextColor="rgba(96,98,86,0.5)"
                  multiline
                />
              </View>
              <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 4 }}>
                El hotel intentará satisfacer tus peticiones especiales sujeto a disponibilidad.
              </Text>
            </View>
          </View>

          {/* ── BOOKING SIDEBAR ── */}
          <View style={[s.sidebar, isWide && { flex: 1, marginLeft: Spacing.lg, marginTop: 0 }]}>
            {renderSidebar()}
          </View>

        </View>
        <Footer />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1 },

  // Stepper
  stepperRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  step: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepDone: { backgroundColor: Colors.titulo },
  stepActive: { backgroundColor: Colors.titulo, opacity: 1 },
  stepLine: { flex: 1, height: 2 },
  stepLineDone: { backgroundColor: Colors.titulo },

  // Layout
  pageWrap: { gap: Spacing.lg },
  pageWrapWide: { flexDirection: 'row', maxWidth: 1100, alignSelf: 'center', width: '100%' },
  mainCol: { gap: Spacing.lg },
  sidebar: { marginTop: Spacing.lg },

  // Cards
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.titulo },

  // Form
  formGrid: { gap: Spacing.md },
  row: { gap: Spacing.md },
  rowWide: { flexDirection: 'row', gap: Spacing.md },

  // Room rows
  roomRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  roomRowCheck: { marginTop: 2 },
  roomRowName: { fontSize: 14, fontWeight: '700', color: Colors.titulo },
  roomRowMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  roomMetaPill: { backgroundColor: Colors.primaryLight, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  roomMetaPillText: { fontSize: 11, fontWeight: '600', color: Colors.titulo },
  roomRowPrice: { fontSize: 13, fontWeight: '700', color: Colors.extra1 },

  // Summary box
  summaryBox: {
    backgroundColor: 'rgba(198,177,125,0.08)',
    borderWidth: 1, borderColor: 'rgba(198,177,125,0.25)',
    borderRadius: BorderRadius.md, padding: Spacing.md, gap: 4,
  },

  // Booking card sidebar
  bookingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.accentBorder,
    padding: Spacing.md, gap: Spacing.md, ...Shadow.md,
  },
  dateGrid: { flexDirection: 'row', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, overflow: 'hidden' },
  dateCell: { flex: 1, padding: 10, alignItems: 'center', backgroundColor: Colors.bg },
  dcLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', color: Colors.subtitulo, letterSpacing: 0.5 },
  dcVal: { fontSize: 13, fontWeight: '700', color: Colors.extra1, marginTop: 2 },
  dcSub: { fontSize: 10, color: Colors.textMuted },
  guestsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: Colors.subtitulo },
  grVal: { fontSize: 13, fontWeight: '600', color: Colors.extra1 },
  priceBreakdown: { gap: 6 },
  pbTitle: { fontSize: 12, fontWeight: '700', color: Colors.extra1, marginBottom: 4 },
  pbRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pbLabel: { fontSize: 12, color: Colors.subtitulo, flex: 1 },
  pbVal: { fontSize: 12, color: Colors.extra1, fontWeight: '500', marginLeft: 8 },
  pbDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  btnReservar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.titulo, borderRadius: BorderRadius.md, paddingVertical: 14, ...Shadow.sm },
  btnReservarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnVolver: { alignItems: 'center', paddingVertical: 8 },
  btnVolverText: { fontSize: 13, color: Colors.subtitulo },
  securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },

  // Hotel mini-card in booking sidebar
  bcHotel: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bcHotelImg: { width: 68, height: 52, borderRadius: BorderRadius.sm, overflow: 'hidden' },
  bcHotelName: { fontSize: 13, fontWeight: '700', color: Colors.titulo, lineHeight: 18 },
  bcStarsRow: { flexDirection: 'row', gap: 1, marginTop: 2 },
  bcStar: { fontSize: 11, color: '#F5C518' },
  bcHotelLoc: { fontSize: 11, color: Colors.subtitulo, marginTop: 3, lineHeight: 14 },
  bcDesde: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', color: Colors.subtitulo, letterSpacing: 0.4 },
  bcPriceLine: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  bcPrice: { fontSize: 22, fontWeight: '800', color: Colors.titulo },
  bcNoche: { fontSize: 12, color: Colors.subtitulo },

  // Buttons
  btnPrimary: { flexDirection: 'row', gap: 6, paddingVertical: 14, borderRadius: BorderRadius.md, backgroundColor: Colors.titulo, alignItems: 'center', justifyContent: 'center', ...Shadow.sm },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnSecondary: { paddingVertical: 14, borderRadius: BorderRadius.md, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  btnSecondaryText: { fontWeight: '600', color: Colors.titulo, fontSize: 14 },

  // Toast / error
  toast: { position: 'absolute', top: 80, right: 16, backgroundColor: Colors.extra1, borderRadius: BorderRadius.md, padding: Spacing.md, flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', ...Shadow.lg, zIndex: 999 },
  errorBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(192,57,43,0.1)', borderTopWidth: 1, borderTopColor: 'rgba(192,57,43,0.2)', padding: Spacing.md },

  // Success screen metadata
  successMetaGrid: { width: '100%', gap: 8, marginVertical: Spacing.xs },
  successMetaRow: { flexDirection: 'row', gap: 8, width: '100%' },
  successMetaItem: { flex: 1, backgroundColor: Colors.bg, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: Colors.border },
  successMetaItemFull: { width: '100%', backgroundColor: Colors.bg, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: Colors.border },
  successMetaLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', color: Colors.subtitulo, letterSpacing: 0.5 },
  successMetaVal: { fontSize: 13, fontWeight: '600', color: Colors.extra1, marginTop: 2 },

  // New success card styles
  successCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl, // 20px
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 450,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.md,
    borderTopWidth: 4,
    borderTopColor: Colors.success,
    marginVertical: Spacing.md,
  },
  successIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eaf7ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.titulo,
    textAlign: 'center',
  },
  successSub: {
    fontSize: 13,
    color: Colors.subtitulo,
    textAlign: 'center',
    lineHeight: 19,
  },
  successCodeBox: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  successCodeLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: Colors.subtitulo,
    letterSpacing: 0.7,
  },
  successCodeVal: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.titulo,
    letterSpacing: 1,
    marginTop: 3,
  },
  successActionsCol: {
    width: '100%',
    gap: 8,
    marginTop: Spacing.sm,
  },
  successBtnPrimary: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: BorderRadius.full, // pill button like Angular
    backgroundColor: Colors.titulo,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  successBtnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  successBtnSecondary: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successBtnSecondaryText: {
    color: Colors.subtitulo,
    fontWeight: '600',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
