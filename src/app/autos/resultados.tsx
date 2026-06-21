import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, ActivityIndicator, Modal, Pressable,
  ImageBackground, useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import CalendarModal from '../../components/CalendarModal';
import { CarService, CriteriosBusquedaAutos } from '../../services/cars.service';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { setStorageItem } from '../../services/storage';

const ITEMS_PER_PAGE = 6;

interface LocationItem {
  idLocalizacion: number;
  nombre: string;
}

interface CategoryItem {
  idCategoria: number;
  nombre: string;
}

interface VehicleItem {
  idVehiculo: number;
  marca: string;
  modelo: string;
  anio: number;
  combustible: string;
  transmision: string;
  capacidadPasajeros: number;
  capacidadMaletas: number;
  aireAcondicionado: boolean;
  imagenUrl: string;
  provider: string;
  localizacion?: LocationItem;
  categoria?: CategoryItem;
  precio?: {
    precioBaseDia: number;
    total: number;
  };
}

const TRANSMISION_OPTIONS = [
  { label: 'Cualquiera', value: '' },
  { label: 'Automática', value: 'AUTOMATICA' },
  { label: 'Manual', value: 'MANUAL' },
];

const SORT_OPTIONS = [
  { label: 'Relevancia', value: '' },
  { label: 'Precio: Menor a Mayor', value: 'price_asc' },
  { label: 'Precio: Mayor a Menor', value: 'price_desc' },
];

const PROVIDER_OPTIONS = [
  { label: 'Todos', value: 'todos' },
  { label: 'RedCar', value: 'martin' },
  { label: 'BudgetCar', value: 'ana' },
  { label: 'Europcar', value: 'dylan' },
  { label: 'Rentix', value: 'kath' },
];

type PickerKey = 'proveedor' | 'recogida' | 'devolucion' | 'categoria' | 'transmision' | 'sort';

interface PickerOption { label: string; value: string | number; }

