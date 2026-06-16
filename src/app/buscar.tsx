import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, KeyboardAvoidingView, Modal,
  Pressable, useWindowDimensions, ImageBackground,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Colors, Spacing, BorderRadius, Shadow } from '../constants/theme';

// On web, Expo serves the public/ folder as static files at the root URL.
// On native, Metro bundles the image via require().
const BG_NATIVE = require('../../public/images/search_fondo.jpg');
const GRADIENT_OVERLAY = 'linear-gradient(to right, rgba(142,90,84,0.20) 0%, rgba(251,248,234,0.65) 60%, #fbf8ea 100%)';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toISODate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const hoy = toISODate();
const manana = toISODate(new Date(Date.now() + 86400000));

// ─── Data ─────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'alojamiento', icon: 'hotel' as const,               label: 'Alojamiento' },
  { key: 'vuelos',      icon: 'flight' as const,              label: 'Vuelos'      },
  { key: 'coches',      icon: 'directions-car' as const,      label: 'Coches'      },
  { key: 'atracciones', icon: 'confirmation-number' as const, label: 'Atracciones' },
];

const CAR_PROVIDERS = [
  { value: '',       label: 'Selecciona un proveedor' },
  { value: 'todos',  label: 'Todos' },
  { value: 'martin', label: 'RedCar' },
  { value: 'ana',    label: 'BudgetCar' },
  { value: 'dylan',  label: 'Europcar' },
  { value: 'kath',   label: 'Rentix' },
];

const CAR_CATEGORIES = [
  { value: '',          label: 'Cualquiera' },
  { value: 'economico', label: 'Económico' },
  { value: 'compacto',  label: 'Compacto' },
  { value: 'suv',       label: 'SUV' },
  { value: 'premium',   label: 'Premium' },
];

const TRANSMISSIONS = [
  { value: '',          label: 'Cualquiera' },
  { value: 'AUTOMATICA', label: 'Automática' },
  { value: 'MANUAL',    label: 'Manual' },
];

const SORT_OPTIONS = [
  { value: '',           label: 'Relevancia' },
  { value: 'price_asc',  label: 'Precio: Menor a Mayor' },
  { value: 'price_desc', label: 'Precio: Mayor a Menor' },
];

const ATTRACTION_PROVIDERS = [
  { value: 'todos',  label: 'Todos' },
  { value: 'viator', label: 'Viator' },
  { value: 'airbnb', label: 'Airbnb Experiences' },
];

// ─── Atoms ────────────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: string }) {
  return <Text style={a.label}>{children}</Text>;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <View style={a.errorRow}>
      <MaterialIcons name="error-outline" size={13} color={Colors.error} />
      <Text style={a.errorText}>{msg}</Text>
    </View>
  );
}

interface InputFieldProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  icon?: React.ComponentProps<typeof MaterialIcons>['name'];
  keyboardType?: 'default' | 'numeric';
  hasError?: boolean;
  type?: string; // web only
}
function InputField({ value, onChangeText, placeholder, icon, keyboardType = 'default', hasError, type }: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[a.inputWrap, focused && a.inputWrapFocused, hasError && a.inputWrapError]}>
      {icon && <MaterialIcons name={icon} size={18} color={Colors.extra2} style={a.inputIcon} />}
      <TextInput
        style={a.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(96,98,86,0.5)"
        keyboardType={keyboardType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        // @ts-ignore — web-only prop
        type={Platform.OS === 'web' ? (type ?? 'text') : undefined}
      />
    </View>
  );
}

// ─── Date input (native <input type="date"> on web) ──────────────────────────
function DateField({ value, onChange, icon, hasError }: { value: string; onChange: (v: string) => void; icon?: React.ComponentProps<typeof MaterialIcons>['name']; hasError?: boolean }) {
  const [focused, setFocused] = useState(false);
  if (Platform.OS === 'web') {
    return (
      <View style={[a.inputWrap, focused && a.inputWrapFocused, hasError && a.inputWrapError]}>
        {icon && <MaterialIcons name={icon} size={18} color={Colors.extra2} style={a.inputIcon} />}
        {/* @ts-ignore */}
        <input
          type="date"
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: Colors.extra1, outline: 'none', fontFamily: 'Poppins-Regular, sans-serif' } as any}
        />
      </View>
    );
  }
  return (
    <InputField value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" icon={icon} hasError={hasError} />
  );
}

