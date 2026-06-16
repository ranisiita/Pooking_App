import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, ActivityIndicator,
  Platform, TouchableOpacity, Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import { CarService } from '../../../services/cars.service';
import { EXTRAS_MOCK } from '../../../constants/car-mock';
import { Colors, Spacing, BorderRadius, Shadow } from '../../../constants/theme';
import { getStorageItem, setStorageItem } from '../../../services/storage';

const { width } = Dimensions.get('window');

interface LocationItem {
  idLocalizacion: number;
  nombre: string;
  direccion: string;
  telefono: string;
  correo: string;
  horarioAtencion: string;
}

interface CategoryItem {
  idCategoria: number;
  nombre: string;
}

interface VehicleItem {
  idVehiculo: number;
  codigoInterno: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
  combustible: string;
  transmision: string;
  capacidadPasajeros: number;
  capacidadMaletas: number;
  numeroPuertas: number;
  aireAcondicionado: boolean;
  imagenUrl: string;
  provider: string;
  localizacion?: LocationItem;
  categoria?: CategoryItem;
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

export default function CarDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [vehiculo, setVehiculo] = useState<VehicleItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCar() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const provider = await getStorageItem('car-provider');
        if (!provider) {
          setError('No se pudo encontrar el proveedor de alquiler en la sesión.');
          setLoading(false);
          return;
        }

