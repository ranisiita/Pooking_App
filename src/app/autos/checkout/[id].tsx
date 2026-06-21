import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView,
  Modal, Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import CalendarModal from '../../../components/CalendarModal';
import { CarService } from '../../../services/cars.service';
import { EXTRAS_MOCK, Extra } from '../../../constants/car-mock';
import { Colors, Spacing, BorderRadius, Shadow } from '../../../constants/theme';
import { getStorageItem, setStorageItem } from '../../../services/storage';

interface LocationItem {
  idLocalizacion: number;
  nombre: string;
  direccion: string;
}

interface VehicleItem {
  idVehiculo: number;
  marca: string;
  modelo: string;
  anio: number;
  provider: string;
  localizacion?: LocationItem;
  disponibilidad?: {
    cantidadDias: number;
  };
  precio?: {
    precioBaseDia: number;
    subtotalVehiculo: number;
    iva: number;
    total: number;
  };
}

interface DatosConductor {
  nombres: string;
  apellidos: string;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  fechaVencimientoLicencia: string;
  edadConductor: string;
  correo: string;
  telefono: string;
  esPrincipal: boolean;
}

interface ExtraConCantidad {
  extra: Extra;
  cantidad: number;
}

interface BSOption { label: string; value: string | number; }

function BottomSheet({
  visible, title, options, activeValue, onSelect, onClose,
}: {
  visible: boolean; title: string; options: BSOption[];
  activeValue: string | number | null | undefined;
  onSelect: (v: any) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={bs.overlay} onPress={onClose}>
        <View style={bs.sheet}>
          <View style={bs.handle} />
          <Text style={bs.title}>{title}</Text>
          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            {options.map((opt, idx) => {
              const isActive = String(opt.value) === String(activeValue ?? '');
              return (
                <TouchableOpacity
                  key={idx}
                  style={[bs.item, isActive && bs.itemActive]}
                  onPress={() => { onSelect(opt.value); onClose(); }}
                  activeOpacity={0.7}
                >
                  <Text style={[bs.itemText, isActive && bs.itemTextActive]}>{opt.label}</Text>
                  {isActive && <Ionicons name="checkmark" size={18} color={Colors.titulo} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

export default function CarCheckoutScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [vehiculo, setVehiculo] = useState<VehicleItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openPicker, setOpenPicker] = useState<'devolucion' | 'tipoDoc' | null>(null);
  const [calLicencia, setCalLicencia] = useState<'main' | number | null>(null);
  const today = new Date().toISOString().split('T')[0];
  
  const [localizaciones, setLocalizaciones] = useState<LocationItem[]>([]);
  const [extras, setExtras] = useState<ExtraConCantidad[]>([]);

  // Step state
  const [paso, setPaso] = useState<1 | 2>(1);

  // Form states
  const [idLocalizacionDevolucion, setIdLocalizacionDevolucion] = useState<number | null>(null);
  const [horaRecogida, setHoraRecogida] = useState('08:00');
  const [horaDevolucion, setHoraDevolucion] = useState('10:00');

  const [conductor, setConductor] = useState<DatosConductor>({
    nombres: '',
    apellidos: '',
    tipoIdentificacion: 'CEDULA',
    numeroIdentificacion: '',
    fechaVencimientoLicencia: '',
    edadConductor: '',
    correo: '',
    telefono: '',
    esPrincipal: true,
  });
  
  const [otrosPasajeros, setOtrosPasajeros] = useState<DatosConductor[]>([]);
  const [errConductor, setErrConductor] = useState<Partial<Record<keyof DatosConductor, string>>>({});
  const [errPasajeros, setErrPasajeros] = useState<Record<number, Partial<Record<keyof DatosConductor, string>>>>({});

  useEffect(() => {
    async function loadInitialData() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const provider = await getStorageItem('car-provider');
        const rawCar = await getStorageItem('car-selected');
        const token = await getStorageItem('token');
        const usuarioGuid = await getStorageItem('usuarioGuid');

        // Fetch locations
        const locs = await CarService.getLocalizaciones(provider ?? undefined);
        setLocalizaciones(locs);

        // Fetch extras
        const extrasList = provider ? await CarService.getExtras(provider) : [];
        if (extrasList && extrasList.length > 0) {
          setExtras(extrasList.map(e => ({ extra: { ...e, icono: e.icono ?? 'add-circle-outline' }, cantidad: 0 })));
        } else {
          setExtras(EXTRAS_MOCK.map(e => ({ extra: e, cantidad: 0 })));
        }

        // Fetch prefilled client details
        if (usuarioGuid && token) {
          const client = await CarService.getClientePorUsuarioGuid(usuarioGuid, token);
          if (client) {
            setConductor(c => ({
              ...c,
              nombres: client.nombres || '',
              apellidos: client.apellidos || '',
              correo: client.correo || '',
              telefono: client.telefono || '',
              numeroIdentificacion: client.numeroIdentificacion || '',
              tipoIdentificacion: (client.tipoIdentificacion === 'CI' || client.tipoIdentificacion === 'CEDULA') ? 'CEDULA' : 'PASAPORTE',
            }));
          } else {
            await fillFallbackUser();
          }
        } else {
          await fillFallbackUser();
        }

        // Match vehicle details
        if (rawCar) {
          const v = JSON.parse(rawCar);
          if (v.idVehiculo === +id) {
            setVehiculo(v);
            setIdLocalizacionDevolucion(v.localizacion?.idLocalizacion ?? null);
            setLoading(false);
            return;
          }
        }

        if (provider) {
          const v = await CarService.getVehiculoById(+id, provider);
          if (!v) {
            setError('No se pudo encontrar el vehículo especificado.');
          } else {
            setVehiculo(v);
            setIdLocalizacionDevolucion(v.localizacion?.idLocalizacion ?? null);
          }
        } else {
          setError('El proveedor no está especificado en la sesión.');
        }
      } catch (err) {
        console.error(err);
        setError('Error al recuperar información del alquiler.');
      } finally {
        setLoading(false);
      }
    }

    async function fillFallbackUser() {
      const nombre = await getStorageItem('nombre');
      const email = await getStorageItem('email');
      const telefono = await getStorageItem('telefono');
      if (nombre) {
        const parts = nombre.split(' ');
        setConductor(c => ({
          ...c,
          nombres: parts[0] || '',
          apellidos: parts.slice(1).join(' ') || '',
          correo: email || '',
          telefono: telefono || '',
        }));
      }
    }

    loadInitialData();
  }, [id]);

  const changeCantidad = (idx: number, delta: number) => {
    const next = [...extras];
    next[idx] = { ...next[idx], cantidad: Math.max(0, next[idx].cantidad + delta) };
    setExtras(next);
  };

  const addConductor = () => {
    setOtrosPasajeros([
      ...otrosPasajeros,
      {
        nombres: '',
        apellidos: '',
        tipoIdentificacion: 'CEDULA',
        numeroIdentificacion: '',
        fechaVencimientoLicencia: '',
        edadConductor: '',
        correo: '',
        telefono: '',
        esPrincipal: false,
      }
    ]);
  };

  const removeConductor = (idx: number) => {
    const next = [...otrosPasajeros];
    next.splice(idx, 1);
    setOtrosPasajeros(next);
  };

  const validate = () => {
    const eC: typeof errConductor = {};
    const ePs: typeof errPasajeros = {};
    let ok = true;

    // Main Conductor
    if (!conductor.nombres.trim() || conductor.nombres.trim().length < 2) {
      eC.nombres = 'Nombres deben tener mínimo 2 letras.'; ok = false;
    }
    if (!conductor.apellidos.trim() || conductor.apellidos.trim().length < 2) {
      eC.apellidos = 'Apellidos deben tener mínimo 2 letras.'; ok = false;
    }
    if (!conductor.numeroIdentificacion.trim()) {
      eC.numeroIdentificacion = 'Identificación requerida.'; ok = false;
    }
    if (!conductor.fechaVencimientoLicencia) {
      eC.fechaVencimientoLicencia = 'Vencimiento requerido.'; ok = false;
    } else if (new Date(conductor.fechaVencimientoLicencia) <= new Date()) {
      eC.fechaVencimientoLicencia = 'La licencia debe estar vigente.'; ok = false;
    }
    if (!conductor.edadConductor || +conductor.edadConductor < 18) {
      eC.edadConductor = 'Debe ser mayor de 18 años.'; ok = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(conductor.correo)) {
      eC.correo = 'Formato de correo inválido.'; ok = false;
    }
    if (!conductor.telefono.trim() || conductor.telefono.trim().length < 7) {
      eC.telefono = 'Teléfono debe tener mínimo 7 dígitos.'; ok = false;
    }

    // Additional Conductors
    otrosPasajeros.forEach((p, i) => {
      const eP: Partial<Record<keyof DatosConductor, string>> = {};
      if (!p.nombres.trim() || p.nombres.trim().length < 2) {
        eP.nombres = 'Requerido.'; ok = false;
      }
      if (!p.apellidos.trim() || p.apellidos.trim().length < 2) {
        eP.apellidos = 'Requerido.'; ok = false;
      }
      if (!p.numeroIdentificacion.trim()) {
        eP.numeroIdentificacion = 'Requerido.'; ok = false;
      }
      if (!p.fechaVencimientoLicencia) {
        eP.fechaVencimientoLicencia = 'Requerido.'; ok = false;
      }
      if (!p.edadConductor || +p.edadConductor < 18) {
        eP.edadConductor = 'Mínimo 18 años.'; ok = false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.correo)) {
        eP.correo = 'Inválido.'; ok = false;
      }
      if (!p.telefono.trim() || p.telefono.trim().length < 7) {
        eP.telefono = 'Inválido.'; ok = false;
      }
      if (Object.keys(eP).length > 0) ePs[i] = eP;
    });

    setErrConductor(eC);
    setErrPasajeros(ePs);
    return ok;
  };

  const handleContinuar = async () => {
    if (paso === 1) {
      setPaso(2);
      return;
    }

    if (!validate()) return;

    // Save choices to storage
    await setStorageItem('car-extras', JSON.stringify(extras));
    await setStorageItem('car-conductor', JSON.stringify(conductor));
    await setStorageItem('car-others', JSON.stringify(otrosPasajeros));
    await setStorageItem('car-times', JSON.stringify({
      idLocalizacionDevolucion,
      horaRecogida,
      horaDevolucion
    }));

    router.push({
      pathname: '/autos/pago/[id]',
      params: { id: String(vehiculo?.idVehiculo) }
    });
  };

  if (loading) {
    return (
      <View style={s.root}>
        <Navbar />
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={Colors.titulo} />
          <Text style={s.loadingText}>Preparando checkout del vehículo...</Text>
        </View>
        <Footer />
      </View>
    );
  }

  if (error || !vehiculo) {
    return (
      <View style={s.root}>
        <Navbar />
        <View style={s.errorBox}>
          <Ionicons name="alert-circle-outline" size={54} color={Colors.error} />
          <Text style={s.errorTitle}>Error al cargar</Text>
          <Text style={s.errorText}>{error || 'Vehículo no encontrado'}</Text>
          <TouchableOpacity style={s.btnBack} onPress={() => router.push('/autos/resultados')}>
            <Text style={s.btnBackText}>Volver</Text>
          </TouchableOpacity>
        </View>
        <Footer />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Step Indicator */}
        <View style={s.indicator}>
          <View style={s.stepRow}>
            <View style={[s.stepNum, paso >= 1 && s.stepNumActive]}><Text style={s.stepNumText}>1</Text></View>
            <Text style={[s.stepLabel, paso >= 1 && s.stepLabelActive]}>Extras & Sucursal</Text>
            <View style={[s.stepLine, paso >= 2 && s.stepLineActive]} />
            <View style={[s.stepNum, paso >= 2 && s.stepNumActive]}><Text style={s.stepNumText}>2</Text></View>
            <Text style={[s.stepLabel, paso >= 2 && s.stepLabelActive]}>Conductor</Text>
          </View>
        </View>

        <View style={s.container}>
          {paso === 1 ? (
            /* PASO 1: EXTRAS & SUCURSAL */
            <View style={s.card}>
              <Text style={s.sectionTitle}>1. Personaliza tu alquiler</Text>
              
              {/* Sucursal Devolución */}
              <View style={s.field}>
                <Text style={s.label}>Sucursal de devolución</Text>
                <TouchableOpacity style={s.inputWrap} onPress={() => setOpenPicker('devolucion')} activeOpacity={0.8}>
                  <Ionicons name="location-outline" size={16} color={Colors.extra2} />
                  <Text style={[s.textInp, { paddingVertical: 0 }]} numberOfLines={1}>
                    {localizaciones.find(l => l.idLocalizacion === idLocalizacionDevolucion)?.nombre || 'Misma sucursal de recogida'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={Colors.subtitulo} />
                </TouchableOpacity>
              </View>

              {/* Horarios */}
              <View style={s.row}>
                <View style={s.field}>
                  <Text style={s.label}>Hora de Recogida</Text>
                  <View style={s.inputWrap}>
                    <Ionicons name="time-outline" size={16} color={Colors.extra2} />
                    <TextInput style={s.textInp} placeholder="HH:MM" value={horaRecogida} onChangeText={setHoraRecogida} />
                  </View>
                </View>
                <View style={s.field}>
                  <Text style={s.label}>Hora de Devolución</Text>
                  <View style={s.inputWrap}>
                    <Ionicons name="time-outline" size={16} color={Colors.extra2} />
                    <TextInput style={s.textInp} placeholder="HH:MM" value={horaDevolucion} onChangeText={setHoraDevolucion} />
                  </View>
                </View>
              </View>

              {/* Extras list */}
              <Text style={[s.label, { marginTop: Spacing.md }]}>Servicios Adicionales (Extras)</Text>
              <View style={s.extrasList}>
                {extras.map((ex, idx) => (
                  <View key={ex.extra.idExtra} style={s.extraRow}>
                    <View style={s.extraIcon}>
                      <Ionicons name={ex.extra.icono as any} size={18} color={Colors.titulo} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.extraName}>{ex.extra.nombre}</Text>
                      <Text style={s.extraDesc}>{ex.extra.descripcion}</Text>
                      <Text style={s.extraPrice}>${ex.extra.valorFijo.toFixed(2)}/día</Text>
                    </View>
                    <View style={s.counter}>
                      <TouchableOpacity style={s.counterBtn} onPress={() => changeCantidad(idx, -1)}>
                        <Ionicons name="remove" size={14} color={Colors.titulo} />
                      </TouchableOpacity>
                      <Text style={s.counterText}>{ex.cantidad}</Text>
                      <TouchableOpacity style={s.counterBtn} onPress={() => changeCantidad(idx, 1)}>
                        <Ionicons name="add" size={14} color={Colors.titulo} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            /* PASO 2: CONDUCTOR DATA */
            <View style={s.card}>
              <Text style={s.sectionTitle}>2. Datos del Conductor Principal</Text>
              <View style={s.formGrid}>
                <View style={s.row}>
                  <View style={s.field}>
                    <Text style={s.label}>Nombres *</Text>
                    <View style={[s.inputWrap, errConductor.nombres && s.inputWrapError]}>
                      <TextInput style={s.textInp} value={conductor.nombres} onChangeText={v => setConductor({ ...conductor, nombres: v })} placeholder="Nombres" />
                    </View>
                    {errConductor.nombres && <Text style={s.err}>{errConductor.nombres}</Text>}
                  </View>
                  <View style={s.field}>
                    <Text style={s.label}>Apellidos *</Text>
                    <View style={[s.inputWrap, errConductor.apellidos && s.inputWrapError]}>
                      <TextInput style={s.textInp} value={conductor.apellidos} onChangeText={v => setConductor({ ...conductor, apellidos: v })} placeholder="Apellidos" />
                    </View>
                    {errConductor.apellidos && <Text style={s.err}>{errConductor.apellidos}</Text>}
                  </View>
                </View>

                <View style={s.row}>
                  <View style={s.field}>
                    <Text style={s.label}>Tipo de Documento</Text>
                    <TouchableOpacity style={s.inputWrap} onPress={() => setOpenPicker('tipoDoc')} activeOpacity={0.8}>
                      <Ionicons name="card-outline" size={16} color={Colors.extra2} />
                      <Text style={[s.textInp, { paddingVertical: 0, flex: 1 }]}>{conductor.tipoIdentificacion}</Text>
                      <Ionicons name="chevron-down" size={14} color={Colors.subtitulo} />
                    </TouchableOpacity>
                  </View>
                  <View style={s.field}>
                    <Text style={s.label}>Número de Documento *</Text>
                    <View style={[s.inputWrap, errConductor.numeroIdentificacion && s.inputWrapError]}>
                      <TextInput style={s.textInp} value={conductor.numeroIdentificacion} onChangeText={v => setConductor({ ...conductor, numeroIdentificacion: v })} placeholder="Ej: 1729853921" />
                    </View>
                    {errConductor.numeroIdentificacion && <Text style={s.err}>{errConductor.numeroIdentificacion}</Text>}
                  </View>
                </View>

                <View style={s.row}>
                  <View style={s.field}>
                    <Text style={s.label}>Fecha Vencimiento Licencia *</Text>
                    <TouchableOpacity
                      style={[s.inputWrap, errConductor.fechaVencimientoLicencia && s.inputWrapError]}
                      onPress={() => setCalLicencia('main')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="calendar-outline" size={16} color={Colors.extra2} />
                      <Text style={[s.textInp, { paddingVertical: 0, color: conductor.fechaVencimientoLicencia ? Colors.extra1 : Colors.textMuted }]}>
                        {conductor.fechaVencimientoLicencia || 'Seleccionar fecha'}
                      </Text>
                      <Ionicons name="chevron-down" size={14} color={Colors.subtitulo} />
                    </TouchableOpacity>
                    {errConductor.fechaVencimientoLicencia && <Text style={s.err}>{errConductor.fechaVencimientoLicencia}</Text>}
                  </View>
                  <View style={s.field}>
                    <Text style={s.label}>Edad *</Text>
                    <View style={[s.inputWrap, errConductor.edadConductor && s.inputWrapError]}>
                      <TextInput style={s.textInp} value={conductor.edadConductor} onChangeText={v => setConductor({ ...conductor, edadConductor: v })} keyboardType="numeric" placeholder="Edad" />
                    </View>
                    {errConductor.edadConductor && <Text style={s.err}>{errConductor.edadConductor}</Text>}
                  </View>
                </View>

                <View style={s.row}>
                  <View style={s.field}>
                    <Text style={s.label}>Correo Electrónico *</Text>
                    <View style={[s.inputWrap, errConductor.correo && s.inputWrapError]}>
                      <TextInput style={s.textInp} value={conductor.correo} onChangeText={v => setConductor({ ...conductor, correo: v })} keyboardType="email-address" placeholder="correo@ejemplo.com" />
                    </View>
                    {errConductor.correo && <Text style={s.err}>{errConductor.correo}</Text>}
                  </View>
                  <View style={s.field}>
                    <Text style={s.label}>Teléfono de Contacto *</Text>
                    <View style={[s.inputWrap, errConductor.telefono && s.inputWrapError]}>
                      <TextInput style={s.textInp} value={conductor.telefono} onChangeText={v => setConductor({ ...conductor, telefono: v })} keyboardType="phone-pad" placeholder="0991234567" />
                    </View>
                    {errConductor.telefono && <Text style={s.err}>{errConductor.telefono}</Text>}
                  </View>
                </View>
              </View>

              {/* Otros Conductores */}
              <View style={s.headerRow}>
                <Text style={s.subSectionTitle}>Conductores Adicionales</Text>
                <TouchableOpacity style={s.btnAdd} onPress={addConductor}>
                  <Ionicons name="add" size={14} color={Colors.titulo} />
                  <Text style={s.btnAddText}>Agregar</Text>
                </TouchableOpacity>
              </View>

              {otrosPasajeros.map((p, i) => (
                <View key={i} style={s.passengerCard}>
                  <View style={s.headerRow}>
                    <Text style={s.passengerTitle}>Conductor Adicional #{i + 1}</Text>
                    <TouchableOpacity onPress={() => removeConductor(i)}>
                      <Ionicons name="trash-outline" size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={s.formGrid}>
                    <View style={s.row}>
                      <View style={s.field}>
                        <Text style={s.label}>Nombres *</Text>
                        <View style={[s.inputWrap, errPasajeros[i]?.nombres && s.inputWrapError]}>
                          <TextInput style={s.textInp} value={p.nombres} onChangeText={v => {
                            const next = [...otrosPasajeros]; next[i].nombres = v; setOtrosPasajeros(next);
                          }} placeholder="Nombres" />
                        </View>
                      </View>
                      <View style={s.field}>
                        <Text style={s.label}>Apellidos *</Text>
                        <View style={[s.inputWrap, errPasajeros[i]?.apellidos && s.inputWrapError]}>
                          <TextInput style={s.textInp} value={p.apellidos} onChangeText={v => {
                            const next = [...otrosPasajeros]; next[i].apellidos = v; setOtrosPasajeros(next);
                          }} placeholder="Apellidos" />
                        </View>
                      </View>
                    </View>

                    <View style={s.row}>
                      <View style={s.field}>
                        <Text style={s.label}>Documento *</Text>
                        <View style={[s.inputWrap, errPasajeros[i]?.numeroIdentificacion && s.inputWrapError]}>
                          <TextInput style={s.textInp} value={p.numeroIdentificacion} onChangeText={v => {
                            const next = [...otrosPasajeros]; next[i].numeroIdentificacion = v; setOtrosPasajeros(next);
                          }} placeholder="Identificación" />
                        </View>
                      </View>
                      <View style={s.field}>
                        <Text style={s.label}>Licencia Vence *</Text>
                        <TouchableOpacity
                          style={[s.inputWrap, errPasajeros[i]?.fechaVencimientoLicencia && s.inputWrapError]}
                          onPress={() => setCalLicencia(i)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="calendar-outline" size={16} color={Colors.extra2} />
                          <Text style={[s.textInp, { paddingVertical: 0, color: p.fechaVencimientoLicencia ? Colors.extra1 : Colors.textMuted }]}>
                            {p.fechaVencimientoLicencia || 'Seleccionar fecha'}
                          </Text>
                          <Ionicons name="chevron-down" size={14} color={Colors.subtitulo} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={s.row}>
                      <View style={s.field}>
                        <Text style={s.label}>Edad *</Text>
                        <View style={[s.inputWrap, errPasajeros[i]?.edadConductor && s.inputWrapError]}>
                          <TextInput style={s.textInp} value={p.edadConductor} onChangeText={v => {
                            const next = [...otrosPasajeros]; next[i].edadConductor = v; setOtrosPasajeros(next);
                          }} keyboardType="numeric" placeholder="Edad" />
                        </View>
                      </View>
                      <View style={s.field}>
                        <Text style={s.label}>Correo *</Text>
                        <View style={[s.inputWrap, errPasajeros[i]?.correo && s.inputWrapError]}>
                          <TextInput style={s.textInp} value={p.correo} onChangeText={v => {
                            const next = [...otrosPasajeros]; next[i].correo = v; setOtrosPasajeros(next);
                          }} placeholder="Correo" />
                        </View>
                      </View>
                    </View>
                    
                    <View style={s.field}>
                      <Text style={s.label}>Teléfono *</Text>
                      <View style={[s.inputWrap, errPasajeros[i]?.telefono && s.inputWrapError]}>
                        <TextInput style={s.textInp} value={p.telefono} onChangeText={v => {
                          const next = [...otrosPasajeros]; next[i].telefono = v; setOtrosPasajeros(next);
                        }} placeholder="Teléfono" />
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={s.actions}>
            {paso === 2 ? (
              <TouchableOpacity style={s.btnBackNormal} onPress={() => setPaso(1)}>
                <Text style={s.btnBackNormalText}>Volver a Extras</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.btnBackNormal} onPress={() => router.back()}>
                <Text style={s.btnBackNormalText}>Cancelar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={s.btnPrimary} onPress={handleContinuar}>
              <Text style={s.btnPrimaryText}>{paso === 1 ? 'Continuar al conductor' : 'Confirmar datos e ir a pagar'}</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <Footer />
      </ScrollView>

      {/* Bottom Sheet Pickers */}
      <BottomSheet
        visible={openPicker === 'devolucion'}
        title="Sucursal de Devolución"
        options={[
          { label: 'Misma sucursal de recogida', value: 0 },
          ...localizaciones.map(l => ({ label: l.nombre, value: l.idLocalizacion })),
        ]}
        activeValue={idLocalizacionDevolucion ?? 0}
        onSelect={v => setIdLocalizacionDevolucion(+v === 0 ? (vehiculo?.localizacion?.idLocalizacion ?? null) : +v)}
        onClose={() => setOpenPicker(null)}
      />
      <BottomSheet
        visible={openPicker === 'tipoDoc'}
        title="Tipo de Documento"
        options={[
          { label: 'CEDULA', value: 'CEDULA' },
          { label: 'PASAPORTE', value: 'PASAPORTE' },
          { label: 'RUC', value: 'RUC' },
        ]}
        activeValue={conductor.tipoIdentificacion}
        onSelect={v => setConductor({ ...conductor, tipoIdentificacion: v })}
        onClose={() => setOpenPicker(null)}
      />

      <CalendarModal
        visible={calLicencia !== null}
        value={
          calLicencia === 'main'
            ? conductor.fechaVencimientoLicencia
            : typeof calLicencia === 'number'
              ? (otrosPasajeros[calLicencia]?.fechaVencimientoLicencia ?? '')
              : ''
        }
        minDate={today}
        onSelect={date => {
          if (calLicencia === 'main') {
            setConductor(c => ({ ...c, fechaVencimientoLicencia: date }));
          } else if (typeof calLicencia === 'number') {
            const next = [...otrosPasajeros];
            next[calLicencia] = { ...next[calLicencia], fechaVencimientoLicencia: date };
            setOtrosPasajeros(next);
          }
          setCalLicencia(null);
        }}
        onClose={() => setCalLicencia(null)}
      />
    </KeyboardAvoidingView>
  );
}

const bs = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32, paddingTop: 8, maxHeight: '70%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(198,177,125,0.4)',
    alignSelf: 'center', marginBottom: 12,
  },
  title: {
    fontSize: 15, fontWeight: '700', color: Colors.titulo, textAlign: 'center',
    paddingHorizontal: 24, paddingBottom: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: 'rgba(198,177,125,0.2)', marginBottom: 4,
  },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 24,
    borderBottomWidth: 1, borderBottomColor: 'rgba(198,177,125,0.1)',
  },
  itemActive: { backgroundColor: Colors.primaryLight },
  itemText: { flex: 1, fontSize: 15, color: Colors.extra1 },
  itemTextActive: { color: Colors.titulo, fontWeight: '600' },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1 },

  loadingBox: { flex: 1, padding: Spacing.xxl, alignItems: 'center', justifyContent: 'center', minHeight: 400 },
  loadingText: { color: Colors.subtitulo, fontSize: 14, marginTop: Spacing.sm },
  errorBox: { flex: 1, padding: Spacing.xxl, alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: Spacing.md },
  errorTitle: { fontSize: 18, fontWeight: '700', color: Colors.titulo },
  errorText: { fontSize: 14, color: Colors.subtitulo, textAlign: 'center' },
  btnBack: { backgroundColor: Colors.titulo, paddingVertical: 10, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.sm },
  btnBackText: { color: '#fff', fontWeight: '700' },

  // Indicator
  indicator: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
    ...Shadow.sm,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.bg, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepNumActive: { backgroundColor: Colors.titulo, borderColor: Colors.titulo },
  stepNumText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  stepLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  stepLabelActive: { color: Colors.titulo },
  stepLine: { width: 40, height: 2, backgroundColor: Colors.border },
  stepLineActive: { backgroundColor: Colors.titulo },

  container: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.titulo,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.xs,
  },
  field: { flex: 1, gap: 4, position: 'relative' },
  label: { fontSize: 10, fontWeight: '700', color: Colors.subtitulo, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.accentBorder, borderRadius: BorderRadius.sm, paddingHorizontal: 10, height: 42, backgroundColor: Colors.bg },
  inputWrapError: { borderColor: Colors.error },
  textInp: { flex: 1, fontSize: 13, color: Colors.extra1 },
  row: { flexDirection: 'row', gap: Spacing.sm },
  err: { color: Colors.error, fontSize: 11, marginTop: 1 },

  // Extras
  extrasList: { gap: Spacing.sm, marginTop: Spacing.xs },
  extraRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.sm, backgroundColor: Colors.bg },
  extraIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  extraName: { fontSize: 13, fontWeight: '700', color: Colors.extra1 },
  extraDesc: { fontSize: 11, color: Colors.subtitulo, marginTop: 1 },
  extraPrice: { fontSize: 12, fontWeight: '600', color: Colors.titulo, marginTop: 2 },
  counter: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, overflow: 'hidden' },
  counterBtn: { padding: 6, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  counterText: { paddingHorizontal: 12, fontSize: 13, fontWeight: '700', color: Colors.extra1 },

  // Conductor form
  formGrid: { gap: Spacing.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md },
  subSectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.titulo },
  btnAdd: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.titulo, borderRadius: BorderRadius.sm, paddingVertical: 6, paddingHorizontal: Spacing.sm },
  btnAddText: { color: Colors.titulo, fontSize: 12, fontWeight: '700' },

  passengerCard: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.md, gap: Spacing.sm, marginTop: Spacing.sm },
  passengerTitle: { fontSize: 13, fontWeight: '700', color: Colors.extra1 },

  // Actions
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md, gap: Spacing.sm },
  btnBackNormal: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.titulo, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  btnBackNormalText: { color: Colors.titulo, fontWeight: '700', fontSize: 14 },
  btnPrimary: { flex: 1.5, flexDirection: 'row', gap: 6, paddingVertical: 12, borderRadius: BorderRadius.sm, backgroundColor: Colors.titulo, alignItems: 'center', justifyContent: 'center', ...Shadow.sm },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
