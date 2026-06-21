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
import CalendarModal from '../components/CalendarModal';
import { Colors, Spacing, BorderRadius, Shadow } from '../constants/theme';
import { FlightService } from '../services/flights.service';

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
  { value: 'todos',     label: 'Todos' },
  { value: 'jhonatan',  label: 'ReservX' },
  { value: 'luis',      label: 'Travel of your dreams' },
  { value: 'francisco', label: 'Atraxia' },
  { value: 'angel',     label: 'Aventuras Reservas' },
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
      {icon && <MaterialIcons name={icon} size={18} color={Colors.titulo} style={a.inputIcon} />}
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

// ─── Date input (triggers custom CalendarModal) ──────────────────────────
function DateField({ value, onChange, icon, hasError }: { value: string; onChange: (v: string) => void; icon?: React.ComponentProps<typeof MaterialIcons>['name']; hasError?: boolean }) {
  const [visible, setVisible] = useState(false);
  
  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return 'Seleccionar fecha';
    const [y, m, d] = dStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <>
      <TouchableOpacity
        style={[a.inputWrap, hasError && a.inputWrapError]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        {icon && <MaterialIcons name={icon} size={18} color={Colors.titulo} style={a.inputIcon} />}
        <Text style={[a.input, { color: value ? Colors.extra1 : 'rgba(96,98,86,0.5)', paddingVertical: Platform.OS === 'web' ? 2 : 0 }]}>
          {formatDisplayDate(value)}
        </Text>
        <MaterialIcons name="calendar-today" size={16} color={Colors.subtitulo} />
      </TouchableOpacity>
      
      <CalendarModal
        visible={visible}
        value={value}
        onSelect={onChange}
        onClose={() => setVisible(false)}
      />
    </>
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
        {icon && <MaterialIcons name={icon} size={18} color={Colors.titulo} style={a.inputIcon} />}
        {/* @ts-ignore */}
        <select
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, color: Colors.extra1, outline: 'none', fontFamily: 'Poppins-Regular, sans-serif', cursor: 'pointer' } as any}
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
        {icon && <MaterialIcons name={icon} size={18} color={Colors.titulo} style={a.inputIcon} />}
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
      <MaterialIcons name="search" size={20} color="#fff" />
      <Text style={a.searchBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Shared atom styles ───────────────────────────────────────────────────────
const a = StyleSheet.create({
  label: {
    fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
    color: Colors.titulo, letterSpacing: 0.5, marginBottom: 5,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(198,177,125,0.4)',
    borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'web' ? 8 : 10,
    backgroundColor: '#fff',
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
    gap: Spacing.sm, backgroundColor: Colors.titulo, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: Spacing.xl,
    alignSelf: 'center', marginTop: Spacing.md, minWidth: 220,
    ...Shadow.md,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'background 0.2s ease, transform 0.2s ease' } as any,
    }),
  },
  searchBtnFull: { alignSelf: 'stretch', minWidth: undefined },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.2 },

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
  const isWide = width >= 768;

  const [activeTab, setActiveTab] = useState('alojamiento');

  // State
  const [aloj, setAloj] = useState({ destino: '', llegada: hoy, salida: manana, habitaciones: '1', adultos: '2', ninos: '0' });
  const [alojErr, setAlojErr] = useState<Record<string, string>>({});

  const [vuelos, setVuelos] = useState({ origen: '', destino: '', salida: hoy, regreso: '', tipoViaje: 'oneway' as 'roundtrip' | 'oneway' });
  const [vueloErr, setVueloErr] = useState<Record<string, string>>({});
  const [vueloFormErr, setVueloFormErr] = useState('');

  const [coches, setCoches] = useState({ proveedor: '', recogida: hoy, devolucion: manana, categoria: '', transmision: '', marca: '', sort: '' });
  const [cocheErr, setCocheErr] = useState<Record<string, string>>({});

  const [atrac, setAtrac] = useState({ proveedor: 'todos', destino: '', fecha: hoy });

  // Autocomplete state
  const [aeropuertos, setAeropuertos] = useState<any[]>([]);
  const [origenQuery, setOrigenQuery] = useState('');
  const [destinoQuery, setDestinoQuery] = useState('');
  const [showOrigenDropdown, setShowOrigenDropdown] = useState(false);
  const [showDestinoDropdown, setShowDestinoDropdown] = useState(false);
  const [focusedOrigen, setFocusedOrigen] = useState(false);
  const [focusedDestino, setFocusedDestino] = useState(false);

  useEffect(() => {
    async function loadAirports() {
      try {
        const data = await FlightService.cargarTodosAeropuertos();
        setAeropuertos(data);
      } catch (err) {
        console.warn('Error loading airports:', err);
      }
    }
    loadAirports();
  }, []);

  const normalizeString = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  const getSuggestions = (query: string) => {
    if (!query || query.trim().length === 0) return aeropuertos.slice(0, 10);
    const q = normalizeString(query);
    return aeropuertos.filter(a =>
      normalizeString(a.nombre).includes(q) ||
      normalizeString(a.codigoIata).includes(q)
    ).slice(0, 10);
  };

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
    router.push({ pathname: '/vuelos/resultados' as any, params: { origen: vuelos.origen, destino: vuelos.destino, fecha: vuelos.salida, fechaRegreso: '', tipoViaje: 'oneway' } });
  };

  const buscarCoches = () => {
    if (!validateCoches()) return;
    router.push({ pathname: '/autos/resultados' as any, params: { fechaRecogida: coches.recogida, fechaDevolucion: coches.devolucion, proveedor: coches.proveedor, categoria: coches.categoria, transmision: coches.transmision, marca: coches.marca, sort: coches.sort } });
  };

  const buscarAtracciones = () => {
    router.push({ pathname: '/atracciones' as any, params: { proveedor: atrac.proveedor, ciudad: atrac.destino.trim(), fecha: atrac.fecha } });
  };

  // ── Row helper (Stacks on mobile, row on desktop) ─────────────────────────
  const Row = ({ children }: { children: React.ReactNode }) => (
    <View style={[s.row, isWide && s.rowWide]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* ── Background ── */}
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

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={s.main}>
          {/* ── Search Header ── */}
        <View style={s.header}>
          <Text style={[s.title, { fontSize: isWide ? 38 : 26 }]}>¿A dónde vamos hoy?</Text>
          <Text style={s.subtitle}>Encuentra las mejores opciones para tu próximo viaje</Text>
        </View>

        {/* ── Search Panel ── */}
        <View style={[s.panel, isWide && s.panelWide]}>

          {/* Segmented/Pill Tabs bar */}
          <View style={s.tabsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.tabsScrollView}
              contentContainerStyle={[s.tabs, !isWide && s.tabsMobile]}
            >
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    s.tab,
                    activeTab === tab.key ? s.tabActive : s.tabInactive,
                    !isWide && s.tabMobileItem
                  ]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={tab.icon}
                    size={20}
                    color={activeTab === tab.key ? '#fff' : Colors.titulo}
                  />
                  <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Tab content */}
          <View style={[s.tabContent, !isWide && s.tabContentMobile]}>

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

                {/* Fechas - Stacked on Mobile, Row on Desktop */}
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

                {/* Habitaciones / Adultos / Niños (Counter Card) */}
                <View style={[s.guestCard, !isWide && s.guestCardMobile]}>
                  <Text style={s.guestCardTitle}>Huéspedes y Habitaciones</Text>
                  <View style={s.guestCardDivider} />
                  
                  <View style={s.counterContainer}>
                    {/* Habitaciones */}
                    <View style={s.counterRow}>
                      <View style={s.counterInfo}>
                        <MaterialIcons name="bed" size={isWide ? 20 : 18} color={Colors.titulo} />
                        <Text style={[s.counterLabel, !isWide && s.counterLabelMobile]}>Habitaciones</Text>
                      </View>
                      <View style={[s.counterControls, !isWide && s.counterControlsMobile]}>
                        <TouchableOpacity
                          style={[s.counterBtn, !isWide && s.counterBtnMobile]}
                          onPress={() => {
                            const current = parseInt(aloj.habitaciones) || 1;
                            const val = Math.max(1, current - 1);
                            setAloj({ ...aloj, habitaciones: String(val) });
                          }}
                        >
                          <MaterialIcons name="remove" size={isWide ? 16 : 14} color={Colors.titulo} />
                        </TouchableOpacity>
                        <TextInput
                          style={[s.counterInput, !isWide && s.counterInputMobile]}
                          value={aloj.habitaciones}
                          onChangeText={(v) => {
                            const clean = v.replace(/[^0-9]/g, '');
                            setAloj({ ...aloj, habitaciones: clean });
                          }}
                          keyboardType="numeric"
                          maxLength={2}
                        />
                        <TouchableOpacity
                          style={[s.counterBtn, !isWide && s.counterBtnMobile]}
                          onPress={() => {
                            const current = parseInt(aloj.habitaciones) || 1;
                            const val = current + 1;
                            setAloj({ ...aloj, habitaciones: String(val) });
                          }}
                        >
                          <MaterialIcons name="add" size={isWide ? 16 : 14} color={Colors.titulo} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Adultos */}
                    <View style={s.counterRow}>
                      <View style={s.counterInfo}>
                        <MaterialIcons name="person" size={isWide ? 20 : 18} color={Colors.titulo} />
                        <Text style={[s.counterLabel, !isWide && s.counterLabelMobile]}>Adultos</Text>
                      </View>
                      <View style={[s.counterControls, !isWide && s.counterControlsMobile]}>
                        <TouchableOpacity
                          style={[s.counterBtn, !isWide && s.counterBtnMobile]}
                          onPress={() => {
                            const current = parseInt(aloj.adultos) || 1;
                            const val = Math.max(1, current - 1);
                            setAloj({ ...aloj, adultos: String(val) });
                          }}
                        >
                          <MaterialIcons name="remove" size={isWide ? 16 : 14} color={Colors.titulo} />
                        </TouchableOpacity>
                        <TextInput
                          style={[s.counterInput, !isWide && s.counterInputMobile]}
                          value={aloj.adultos}
                          onChangeText={(v) => {
                            const clean = v.replace(/[^0-9]/g, '');
                            setAloj({ ...aloj, adultos: clean });
                          }}
                          keyboardType="numeric"
                          maxLength={2}
                        />
                        <TouchableOpacity
                          style={[s.counterBtn, !isWide && s.counterBtnMobile]}
                          onPress={() => {
                            const current = parseInt(aloj.adultos) || 1;
                            const val = current + 1;
                            setAloj({ ...aloj, adultos: String(val) });
                          }}
                        >
                          <MaterialIcons name="add" size={isWide ? 16 : 14} color={Colors.titulo} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Niños */}
                    <View style={s.counterRow}>
                      <View style={s.counterInfo}>
                        <MaterialIcons name="child-care" size={isWide ? 20 : 18} color={Colors.titulo} />
                        <Text style={[s.counterLabel, !isWide && s.counterLabelMobile]}>Niños</Text>
                      </View>
                      <View style={[s.counterControls, !isWide && s.counterControlsMobile]}>
                        <TouchableOpacity
                          style={[s.counterBtn, !isWide && s.counterBtnMobile]}
                          onPress={() => {
                            const current = parseInt(aloj.ninos) || 0;
                            const val = Math.max(0, current - 1);
                            setAloj({ ...aloj, ninos: String(val) });
                          }}
                        >
                          <MaterialIcons name="remove" size={isWide ? 16 : 14} color={Colors.titulo} />
                        </TouchableOpacity>
                        <TextInput
                          style={[s.counterInput, !isWide && s.counterInputMobile]}
                          value={aloj.ninos}
                          onChangeText={(v) => {
                            const clean = v.replace(/[^0-9]/g, '');
                            setAloj({ ...aloj, ninos: clean });
                          }}
                          keyboardType="numeric"
                          maxLength={2}
                        />
                        <TouchableOpacity
                          style={[s.counterBtn, !isWide && s.counterBtnMobile]}
                          onPress={() => {
                            const current = parseInt(aloj.ninos) || 0;
                            const val = current + 1;
                            setAloj({ ...aloj, ninos: String(val) });
                          }}
                        >
                          <MaterialIcons name="add" size={isWide ? 16 : 14} color={Colors.titulo} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>

                <SearchBtn label="Buscar alojamiento" onPress={buscarAlojamiento} />
              </View>
            )}

            {/* ── VUELOS ── */}
            {activeTab === 'vuelos' && (
              <View style={s.formGrid}>
                {/* One Way Badge / Label */}
                <View style={s.onewayBadge}>
                  <MaterialIcons name="flight-takeoff" size={16} color={Colors.titulo} />
                  <Text style={s.onewayBadgeText}>Viaje Solo Ida</Text>
                </View>

                {/* Origen / Destino (Autocomplete inputs) */}
                <View style={[s.row, isWide && s.rowWide, { zIndex: 10, position: 'relative' }]}>
                  {/* Origen Autocomplete */}
                  <View style={[s.col, { zIndex: 12, position: 'relative' }]}>
                    <FieldLabel>Origen</FieldLabel>
                    <View style={[a.inputWrap, focusedOrigen && a.inputWrapFocused, !!vueloErr.origen && a.inputWrapError]}>
                      <MaterialIcons name="flight-takeoff" size={18} color={Colors.titulo} style={a.inputIcon} />
                      <TextInput
                        style={a.input}
                        value={origenQuery}
                        onChangeText={(v) => {
                          setOrigenQuery(v);
                          setShowOrigenDropdown(true);
                          setVuelos(prev => ({ ...prev, origen: v }));
                        }}
                        placeholder="Ciudad o aeropuerto de origen"
                        placeholderTextColor="rgba(96,98,86,0.5)"
                        onFocus={() => {
                          setFocusedOrigen(true);
                          setShowOrigenDropdown(true);
                        }}
                        onBlur={() => {
                          setFocusedOrigen(false);
                          // Slight timeout to let suggestion onPress handle first
                          setTimeout(() => setShowOrigenDropdown(false), 250);
                        }}
                      />
                      {origenQuery.length > 0 && (
                        <TouchableOpacity onPress={() => { setOrigenQuery(''); setVuelos(prev => ({ ...prev, origen: '' })); }}>
                          <MaterialIcons name="clear" size={18} color={Colors.subtitulo} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <FieldError msg={vueloErr.origen} />

                    {showOrigenDropdown && aeropuertos.length > 0 && (
                      <View style={s.dropdownContainer}>
                        <ScrollView keyboardShouldPersistTaps="handled" style={s.dropdownScroll}>
                          {getSuggestions(origenQuery).map((item) => (
                            <TouchableOpacity
                              key={item.codigoIata}
                              style={s.dropdownItem}
                              onPress={() => {
                                setOrigenQuery(item.display);
                                setVuelos(prev => ({ ...prev, origen: item.codigoIata }));
                                setShowOrigenDropdown(false);
                              }}
                            >
                              <MaterialIcons name="flight" size={18} color={Colors.titulo} />
                              <View style={{ flex: 1 }}>
                                <Text style={s.dropdownText}>{item.nombre}</Text>
                                <Text style={s.dropdownSubtext}>{item.codigoIata}</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Destino Autocomplete */}
                  <View style={[s.col, { zIndex: 11, position: 'relative' }]}>
                    <FieldLabel>Destino</FieldLabel>
                    <View style={[a.inputWrap, focusedDestino && a.inputWrapFocused, !!vueloErr.destino && a.inputWrapError]}>
                      <MaterialIcons name="flight-land" size={18} color={Colors.titulo} style={a.inputIcon} />
                      <TextInput
                        style={a.input}
                        value={destinoQuery}
                        onChangeText={(v) => {
                          setDestinoQuery(v);
                          setShowDestinoDropdown(true);
                          setVuelos(prev => ({ ...prev, destino: v }));
                        }}
                        placeholder="Ciudad o aeropuerto de destino"
                        placeholderTextColor="rgba(96,98,86,0.5)"
                        onFocus={() => {
                          setFocusedDestino(true);
                          setShowDestinoDropdown(true);
                        }}
                        onBlur={() => {
                          setFocusedDestino(false);
                          setTimeout(() => setShowDestinoDropdown(false), 250);
                        }}
                      />
                      {destinoQuery.length > 0 && (
                        <TouchableOpacity onPress={() => { setDestinoQuery(''); setVuelos(prev => ({ ...prev, destino: '' })); }}>
                          <MaterialIcons name="clear" size={18} color={Colors.subtitulo} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <FieldError msg={vueloErr.destino} />

                    {showDestinoDropdown && aeropuertos.length > 0 && (
                      <View style={s.dropdownContainer}>
                        <ScrollView keyboardShouldPersistTaps="handled" style={s.dropdownScroll}>
                          {getSuggestions(destinoQuery).map((item) => (
                            <TouchableOpacity
                              key={item.codigoIata}
                              style={s.dropdownItem}
                              onPress={() => {
                                setDestinoQuery(item.display);
                                setVuelos(prev => ({ ...prev, destino: item.codigoIata }));
                                setShowDestinoDropdown(false);
                              }}
                            >
                              <MaterialIcons name="flight" size={18} color={Colors.titulo} />
                              <View style={{ flex: 1 }}>
                                <Text style={s.dropdownText}>{item.nombre}</Text>
                                <Text style={s.dropdownSubtext}>{item.codigoIata}</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>

                {/* Fecha Salida Only */}
                <View style={[s.row, isWide && s.rowWide, { zIndex: 5, position: 'relative' }]}>
                  <View style={s.col}>
                    <FieldLabel>Fecha de salida</FieldLabel>
                    <DateField value={vuelos.salida} onChange={(v) => setVuelos({ ...vuelos, salida: v })} icon="calendar-today" hasError={!!vueloErr.salida} />
                    <FieldError msg={vueloErr.salida} />
                  </View>
                </View>

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

                {/* Fechas - Stacked on Mobile, Row on Desktop */}
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
  main: { flex: 1 },

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
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    overflow: 'visible', // Changed from hidden to show autocomplete overlay!
    ...Shadow.lg,
    ...Platform.select({
      web: { backdropFilter: 'blur(30px)' } as any,
    }),
  },
  panelWide: {
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
    marginHorizontal: Spacing.lg,
  },

  // Segmented Pill Tabs
  tabsContainer: {
    backgroundColor: 'rgba(251,248,234,0.7)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,177,125,0.25)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  tabsScrollView: {
    width: '100%',
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'space-between',
  },
  tabsMobile: {
    width: undefined,
    justifyContent: 'flex-start',
    paddingRight: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 99,
    gap: 6,
    borderWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' } as any }),
  },
  tabActive: {
    backgroundColor: Colors.titulo,
    borderColor: Colors.titulo,
    ...Shadow.sm,
  },
  tabInactive: {
    backgroundColor: '#fff',
    borderColor: 'rgba(198, 177, 125, 0.3)',
  },
  tabMobileItem: {
    flex: 0,
    minWidth: 110,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.subtitulo,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Form
  tabContent: { padding: Spacing.lg },
  tabContentMobile: { padding: Spacing.md },
  formGrid: { gap: Spacing.md },

  row: { gap: Spacing.md },
  rowWide: { flexDirection: 'row' },
  col: { flex: 1 },
  colDisabled: { opacity: 0.45, pointerEvents: 'none' as any },

  // Guest Selector Card Styles
  guestCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(198,177,125,0.35)',
    padding: 16,
    marginTop: 4,
    ...Shadow.sm,
  },
  guestCardMobile: {
    padding: 12,
  },
  guestCardTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.titulo,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  guestCardDivider: {
    height: 1,
    backgroundColor: 'rgba(198,177,125,0.15)',
    marginBottom: 12,
  },
  counterContainer: {
    gap: 12,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.extra1,
  },
  counterLabelMobile: {
    fontSize: 13,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterControlsMobile: {
    gap: 6,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(198,177,125,0.5)',
    backgroundColor: 'rgba(251,248,234,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  counterBtnMobile: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  counterInput: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.extra1,
    width: 40,
    height: 32,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(198,177,125,0.35)',
    borderRadius: 8,
    backgroundColor: 'rgba(251,248,234,0.6)',
    paddingVertical: 0,
    paddingHorizontal: 0,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  counterInputMobile: {
    fontSize: 14,
    width: 34,
    height: 28,
    borderRadius: 6,
  },

  // Autocomplete Dropdown styles
  dropdownContainer: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(198,177,125,0.35)',
    borderRadius: 12,
    maxHeight: 220,
    zIndex: 999,
    overflow: 'hidden',
    ...Shadow.md,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,177,125,0.12)',
    gap: 10,
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  dropdownText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.extra1,
  },
  dropdownSubtext: {
    fontSize: 11,
    color: Colors.subtitulo,
    fontWeight: '500',
  },

  // One Way Badge
  onewayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
  },
  onewayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.titulo,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Form error (vuelos)
  formError: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(192,57,43,0.06)',
    borderLeftWidth: 3, borderLeftColor: Colors.error,
    borderRadius: 8, padding: 10,
  },
  formErrorText: { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '500' },
});