        const data = await CarService.getVehiculoById(+id, provider);
        if (!data) {
          setError('No se pudieron obtener los detalles del vehículo.');
        } else {
          setVehiculo(data);
        }
      } catch (err) {
        console.error(err);
        setError('Ocurrió un error al cargar la información del vehículo.');
      } finally {
        setLoading(false);
      }
    }
    loadCar();
  }, [id]);

  const handleReservar = async () => {
    if (!vehiculo) return;
    await setStorageItem('car-selected', JSON.stringify(vehiculo));
    router.push({
      pathname: '/autos/checkout/[id]' as any,
      params: { id: String(vehiculo.idVehiculo) }
    });
  };

  const goBack = () => {
    router.push('/autos/resultados');
  };

  const specs = useMemo(() => {
    if (!vehiculo) return [];
    return [
      { icon: 'people-outline', label: 'Pasajeros', value: `${vehiculo.capacidadPasajeros} personas` },
      { icon: 'briefcase-outline', label: 'Maletas', value: `${vehiculo.capacidadMaletas} maletas` },
      { icon: 'key-outline', label: 'Puertas', value: `${vehiculo.numeroPuertas || 4} puertas` },
      { icon: 'settings-outline', label: 'Transmisión', value: vehiculo.transmision === 'AUTOMATICA' ? 'Automática' : 'Manual' },
      { icon: 'funnel-outline', label: 'Combustible', value: vehiculo.combustible ? (vehiculo.combustible.charAt(0) + vehiculo.combustible.slice(1).toLowerCase()) : 'Gasolina' },
      { icon: 'snow-outline', label: 'Aire acond.', value: vehiculo.aireAcondicionado ? 'Sí' : 'No' },
      { icon: 'color-palette-outline', label: 'Color', value: vehiculo.color || 'Plata' },
      { icon: 'calendar-outline', label: 'Año', value: `${vehiculo.anio}` },
    ];
  }, [vehiculo]);

  if (loading) {
    return (
      <View style={s.root}>
        <Navbar />
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={Colors.titulo} />
          <Text style={s.loadingText}>Cargando especificaciones del vehículo...</Text>
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
          <TouchableOpacity style={s.btnBack} onPress={goBack}>
            <Text style={s.btnBackText}>Volver a buscar</Text>
          </TouchableOpacity>
        </View>
        <Footer />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Detail Hero */}
        <View style={s.hero}>
          <Image
            source={{ uri: vehiculo.imagenUrl || 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80' }}
            style={s.heroImage}
            resizeMode="cover"
          />
          <View style={s.heroOverlay} />
          
          <View style={s.heroContainer}>
            {/* Breadcrumbs */}
            <View style={s.breadcrumbRow}>
              <TouchableOpacity style={s.heroBackBtn} onPress={goBack}>
                <Ionicons name="arrow-back" size={16} color="#fff" />
                <Text style={s.heroBackText}>Volver</Text>
              </TouchableOpacity>
              <Text style={s.breadcrumbText}>Autos  /  {vehiculo.categoria?.nombre || 'General'}  /  {vehiculo.marca} {vehiculo.modelo}</Text>
            </View>

            {/* Title / Badges */}
            <View style={s.heroInfo}>
              <View style={s.badges}>
                <View style={s.badge}><Text style={s.badgeText}>{vehiculo.categoria?.nombre || 'General'}</Text></View>
                <View style={s.badge}><Text style={s.badgeText}>{vehiculo.transmision === 'AUTOMATICA' ? 'Automática' : 'Manual'}</Text></View>
                <View style={s.badge}><Text style={s.badgeText}>{vehiculo.combustible}</Text></View>
              </View>
              <Text style={s.carTitle}>{vehiculo.marca} <Text style={s.carModel}>{vehiculo.modelo}</Text></Text>
              <Text style={s.carSub}>{vehiculo.anio} · {vehiculo.color}</Text>
            </View>
          </View>
        </View>

        {/* Main Grid */}
        <View style={s.bodyLayout}>
          {/* Main Specs Left Column */}
          <View style={s.leftCol}>
            {/* Location Address */}
            <View style={s.infoCard}>
              <View style={s.cardHeader}>
                <Ionicons name="business-outline" size={18} color={Colors.titulo} />
                <Text style={s.cardTitle}>Punto de Recogida</Text>
              </View>
              <View style={s.locGrid}>
                <View style={s.locItem}>
                  <Ionicons name="location-outline" size={16} color={Colors.extra2} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.locLabel}>{vehiculo.localizacion?.nombre || 'Sucursal'}</Text>
                    <Text style={s.locSub}>{vehiculo.localizacion?.direccion || 'Dirección no disponible'}</Text>
                  </View>
                </View>
                <View style={s.locItem}>
                  <Ionicons name="time-outline" size={16} color={Colors.extra2} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.locLabel}>Horario</Text>
                    <Text style={s.locSub}>{vehiculo.localizacion?.horarioAtencion || 'No disponible'}</Text>
                  </View>
                </View>
                <View style={s.locItem}>
                  <Ionicons name="call-outline" size={16} color={Colors.extra2} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.locLabel}>Teléfono</Text>
                    <Text style={s.locSub}>{vehiculo.localizacion?.telefono || 'No disponible'}</Text>
                  </View>
                </View>
                <View style={s.locItem}>
                  <Ionicons name="mail-outline" size={16} color={Colors.extra2} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.locLabel}>Correo</Text>
                    <Text style={s.locSub}>{vehiculo.localizacion?.correo || 'No disponible'}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Technical Specifications */}
            <View style={s.infoCard}>
              <View style={s.cardHeader}>
                <Ionicons name="options-outline" size={18} color={Colors.titulo} />
                <Text style={s.cardTitle}>Especificaciones Técnicas</Text>
              </View>
              <View style={s.specsGrid}>
                {specs.map((sp, idx) => (
                  <View key={idx} style={s.specCard}>
                    <View style={s.specIconWrap}>
                      <Ionicons name={sp.icon as any} size={18} color={Colors.titulo} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.specLabelText}>{sp.label}</Text>
                      <Text style={s.specValueText}>{sp.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Extras available */}
            <View style={s.infoCard}>
              <View style={s.cardHeader}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.titulo} />
                <Text style={s.cardTitle}>Extras Disponibles</Text>
              </View>
              <Text style={s.hint}>Los extras se seleccionan al momento de formalizar la reserva.</Text>
              <View style={s.extrasGrid}>
                {EXTRAS_MOCK.map(ex => (
                  <View key={ex.idExtra} style={s.extraCard}>
                    <View style={s.extraIconWrap}>
                      <Ionicons name={ex.icono as any} size={18} color={Colors.titulo} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.extraName}>{ex.nombre}</Text>
                      <Text style={s.extraDesc} numberOfLines={2}>{ex.descripcion}</Text>
                    </View>
                    <Text style={s.extraPrice}>${ex.valorFijo.toFixed(2)}/día</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Sticky Sidebar Right Column */}
          <View style={s.rightCol}>
            <View style={s.stickyCard}>
              <View style={s.stickyHeader}>
                <Ionicons name="cash-outline" size={16} color={Colors.titulo} />
                <Text style={s.stickyTitle}>Precio Estimado</Text>
              </View>

              <View style={s.breakdown}>
                <View style={s.breakdownRow}>
                  <Text style={s.breakdownLabel}>Precio por día</Text>
                  <Text style={s.breakdownValue}>${(vehiculo.precio?.precioBaseDia ?? 0).toFixed(2)}</Text>
                </View>
                <View style={s.breakdownRow}>
                  <Text style={s.breakdownLabel}>Días estimados</Text>
                  <Text style={s.breakdownValue}>{vehiculo.disponibilidad?.cantidadDias || 1}</Text>
                </View>
                <View style={s.breakdownRow}>
                  <Text style={s.breakdownLabel}>Subtotal vehículo</Text>
                  <Text style={s.breakdownValue}>${(vehiculo.precio?.subtotalVehiculo ?? (vehiculo.precio?.precioBaseDia || 0)).toFixed(2)}</Text>
                </View>
                <View style={[s.breakdownRow, s.breakdownIva]}>
                  <Text style={s.breakdownLabel}>IVA (15%)</Text>
                  <Text style={s.breakdownValue}>${(vehiculo.precio?.iva ?? 0).toFixed(2)}</Text>
                </View>
                <View style={s.stickyDivider} />
                <View style={s.breakdownRow}>
                  <Text style={s.totalLabel}>Total estimado</Text>
                  <Text style={s.totalValue}>${(vehiculo.precio?.total ?? (vehiculo.precio?.precioBaseDia || 0)).toFixed(2)}</Text>
                </View>
              </View>

              <View style={s.availBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={s.availText}>Disponible ahora</Text>
              </View>

              <TouchableOpacity style={s.btnPrimary} onPress={handleReservar} activeOpacity={0.85}>
                <Ionicons name="car-outline" size={18} color="#fff" />
                <Text style={s.btnPrimaryText}>Reservar ahora</Text>
              </TouchableOpacity>

              <Text style={s.note}>Sin cargos por cancelación hasta 48h antes.</Text>
              
              <View style={s.codeBox}>
                <Ionicons name="pricetag-outline" size={12} color={Colors.subtitulo} />
                <Text style={s.codeText}>{vehiculo.codigoInterno}</Text>
              </View>
            </View>
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

  // Loader
  loadingBox: {
    flex: 1,
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    minHeight: 400,
  },
  loadingText: {
    color: Colors.subtitulo,
    fontSize: 14,
  },

  // Error Box
  errorBox: {
    flex: 1,
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    minHeight: 400,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.titulo,
  },
  errorText: {
    fontSize: 14,
    color: Colors.subtitulo,
    textAlign: 'center',
    maxWidth: 320,
  },
  btnBack: {
    backgroundColor: Colors.titulo,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    ...Shadow.sm,
  },
  btnBackText: {
    color: '#fff',
    fontWeight: '700',
  },

  // Hero section
  hero: {
    height: 300,
    position: 'relative',
    justifyContent: 'flex-end',
    backgroundColor: '#8E5A54',
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heroContainer: {
    zIndex: 2,
    padding: Spacing.md,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  heroBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: BorderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
  },
  heroBackText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  breadcrumbText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  heroInfo: {
    gap: Spacing.xs,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  carTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  carModel: {
    fontWeight: '400',
  },
  carSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },

  // Main grid layout
  bodyLayout: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  leftCol: {
    flex: 2,
    gap: Spacing.md,
  },
  rightCol: {
    flex: 1,
    minWidth: 280,
  },

  // Info Cards
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.titulo,
  },
  hint: {
    fontSize: 12,
    color: Colors.subtitulo,
  },

  // Location details
  locGrid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  locItem: {
    width: Platform.OS === 'web' ? '45%' : '100%',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  locLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.extra1,
  },
  locSub: {
    fontSize: 12,
    color: Colors.subtitulo,
    marginTop: 1,
  },

  // Specs Grid
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  specCard: {
    width: Platform.OS === 'web' ? '23%' : '46%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: 8,
    backgroundColor: Colors.bg,
  },
  specIconWrap: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.subtitulo,
    textTransform: 'uppercase',
  },
  specValueText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.extra1,
  },

  // Extras
  extrasGrid: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  extraCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.bg,
  },
  extraIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.extra1,
  },
  extraDesc: {
    fontSize: 11,
    color: Colors.subtitulo,
    marginTop: 1,
  },
  extraPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.titulo,
  },

  // Sticky Card (Right)
  stickyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.xs,
  },
  stickyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.titulo,
    textTransform: 'uppercase',
  },
  breakdown: {
    gap: Spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontSize: 13,
    color: Colors.subtitulo,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.extra1,
  },
  breakdownIva: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.sm,
  },
  stickyDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.titulo,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.titulo,
  },
  availBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
  },
  availText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.success,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.titulo,
    borderRadius: BorderRadius.sm,
    paddingVertical: 12,
    ...Shadow.sm,
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  note: {
    fontSize: 11,
    color: Colors.subtitulo,
    textAlign: 'center',
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.xs,
  },
  codeText: {
    fontSize: 11,
    color: Colors.subtitulo,
  },
});