// ─── Select / Picker ─────────────────────────────────────────────────────────
interface SelectOption { value: string; label: string; }
interface SelectFieldProps { value: string; onChange: (v: string) => void; options: SelectOption[]; icon?: React.ComponentProps<typeof MaterialIcons>['name']; }

function SelectField({ value, onChange, options, icon }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label ?? options[0]?.label;

  if (Platform.OS === 'web') {
    return (
      <View style={a.inputWrap}>
        {icon && <MaterialIcons name={icon} size={18} color={Colors.extra2} style={a.inputIcon} />}
        {/* @ts-ignore */}
        <select
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: Colors.extra1, outline: 'none', fontFamily: 'Poppins-Regular, sans-serif', cursor: 'pointer' } as any}
        >
          {options.map(o => (
            // @ts-ignore
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity style={a.inputWrap} onPress={() => setOpen(true)} activeOpacity={0.8}>
        {icon && <MaterialIcons name={icon} size={18} color={Colors.extra2} style={a.inputIcon} />}
        <Text style={[a.input, { paddingVertical: 0 }]}>{selectedLabel}</Text>
        <MaterialIcons name="keyboard-arrow-down" size={18} color={Colors.subtitulo} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={a.pickerOverlay} onPress={() => setOpen(false)}>
          <View style={a.pickerSheet}>
            {options.map(o => (
              <TouchableOpacity
                key={o.value}
                style={[a.pickerItem, o.value === value && a.pickerItemActive]}
                onPress={() => { onChange(o.value); setOpen(false); }}
              >
                <Text style={[a.pickerItemText, o.value === value && a.pickerItemTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Search Button ────────────────────────────────────────────────────────────
function SearchBtn({ label, onPress, fullWidth = false }: { label: string; onPress: () => void; fullWidth?: boolean }) {
  return (
    <TouchableOpacity
      style={[a.searchBtn, fullWidth && a.searchBtnFull]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <MaterialIcons name="search" size={18} color="#fff" />
      <Text style={a.searchBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Shared atom styles ───────────────────────────────────────────────────────
const a = StyleSheet.create({
  label: {
    fontSize: 11, fontWeight: '600', textTransform: 'uppercase',
    color: Colors.extra1, letterSpacing: 0.5, marginBottom: 5,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(198,177,125,0.5)',
    borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'web' ? 10 : 10,
    backgroundColor: Colors.bg,
  },
  inputWrapFocused: {
    borderColor: Colors.titulo,
    ...Platform.select({ web: { boxShadow: '0 0 0 3px rgba(142,90,84,0.1)' } as any }),
  },
  inputWrapError: {
    borderColor: Colors.error,
    ...Platform.select({ web: { boxShadow: '0 0 0 3px rgba(192,57,43,0.1)' } as any }),
  },
  inputIcon: { marginRight: 8, flexShrink: 0 },
  input: { flex: 1, fontSize: 14, color: Colors.extra1, fontFamily: undefined },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  errorText: { fontSize: 11, color: Colors.error, fontWeight: '500' },

  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.titulo, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: Spacing.xl,
    alignSelf: 'center', marginTop: Spacing.sm, minWidth: 200,
    ...Shadow.md,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'background 0.2s ease, transform 0.2s ease' } as any,
    }),
  },
  searchBtnFull: { alignSelf: 'stretch', minWidth: undefined },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Picker (native only)
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32, maxHeight: '70%',
  },
  pickerItem: {
    paddingVertical: 14, paddingHorizontal: 24,
    borderBottomWidth: 1, borderBottomColor: 'rgba(198,177,125,0.15)',
  },
  pickerItemActive: { backgroundColor: Colors.primaryLight },
  pickerItemText: { fontSize: 15, color: Colors.extra1 },
  pickerItemTextActive: { color: Colors.titulo, fontWeight: '600' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { width } = useWindowDimensions();
  const isWide = width >= 640;

  const [activeTab, setActiveTab] = useState('alojamiento');

  // State
  const [aloj, setAloj] = useState({ destino: '', llegada: hoy, salida: manana, habitaciones: '1', adultos: '2', ninos: '0' });
  const [alojErr, setAlojErr] = useState<Record<string, string>>({});

  const [vuelos, setVuelos] = useState({ origen: '', destino: '', salida: hoy, regreso: '', tipoViaje: 'roundtrip' as 'roundtrip' | 'oneway' });
  const [vueloErr, setVueloErr] = useState<Record<string, string>>({});
  const [vueloFormErr, setVueloFormErr] = useState('');

  const [coches, setCoches] = useState({ proveedor: '', recogida: hoy, devolucion: manana, categoria: '', transmision: '', marca: '', sort: '' });
  const [cocheErr, setCocheErr] = useState<Record<string, string>>({});

  const [atrac, setAtrac] = useState({ proveedor: 'todos', destino: '', fecha: hoy });

  useEffect(() => {
    const t = params.tab;
    if (t && TABS.some(tab => tab.key === t)) setActiveTab(t);
  }, [params.tab]);

  // ── Validations ──────────────────────────────────────────────────────────
  const validateAloj = () => {
    const e: Record<string, string> = {};
    if (!aloj.destino.trim()) e.destino = 'Por favor, ingresa un destino.';
    if (!aloj.llegada) e.llegada = 'Selecciona una fecha de llegada.';
    if (!aloj.salida) e.salida = 'Selecciona una fecha de salida.';
    else if (aloj.salida < aloj.llegada) e.salida = 'La salida no puede ser anterior a la llegada.';
    if (parseInt(aloj.habitaciones) < 1) e.habitaciones = 'Mínimo 1 habitación.';
    if (parseInt(aloj.adultos) < 1) e.adultos = 'Mínimo 1 adulto.';
    setAlojErr(e);
    return Object.keys(e).length === 0;
  };

  const validateVuelos = () => {
    const e: Record<string, string> = {};
    if (!vuelos.origen.trim()) e.origen = 'Selecciona un aeropuerto de origen.';
    if (!vuelos.destino.trim()) e.destino = 'Selecciona un aeropuerto de destino.';
    if (!vuelos.salida) e.salida = 'Selecciona una fecha de salida.';
    if (vuelos.tipoViaje === 'roundtrip' && !vuelos.regreso) {
      setVueloFormErr('Selecciona una fecha de regreso para ida y vuelta.');
      setVueloErr(e);
      return false;
    }
    setVueloFormErr('');
    setVueloErr(e);
    return Object.keys(e).length === 0;
  };

  const validateCoches = () => {
    const e: Record<string, string> = {};
    if (!coches.recogida) e.recogida = 'Selecciona una fecha de recogida.';
    if (!coches.devolucion) e.devolucion = 'Selecciona una fecha de devolución.';
    else if (coches.devolucion < coches.recogida) e.devolucion = 'La devolución no puede ser antes de la recogida.';
    setCocheErr(e);
    return Object.keys(e).length === 0;
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const buscarAlojamiento = () => {
    if (!validateAloj()) return;
    router.push({ pathname: '/alojamiento/resultados', params: { destino: aloj.destino.trim(), llegada: aloj.llegada, salida: aloj.salida, habitaciones: aloj.habitaciones, adultos: aloj.adultos, ninos: aloj.ninos } });
  };

  const buscarVuelos = () => {
    if (!validateVuelos()) return;
    router.push({ pathname: '/vuelos/resultados' as any, params: { origen: vuelos.origen, destino: vuelos.destino, fecha: vuelos.salida, fechaRegreso: vuelos.tipoViaje === 'roundtrip' ? vuelos.regreso : '', tipoViaje: vuelos.tipoViaje } });
  };

  const buscarCoches = () => {
    if (!validateCoches()) return;
    router.push({ pathname: '/autos/resultados' as any, params: { fechaRecogida: coches.recogida, fechaDevolucion: coches.devolucion, proveedor: coches.proveedor, categoria: coches.categoria, transmision: coches.transmision, marca: coches.marca, sort: coches.sort } });
  };

  const buscarAtracciones = () => {
    router.push({ pathname: '/atracciones/index' as any, params: { proveedor: atrac.proveedor, ciudad: atrac.destino.trim(), fecha: atrac.fecha } });
  };

  // ── Row helper for 2-col grid ─────────────────────────────────────────────
  const Row = ({ children }: { children: React.ReactNode }) => (
    <View style={[s.row, isWide && s.rowWide]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* ── Background: CSS backgroundImage on web (mirrors Angular), ImageBackground on native ── */}
      {Platform.OS === 'web' ? (
        <View
          style={s.bgImage}
          // @ts-ignore — web-only CSS property
          pointerEvents="none"
        >
          <View style={[
            s.bgImage,
            {
              backgroundImage: `${GRADIENT_OVERLAY}, url('/images/search_fondo.jpg')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            } as any,
          ]} />
        </View>
      ) : (
        <ImageBackground source={BG_NATIVE} style={s.bgImage} resizeMode="cover">
          <LinearGradient
            colors={['rgba(142,90,84,0.20)', 'rgba(251,248,234,0.65)', Colors.bg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.bgGradient}
          />
        </ImageBackground>
      )}

      <Navbar />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Search Header ── */}
        <View style={s.header}>
          <Text style={[s.title, { fontSize: isWide ? 38 : 26 }]}>¿A dónde vamos hoy?</Text>
          <Text style={s.subtitle}>Encuentra las mejores opciones para tu próximo viaje</Text>
        </View>

        {/* ── Search Panel ── */}
        <View style={[s.panel, isWide && s.panelWide]}>

          {/* Tabs */}
          <View style={s.tabs}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[s.tab, activeTab === tab.key && s.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={tab.icon}
                  size={22}
                  color={activeTab === tab.key ? Colors.titulo : Colors.subtitulo}
                />
                <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          <View style={s.tabContent}>

            {/* ── ALOJAMIENTO ── */}
            {activeTab === 'alojamiento' && (
              <View style={s.formGrid}>
                {/* Destino — full width */}
                <View>
                  <FieldLabel>Destino</FieldLabel>
                  <InputField
                    value={aloj.destino}
                    onChangeText={(v) => setAloj({ ...aloj, destino: v })}
                    placeholder="¿A dónde vas?"
                    icon="location-on"
                    hasError={!!alojErr.destino}
                  />
                  <FieldError msg={alojErr.destino} />
                </View>

                {/* Fechas */}
                <Row>
                  <View style={s.col}>
                    <FieldLabel>Fecha de llegada</FieldLabel>
                    <DateField value={aloj.llegada} onChange={(v) => setAloj({ ...aloj, llegada: v })} icon="calendar-today" hasError={!!alojErr.llegada} />
                    <FieldError msg={alojErr.llegada} />
                  </View>
                  <View style={s.col}>
                    <FieldLabel>Fecha de salida</FieldLabel>
                    <DateField value={aloj.salida} onChange={(v) => setAloj({ ...aloj, salida: v })} icon="calendar-today" hasError={!!alojErr.salida} />
                    <FieldError msg={alojErr.salida} />
                  </View>
                </Row>

                {/* Habitaciones / Adultos / Niños */}
                <Row>
                  <View style={s.col}>
                    <FieldLabel>Habitaciones</FieldLabel>
                    <InputField value={aloj.habitaciones} onChangeText={(v) => setAloj({ ...aloj, habitaciones: v })} icon="bed" keyboardType="numeric" hasError={!!alojErr.habitaciones} />
                    <FieldError msg={alojErr.habitaciones} />
                  </View>
                  <View style={s.col}>
                    <FieldLabel>Adultos</FieldLabel>
                    <InputField value={aloj.adultos} onChangeText={(v) => setAloj({ ...aloj, adultos: v })} icon="person" keyboardType="numeric" hasError={!!alojErr.adultos} />
                    <FieldError msg={alojErr.adultos} />
                  </View>
                  <View style={s.col}>
                    <FieldLabel>Niños</FieldLabel>
                    <InputField value={aloj.ninos} onChangeText={(v) => setAloj({ ...aloj, ninos: v })} icon="child-care" keyboardType="numeric" />
                  </View>
                </Row>

                <SearchBtn label="Buscar alojamiento" onPress={buscarAlojamiento} />
              </View>
            )}

            {/* ── VUELOS ── */}
            {activeTab === 'vuelos' && (
              <View style={s.formGrid}>
                {/* Radio group */}
                <View style={s.radioGroup}>
                  {(['roundtrip', 'oneway'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={s.radioOpt}
                      onPress={() => setVuelos({ ...vuelos, tipoViaje: t, regreso: t === 'oneway' ? '' : vuelos.regreso })}
                      activeOpacity={0.8}
                    >
                      <View style={[s.radioCircle, vuelos.tipoViaje === t && s.radioCircleOn]}>
                        {vuelos.tipoViaje === t && <View style={s.radioDot} />}
                      </View>
                      <Text style={[s.radioLabel, vuelos.tipoViaje === t && s.radioLabelOn]}>
                        {t === 'roundtrip' ? 'IDA Y VUELTA' : 'SOLO IDA'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Origen / Destino */}
                <Row>
                  <View style={s.col}>
                    <FieldLabel>Origen</FieldLabel>
                    <InputField value={vuelos.origen} onChangeText={(v) => setVuelos({ ...vuelos, origen: v })} placeholder="Ciudad de origen" icon="flight-takeoff" hasError={!!vueloErr.origen} />
                    <FieldError msg={vueloErr.origen} />
                  </View>
                  <View style={s.col}>
                    <FieldLabel>Destino</FieldLabel>
                    <InputField value={vuelos.destino} onChangeText={(v) => setVuelos({ ...vuelos, destino: v })} placeholder="Ciudad de destino" icon="flight-land" hasError={!!vueloErr.destino} />
                    <FieldError msg={vueloErr.destino} />
                  </View>
                </Row>

                {/* Fechas */}
                <Row>
                  <View style={s.col}>
                    <FieldLabel>Fecha de salida</FieldLabel>
                    <DateField value={vuelos.salida} onChange={(v) => setVuelos({ ...vuelos, salida: v })} icon="calendar-today" hasError={!!vueloErr.salida} />
                    <FieldError msg={vueloErr.salida} />
                  </View>
                  <View style={[s.col, vuelos.tipoViaje === 'oneway' && s.colDisabled]}>
                    <FieldLabel>Fecha de regreso</FieldLabel>
                    <DateField value={vuelos.regreso} onChange={(v) => setVuelos({ ...vuelos, regreso: v })} icon="calendar-today" />
                  </View>
                </Row>

                {/* Form error */}
                {!!vueloFormErr && (
                  <View style={s.formError}>
                    <MaterialIcons name="error-outline" size={15} color={Colors.error} />
                    <Text style={s.formErrorText}>{vueloFormErr}</Text>
                  </View>
                )}

                <SearchBtn label="Buscar vuelos" onPress={buscarVuelos} fullWidth />
              </View>
            )}

            {/* ── COCHES ── */}
            {activeTab === 'coches' && (
              <View style={s.formGrid}>
                <View>
                  <FieldLabel>Proveedor</FieldLabel>
                  <SelectField value={coches.proveedor} onChange={(v) => setCoches({ ...coches, proveedor: v })} options={CAR_PROVIDERS} icon="cloud" />
                </View>

                {/* Fechas */}
                <Row>
                  <View style={s.col}>
                    <FieldLabel>Fecha de recogida</FieldLabel>
                    <DateField value={coches.recogida} onChange={(v) => setCoches({ ...coches, recogida: v })} icon="calendar-today" hasError={!!cocheErr.recogida} />
                    <FieldError msg={cocheErr.recogida} />
                  </View>
                  <View style={s.col}>
                    <FieldLabel>Fecha de devolución</FieldLabel>
                    <DateField value={coches.devolucion} onChange={(v) => setCoches({ ...coches, devolucion: v })} icon="calendar-today" hasError={!!cocheErr.devolucion} />
                    <FieldError msg={cocheErr.devolucion} />
                  </View>
                </Row>

                {/* Categoría / Transmisión */}
                <Row>
                  <View style={s.col}>
                    <FieldLabel>Categoría</FieldLabel>
                    <SelectField value={coches.categoria} onChange={(v) => setCoches({ ...coches, categoria: v })} options={CAR_CATEGORIES} icon="category" />
                  </View>
                  <View style={s.col}>
                    <FieldLabel>Transmisión</FieldLabel>
                    <SelectField value={coches.transmision} onChange={(v) => setCoches({ ...coches, transmision: v })} options={TRANSMISSIONS} icon="settings" />
                  </View>
                </Row>

                {/* Marca / Ordenar */}
                <Row>
                  <View style={s.col}>
                    <FieldLabel>Marca</FieldLabel>
                    <InputField value={coches.marca} onChangeText={(v) => setCoches({ ...coches, marca: v })} placeholder="Ej: Toyota" icon="directions-car" />
                  </View>
                  <View style={s.col}>
                    <FieldLabel>Ordenar por</FieldLabel>
                    <SelectField value={coches.sort} onChange={(v) => setCoches({ ...coches, sort: v })} options={SORT_OPTIONS} icon="sort" />
                  </View>
                </Row>

                <SearchBtn label="Buscar coches" onPress={buscarCoches} />
              </View>
            )}

            {/* ── ATRACCIONES ── */}
            {activeTab === 'atracciones' && (
              <View style={s.formGrid}>
                <View>
                  <FieldLabel>Proveedor</FieldLabel>
                  <SelectField value={atrac.proveedor} onChange={(v) => setAtrac({ ...atrac, proveedor: v })} options={ATTRACTION_PROVIDERS} icon="cloud" />
                </View>
                <Row>
                  <View style={s.col}>
                    <FieldLabel>Destino</FieldLabel>
                    <InputField value={atrac.destino} onChangeText={(v) => setAtrac({ ...atrac, destino: v })} placeholder="¿Dónde quieres explorar?" icon="location-on" />
                  </View>
                  <View style={s.col}>
                    <FieldLabel>Fecha</FieldLabel>
                    <DateField value={atrac.fecha} onChange={(v) => setAtrac({ ...atrac, fecha: v })} icon="calendar-today" />
                  </View>
                </Row>
                <SearchBtn label="Buscar atracciones" onPress={buscarAtracciones} />
              </View>
            )}

          </View>
        </View>

        <Footer />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Page styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  bgImage: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  bgGradient: {
    flex: 1,
  },
  scroll: { flexGrow: 1 },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xxl + Spacing.xl,  // 64px navbar + padding
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  title: {
    fontWeight: '700',
    color: Colors.titulo,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.subtitulo,
    textAlign: 'center',
  },

  // Panel
  panel: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xxl,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
    ...Shadow.lg,
    ...Platform.select({
      web: { backdropFilter: 'blur(24px)' } as any,
    }),
  },
  panelWide: {
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
    marginHorizontal: Spacing.lg,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(198,177,125,0.2)',
    backgroundColor: Colors.bg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 5,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginBottom: -2,
    ...Platform.select({ web: { cursor: 'pointer', transition: 'all 0.2s ease' } as any }),
  },
  tabActive: {
    borderBottomColor: Colors.titulo,
    backgroundColor: '#fff',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: Colors.subtitulo,
  },
  tabLabelActive: { color: Colors.titulo },

  // Form
  tabContent: { padding: Spacing.lg },
  formGrid: { gap: Spacing.md },

  row: { gap: Spacing.md },
  rowWide: { flexDirection: 'row' },
  col: { flex: 1 },
  colDisabled: { opacity: 0.45, pointerEvents: 'none' as any },

  // Radio group
  radioGroup: { flexDirection: 'row', gap: Spacing.xl, alignItems: 'center' },
  radioOpt: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, ...Platform.select({ web: { cursor: 'pointer' } as any }) },
  radioCircle: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: 'rgba(198,177,125,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  radioCircleOn: { borderColor: Colors.titulo },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.titulo },
  radioLabel: { fontSize: 11, fontWeight: '700', color: Colors.subtitulo, textTransform: 'uppercase', letterSpacing: 0.6 },
  radioLabelOn: { color: Colors.titulo },

  // Form error (vuelos)
  formError: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(192,57,43,0.06)',
    borderLeftWidth: 3, borderLeftColor: Colors.error,
    borderRadius: 8, padding: 10,
  },
  formErrorText: { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '500' },
});