function BottomSheet({
  visible,
  title,
  options,
  activeValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: PickerOption[];
  activeValue: string | number | null | undefined;
  onSelect: (v: any) => void;
  onClose: () => void;
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

function SelectPicker({
  label,
  icon,
  displayValue,
  onPress,
}: {
  label: string;
  icon: string;
  displayValue: string;
  onPress: () => void;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.pickerTrigger} onPress={onPress} activeOpacity={0.8}>
        <Ionicons name={icon as any} size={16} color={Colors.extra2} />
        <Text style={s.pickerTriggerText} numberOfLines={1}>{displayValue || '—'}</Text>
        <Ionicons name="chevron-down" size={14} color={Colors.subtitulo} />
      </TouchableOpacity>
    </View>
  );
}

export default function CarResultsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const params = useLocalSearchParams<{
    fechaRecogida?: string;
    fechaDevolucion?: string;
    proveedor?: string;
    idLocalizacionRecogida?: string;
    idLocalizacionDevolucion?: string;
    nombreCategoria?: string;
    transmision?: string;
    nombreMarca?: string;
    sort?: string;
  }>();

  const today = new Date().toISOString().split('T')[0];

  // Filter lists from API
  const [localizaciones, setLocalizaciones] = useState<LocationItem[]>([]);
  const [categorias, setCategorias] = useState<CategoryItem[]>([]);

  // Search criteria
  const [criterios, setCriterios] = useState<CriteriosBusquedaAutos>({
    idLocalizacionRecogida: params.idLocalizacionRecogida ? +params.idLocalizacionRecogida : null,
    idLocalizacionDevolucion: params.idLocalizacionDevolucion ? +params.idLocalizacionDevolucion : null,
    fechaRecogida: params.fechaRecogida || '',
    fechaDevolucion: params.fechaDevolucion || '',
    nombreCategoria: params.nombreCategoria || '',
    transmision: params.transmision || '',
    nombreMarca: params.nombreMarca || '',
    proveedor: params.proveedor || 'todos',
    sort: params.sort || '',
  });

  const [vehiculos, setVehiculos] = useState<VehicleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Calendar open states
  const [showCalRecogida, setShowCalRecogida] = useState(false);
  const [showCalDevolucion, setShowCalDevolucion] = useState(false);

  // Picker open state (null = closed, key string = which picker is open)
  const [openPicker, setOpenPicker] = useState<PickerKey | null>(null);

  useEffect(() => {
    async function loadFilters() {
      try {
        const prov = criterios.proveedor;
        const locs = await CarService.getLocalizaciones(prov);
        const cats = await CarService.getCategorias(prov);
        setLocalizaciones(locs);
        setCategorias(cats);
        if (!criterios.idLocalizacionRecogida && locs.length > 0) {
          const autoId = locs[0].idLocalizacion;
          // Functional update avoids overwriting a selection the user made while
          // localizaciones were still loading (race condition guard)
          setCriterios(c => c.idLocalizacionRecogida ? c : { ...c, idLocalizacionRecogida: autoId });
          // Re-trigger search now that we have a valid localizacion
          buscarResultados(autoId);
        }
      } catch (err) {
        console.warn('Error loading filters data', err);
      }
    }
    loadFilters();
  }, [criterios.proveedor]);

  useEffect(() => {
    buscarResultados();
  }, [
    params.fechaRecogida,
    params.fechaDevolucion,
    params.proveedor,
    params.idLocalizacionRecogida,
    params.idLocalizacionDevolucion,
    params.nombreCategoria,
    params.transmision,
    params.nombreMarca,
    params.sort,
  ]);

  // idLocRecogidaOverride lets callers bypass stale criterios/params state
  const buscarResultados = async (idLocRecogidaOverride?: number) => {
    setLoading(true);
    try {
      const searchParams: CriteriosBusquedaAutos = {
        idLocalizacionRecogida: idLocRecogidaOverride !== undefined
          ? idLocRecogidaOverride
          : (params.idLocalizacionRecogida ? +params.idLocalizacionRecogida : criterios.idLocalizacionRecogida),
        idLocalizacionDevolucion: params.idLocalizacionDevolucion ? +params.idLocalizacionDevolucion : criterios.idLocalizacionDevolucion,
        fechaRecogida: params.fechaRecogida || criterios.fechaRecogida,
        fechaDevolucion: params.fechaDevolucion || criterios.fechaDevolucion,
        nombreCategoria: params.nombreCategoria || criterios.nombreCategoria,
        transmision: params.transmision || criterios.transmision,
        nombreMarca: params.nombreMarca || criterios.nombreMarca,
        proveedor: params.proveedor || criterios.proveedor,
        sort: params.sort || criterios.sort,
      };

      const results = await CarService.buscarVehiculos(searchParams, 1, 100);

      const checked = await Promise.all(
        results.map(async (v) => {
          const rec = searchParams.fechaRecogida || v.disponibilidad?.fechaRecogida || '';
          const dev = searchParams.fechaDevolucion || v.disponibilidad?.fechaDevolucion || '';
          const idLocRec = v.localizacion?.idLocalizacion ?? searchParams.idLocalizacionRecogida ?? 0;
          if (!v.provider) return { v, disponible: false };
          const disponible = await CarService.verificarDisponibilidad(v.idVehiculo, v.provider, rec, dev, idLocRec);
          return { v, disponible };
        })
      );

      const disponibles = checked.filter(c => c.disponible).map(c => c.v);

      if (searchParams.sort === 'price_asc') {
        disponibles.sort((a, b) => (a.precio?.precioBaseDia ?? 0) - (b.precio?.precioBaseDia ?? 0));
      } else if (searchParams.sort === 'price_desc') {
        disponibles.sort((a, b) => (b.precio?.precioBaseDia ?? 0) - (a.precio?.precioBaseDia ?? 0));
      }

      setVehiculos(disponibles);
      await setStorageItem('car-results', JSON.stringify(disponibles));
      await setStorageItem('car-criterios', JSON.stringify(searchParams));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = () => {
    setCurrentPage(1);
    const routeParams: Record<string, string> = {};
    if (criterios.idLocalizacionRecogida) routeParams.idLocalizacionRecogida = String(criterios.idLocalizacionRecogida);
    if (criterios.idLocalizacionDevolucion) routeParams.idLocalizacionDevolucion = String(criterios.idLocalizacionDevolucion);
    if (criterios.fechaRecogida) routeParams.fechaRecogida = criterios.fechaRecogida;
    if (criterios.fechaDevolucion) routeParams.fechaDevolucion = criterios.fechaDevolucion;
    if (criterios.nombreCategoria) routeParams.nombreCategoria = criterios.nombreCategoria;
    if (criterios.transmision) routeParams.transmision = criterios.transmision;
    if (criterios.nombreMarca) routeParams.nombreMarca = criterios.nombreMarca;
    if (criterios.proveedor && criterios.proveedor !== 'todos') routeParams.proveedor = criterios.proveedor;
    if (criterios.sort) routeParams.sort = criterios.sort;
    router.replace({ pathname: '/autos/resultados', params: routeParams });
  };

  const verDetalle = async (vehiculo: VehicleItem) => {
    await setStorageItem('car-selected', JSON.stringify(vehiculo));
    if (vehiculo.provider) await setStorageItem('car-provider', vehiculo.provider);
    router.push({ pathname: '/autos/detalle/[id]' as any, params: { id: String(vehiculo.idVehiculo) } });
  };

  const handleReservar = async (vehiculo: VehicleItem) => {
    await setStorageItem('car-selected', JSON.stringify(vehiculo));
    if (vehiculo.provider) await setStorageItem('car-provider', vehiculo.provider);
    router.push({ pathname: '/autos/checkout/[id]' as any, params: { id: String(vehiculo.idVehiculo) } });
  };

  const nombreLocalizacion = (id: number | null) => {
    if (!id) return '';
    return localizaciones.find(l => l.idLocalizacion === id)?.nombre ?? '';
  };

  const totalPages = Math.max(1, Math.ceil(vehiculos.length / ITEMS_PER_PAGE));
  const paged = vehiculos.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getFuelIcon = (fuel: string) => {
    const f = fuel?.toUpperCase();
    if (f === 'ELECTRICO') return 'flash-outline';
    if (f === 'HIBRIDO') return 'leaf-outline';
    return 'funnel-outline';
  };

  const formatDisplayDate = (d: string) => {
    if (!d) return 'Seleccionar';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const transmisionLabel = (v: string) =>
    v === 'AUTOMATICA' ? 'Automática' : v === 'MANUAL' ? 'Manual' : 'Cualquiera';

  const sortLabel = (v: string) =>
    v === 'price_asc' ? 'Precio: Menor a Mayor' : v === 'price_desc' ? 'Precio: Mayor a Menor' : 'Relevancia';

  const providerLabel = (v: string) =>
    PROVIDER_OPTIONS.find(option => option.value === v)?.label ?? 'Todos';

  // Build picker options
  const locOptsRecogida: PickerOption[] = localizaciones.map(l => ({ label: l.nombre, value: l.idLocalizacion }));
  const locOptsDevolucion: PickerOption[] = [
    { label: 'Misma sucursal', value: 0 },
    ...localizaciones.map(l => ({ label: l.nombre, value: l.idLocalizacion })),
  ];
  const catOpts: PickerOption[] = [
    { label: 'Todas las categorías', value: '' },
    ...categorias.map(c => ({ label: c.nombre, value: c.nombre })),
  ];

  const heroHeight = isWide ? 340 : 280;

  return (
    <View style={s.root}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero with search panel */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1600&q=80' }}
          style={[s.hero, { height: heroHeight }]}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(70,64,60,0.7)', 'rgba(142,90,84,0.6)', 'rgba(198,177,125,0.4)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Category label */}
          <View style={s.categoryLabel}>
            <Text style={s.categoryLabelText}>ALQUILER DE AUTOS</Text>
          </View>

          {/* Glass search panel */}
          <View style={s.searchBarFloating}>
            {isWide ? (
              <>
                <View style={[s.formRow, { flexDirection: 'row' }]}>
                  {/* Lugar de Recogida */}
                  <SelectPicker
                    label="Lugar de Recogida"
                    icon="location-outline"
                    displayValue={nombreLocalizacion(criterios.idLocalizacionRecogida ?? null)}
                    onPress={() => setOpenPicker('recogida')}
                  />
                  {/* Lugar de Devolución */}
                  <SelectPicker
                    label="Lugar de Devolución"
                    icon="location-outline"
                    displayValue={
                      criterios.idLocalizacionDevolucion
                        ? nombreLocalizacion(criterios.idLocalizacionDevolucion)
                        : 'Misma sucursal'
                    }
                    onPress={() => setOpenPicker('devolucion')}
                  />
                </View>

                <View style={[s.formRow, { flexDirection: 'row' }]}>
                  {/* Fecha Recogida */}
                  <View style={s.field}>
                    <Text style={s.label}>Fecha Recogida</Text>
                    <TouchableOpacity style={s.dateTrigger} onPress={() => setShowCalRecogida(true)} activeOpacity={0.8}>
                      <Ionicons name="calendar-outline" size={16} color={Colors.extra2} />
                      <Text style={s.dateTriggerText}>{formatDisplayDate(criterios.fechaRecogida || '')}</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Fecha Devolución */}
                  <View style={s.field}>
                    <Text style={s.label}>Fecha Devolución</Text>
                    <TouchableOpacity
                      style={s.dateTrigger}
                      onPress={() => setShowCalDevolucion(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="calendar-outline" size={16} color={Colors.extra2} />
                      <Text style={s.dateTriggerText}>{formatDisplayDate(criterios.fechaDevolucion || '')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[s.formRow, { flexDirection: 'row' }]}>
                  {/* Categoría */}
                  <SelectPicker
                    label="Categoría"
                    icon="apps-outline"
                    displayValue={criterios.nombreCategoria || 'Todas las categorías'}
                    onPress={() => setOpenPicker('categoria')}
                  />
                  {/* Marca */}
                  <View style={s.field}>
                    <Text style={s.label}>Marca</Text>
                    <View style={s.inputWrap}>
                      <Ionicons name="car-outline" size={16} color={Colors.extra2} />
                      <TextInput
                        style={s.textInp}
                        placeholder="Ej: Toyota"
                        placeholderTextColor="rgba(96,98,86,0.5)"
                        value={criterios.nombreMarca}
                        onChangeText={v => setCriterios(c => ({ ...c, nombreMarca: v }))}
                      />
                    </View>
                  </View>
                </View>

                <View style={[s.formRow, { flexDirection: 'row' }]}>
                  {/* Transmisión */}
                  <SelectPicker
                    label="Transmisión"
                    icon="settings-outline"
                    displayValue={transmisionLabel(criterios.transmision || '')}
                    onPress={() => setOpenPicker('transmision')}
                  />
                  {/* Ordenar por */}
                  <SelectPicker
                    label="Ordenar por"
                    icon="filter-outline"
                    displayValue={sortLabel(criterios.sort || '')}
                    onPress={() => setOpenPicker('sort')}
                  />
                </View>
              </>
            ) : (
              <>
                <SelectPicker
                  label="Proveedor"
                  icon="cloud-outline"
                  displayValue={providerLabel(criterios.proveedor || 'todos')}
                  onPress={() => setOpenPicker('proveedor')}
                />

                <SelectPicker
                  label="Sucursal de Recogida"
                  icon="location-outline"
                  displayValue={nombreLocalizacion(criterios.idLocalizacionRecogida ?? null)}
                  onPress={() => setOpenPicker('recogida')}
                />

                <View style={s.field}>
                  <Text style={s.label}>Fecha de Recogida</Text>
                  <TouchableOpacity style={s.dateTrigger} onPress={() => setShowCalRecogida(true)} activeOpacity={0.8}>
                    <Ionicons name="calendar-outline" size={16} color={Colors.extra2} />
                    <Text style={s.dateTriggerText}>{formatDisplayDate(criterios.fechaRecogida || '')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={s.field}>
                  <Text style={s.label}>Fecha de Devolución</Text>
                  <TouchableOpacity
                    style={s.dateTrigger}
                    onPress={() => setShowCalDevolucion(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={16} color={Colors.extra2} />
                    <Text style={s.dateTriggerText}>{formatDisplayDate(criterios.fechaDevolucion || '')}</Text>
                  </TouchableOpacity>
                </View>

                <SelectPicker
                  label="Categoría"
                  icon="apps-outline"
                  displayValue={criterios.nombreCategoria || 'Todas las categorías'}
                  onPress={() => setOpenPicker('categoria')}
                />

                <SelectPicker
                  label="Transmisión"
                  icon="settings-outline"
                  displayValue={transmisionLabel(criterios.transmision || '')}
                  onPress={() => setOpenPicker('transmision')}
                />

                <View style={s.field}>
                  <Text style={s.label}>Marca</Text>
                  <View style={s.inputWrap}>
                    <Ionicons name="car-outline" size={16} color={Colors.extra2} />
                    <TextInput
                      style={s.textInp}
                      placeholder="Ej: Toyota"
                      placeholderTextColor="rgba(96,98,86,0.5)"
                      value={criterios.nombreMarca}
                      onChangeText={v => setCriterios(c => ({ ...c, nombreMarca: v }))}
                    />
                  </View>
                </View>

                <SelectPicker
                  label="Ordenar por"
                  icon="filter-outline"
                  displayValue={sortLabel(criterios.sort || '')}
                  onPress={() => setOpenPicker('sort')}
                />
              </>
            )}

            <TouchableOpacity style={s.btnBuscar} onPress={handleBuscar}>
              <Ionicons name="search" size={18} color="#fff" />
              <Text style={s.btnBuscarText}>Buscar Vehículos</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>

        {/* Results Body */}
        <View style={s.mainContent}>
          <View style={s.resultsHeader}>
            <Text style={s.resultsTitle}>
              {loading ? 'Buscando...' : `${vehiculos.length} vehículo${vehiculos.length !== 1 ? 's' : ''} disponible${vehiculos.length !== 1 ? 's' : ''}`}
            </Text>
            {criterios.idLocalizacionRecogida ? (
              <Text style={s.resultsSubtitle}>
                {nombreLocalizacion(criterios.idLocalizacionRecogida)}
                {criterios.idLocalizacionDevolucion && criterios.idLocalizacionDevolucion !== criterios.idLocalizacionRecogida
                  ? ` → ${nombreLocalizacion(criterios.idLocalizacionDevolucion)}`
                  : ''}
              </Text>
            ) : null}
          </View>

          {loading ? (
            <View style={s.loadingBox}>
              <ActivityIndicator size="large" color={Colors.titulo} />
              <Text style={s.loadingText}>Verificando disponibilidad de vehículos...</Text>
            </View>
          ) : vehiculos.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="car-outline" size={54} color={Colors.extra2} />
              <Text style={s.emptyTitle}>No encontramos vehículos</Text>
              <Text style={s.emptyDesc}>Intenta cambiar los filtros de búsqueda o la sucursal seleccionada.</Text>
            </View>
          ) : (
            <View style={s.grid}>
              {paged.map(v => (
                <View key={v.idVehiculo} style={s.card}>
                  {/* Card Header with gradient */}
                  <LinearGradient
                    colors={[Colors.extra1, Colors.titulo]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.cardHeader}
                  >
                    <View style={s.brandRow}>
                      <View style={s.brandIcon}>
                        <Ionicons name="car" size={16} color="#fff" />
                      </View>
                      <View>
                        <Text style={s.brandName}>{v.marca}</Text>
                        <Text style={s.modelName}>{v.modelo} · {v.anio}</Text>
                      </View>
                    </View>
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{v.categoria?.nombre || 'General'}</Text>
                    </View>
                  </LinearGradient>

                  {/* Card Image */}
                  <View style={s.imageWrap}>
                    <Image
                      source={{ uri: v.imagenUrl || 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80' }}
                      style={s.image}
                      resizeMode="cover"
                    />
                    <View style={s.locationTag}>
                      <Ionicons name="location" size={12} color="#fff" />
                      <Text style={s.locationTagText}>{v.localizacion?.nombre || 'Sucursal'}</Text>
                    </View>
                  </View>

                  {/* Specs row */}
                  <View style={s.specs}>
                    <View style={s.specItem}>
                      <Ionicons name="people-outline" size={14} color={Colors.subtitulo} />
                      <Text style={s.specText}>{v.capacidadPasajeros} pax</Text>
                    </View>
                    <View style={s.specItem}>
                      <Ionicons name="briefcase-outline" size={14} color={Colors.subtitulo} />
                      <Text style={s.specText}>{v.capacidadMaletas} maletas</Text>
                    </View>
                    <View style={s.specItem}>
                      <Ionicons name="settings-outline" size={14} color={Colors.subtitulo} />
                      <Text style={s.specText}>{v.transmision === 'AUTOMATICA' ? 'Auto' : 'Manual'}</Text>
                    </View>
                    <View style={s.specItem}>
                      <Ionicons name={getFuelIcon(v.combustible)} size={14} color={Colors.subtitulo} />
                      <Text style={s.specText}>{v.combustible}</Text>
                    </View>
                    {v.aireAcondicionado && (
                      <View style={[s.specItem, s.specAc]}>
                        <Ionicons name="snow-outline" size={14} color={Colors.titulo} />
                        <Text style={[s.specText, { color: Colors.titulo }]}>A/C</Text>
                      </View>
                    )}
                  </View>

                  {/* Divider notch */}
                  <View style={s.divider}>
                    <View style={[s.notch, s.notchLeft]} />
                    <View style={s.dividerLine} />
                    <View style={[s.notch, s.notchRight]} />
                  </View>

                  {/* Footer pricing */}
                  <View style={s.cardFooter}>
                    <View style={s.priceBlock}>
                      <Text style={s.priceLabel}>DESDE</Text>
                      <Text style={s.priceValue}>${(v.precio?.precioBaseDia ?? 0).toFixed(2)}</Text>
                      <Text style={s.priceTotal}>por día · Total ${(v.precio?.total ?? 0).toFixed(2)}</Text>
                    </View>
                    <View style={s.actions}>
                      <TouchableOpacity style={s.btnDetails} onPress={() => verDetalle(v)}>
                        <Ionicons name="eye-outline" size={14} color={Colors.titulo} />
                        <Text style={s.btnDetailsText}>Detalle</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.btnReserve} onPress={() => handleReservar(v)} activeOpacity={0.85}>
                        <Text style={s.btnReserveText}>Reservar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <View style={s.pagination}>
              <TouchableOpacity style={s.pagBtn} disabled={currentPage === 1} onPress={() => setCurrentPage(currentPage - 1)}>
                <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? Colors.textMuted : Colors.titulo} />
              </TouchableOpacity>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <TouchableOpacity key={p} style={[s.pagBtn, currentPage === p && s.pagBtnActive]} onPress={() => setCurrentPage(p)}>
                  <Text style={[s.pagBtnText, currentPage === p && { color: '#fff', fontWeight: '700' }]}>{p}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={s.pagBtn} disabled={currentPage === totalPages} onPress={() => setCurrentPage(currentPage + 1)}>
                <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? Colors.textMuted : Colors.titulo} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <Footer />
      </ScrollView>

      {/* Calendar Modals */}
      <CalendarModal
        visible={showCalRecogida}
        value={criterios.fechaRecogida || ''}
        onSelect={d => setCriterios(c => ({ ...c, fechaRecogida: d }))}
        onClose={() => setShowCalRecogida(false)}
        minDate={today}
      />
      <CalendarModal
        visible={showCalDevolucion}
        value={criterios.fechaDevolucion || ''}
        onSelect={d => setCriterios(c => ({ ...c, fechaDevolucion: d }))}
        onClose={() => setShowCalDevolucion(false)}
        minDate={criterios.fechaRecogida || today}
      />

      {/* Bottom Sheet Pickers */}
      <BottomSheet
        visible={openPicker === 'proveedor'}
        title="Proveedor"
        options={PROVIDER_OPTIONS}
        activeValue={criterios.proveedor}
        onSelect={v => setCriterios(c => ({
          ...c,
          proveedor: v,
          idLocalizacionRecogida: null,
          idLocalizacionDevolucion: null,
        }))}
        onClose={() => setOpenPicker(null)}
      />
      <BottomSheet
        visible={openPicker === 'recogida'}
        title={isWide ? 'Lugar de Recogida' : 'Sucursal de Recogida'}
        options={locOptsRecogida}
        activeValue={criterios.idLocalizacionRecogida}
        onSelect={v => setCriterios(c => ({ ...c, idLocalizacionRecogida: +v }))}
        onClose={() => setOpenPicker(null)}
      />
      <BottomSheet
        visible={openPicker === 'devolucion'}
        title="Lugar de Devolución"
        options={locOptsDevolucion}
        activeValue={criterios.idLocalizacionDevolucion ?? 0}
        onSelect={v => setCriterios(c => ({ ...c, idLocalizacionDevolucion: +v === 0 ? null : +v }))}
        onClose={() => setOpenPicker(null)}
      />
      <BottomSheet
        visible={openPicker === 'categoria'}
        title="Categoría"
        options={catOpts}
        activeValue={criterios.nombreCategoria}
        onSelect={v => setCriterios(c => ({ ...c, nombreCategoria: v }))}
        onClose={() => setOpenPicker(null)}
      />
      <BottomSheet
        visible={openPicker === 'transmision'}
        title="Transmisión"
        options={TRANSMISION_OPTIONS}
        activeValue={criterios.transmision}
        onSelect={v => setCriterios(c => ({ ...c, transmision: v }))}
        onClose={() => setOpenPicker(null)}
      />
      <BottomSheet
        visible={openPicker === 'sort'}
        title="Ordenar por"
        options={SORT_OPTIONS}
        activeValue={criterios.sort}
        onSelect={v => setCriterios(c => ({ ...c, sort: v }))}
        onClose={() => setOpenPicker(null)}
      />
    </View>
  );
}

// Bottom sheet styles
const bs = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 8,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(198,177,125,0.4)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.titulo,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,177,125,0.2)',
    marginBottom: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,177,125,0.1)',
  },
  itemActive: {
    backgroundColor: Colors.primaryLight,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    color: Colors.extra1,
  },
  itemTextActive: {
    color: Colors.titulo,
    fontWeight: '600',
  },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1 },

  // Hero
  hero: {
    width: '100%',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  categoryLabel: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(198,177,125,0.5)',
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.xl,
  },
  categoryLabelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },

  // Search panel glass
  searchBarFloating: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: 2,
    borderColor: Colors.extra2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    margin: Spacing.md,
    gap: Spacing.md,
    ...Shadow.lg,
  },
  formRow: {
    gap: Spacing.md,
  },
  field: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.subtitulo,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.accentBorder,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    height: 42,
    backgroundColor: Colors.bg,
    gap: 6,
  },
  pickerTriggerText: {
    flex: 1,
    fontSize: 13,
    color: Colors.extra1,
  },
  dateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.accentBorder,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    height: 42,
    backgroundColor: Colors.bg,
    gap: 6,
  },
  dateTriggerText: {
    flex: 1,
    fontSize: 13,
    color: Colors.extra1,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.accentBorder,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    height: 42,
    backgroundColor: Colors.bg,
    gap: 6,
  },
  textInp: {
    flex: 1,
    fontSize: 13,
    color: Colors.extra1,
  },
  btnBuscar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.titulo,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    ...Shadow.sm,
  },
  btnBuscarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Main list
  mainContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.md,
  },
  resultsHeader: {
    marginBottom: Spacing.md,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.titulo,
  },
  resultsSubtitle: {
    fontSize: 13,
    color: Colors.subtitulo,
    marginTop: 2,
  },
  loadingBox: {
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.subtitulo,
    fontSize: 13,
  },
  emptyBox: {
    padding: Spacing.xxl,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.titulo,
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.subtitulo,
    textAlign: 'center',
    maxWidth: 300,
  },

  // Vehicle Cards grid
  grid: {
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  modelName: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  imageWrap: {
    height: 160,
    backgroundColor: '#eaeaea',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  locationTag: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.overlay,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  // Specs
  specs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  specAc: {
    borderColor: Colors.titulo,
    backgroundColor: Colors.primaryLight,
  },
  specText: {
    fontSize: 12,
    color: Colors.extra1,
  },

  // Perforated Divider
  divider: {
    height: 12,
    position: 'relative',
    justifyContent: 'center',
  },
  dividerLine: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  notch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.bg,
    position: 'absolute',
    borderWidth: 1,
    borderColor: Colors.border,
    zIndex: 1,
  },
  notchLeft: { left: -6 },
  notchRight: { right: -6 },

  // Card Footer pricing
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(198,177,125,0.15)',
    backgroundColor: 'rgba(251, 248, 234, 0.25)',
  },
  priceBlock: {
    gap: 1,
  },
  priceLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.subtitulo,
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.titulo,
  },
  priceTotal: {
    fontSize: 10,
    color: Colors.subtitulo,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  btnDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.bg,
  },
  btnDetailsText: {
    color: Colors.titulo,
    fontSize: 12,
    fontWeight: '600',
  },
  btnReserve: {
    backgroundColor: Colors.titulo,
    borderRadius: BorderRadius.sm,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  btnReserveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  pagBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  pagBtnActive: {
    backgroundColor: Colors.titulo,
    borderColor: Colors.titulo,
  },
  pagBtnText: {
    fontSize: 13,
    color: Colors.extra1,
  },
});
