import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, ActivityIndicator, Platform, Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import {
  AtraccionesService,
  ALL_ATTRACTION_PROVIDERS,
  ATTRACTION_PROVIDER_LABELS,
  getProviderCompanyName,
  AttractionProviderSelector
} from '../../services/atracciones.service';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';

const ITEMS_PER_PAGE = 4;
const { width } = Dimensions.get('window');

interface AttractionItem {
  id: string;
  nombre: string;
  tipo_nombre: string;
  subtipo_nombre?: string;
  ciudad: string;
  pais: string;
  descripcion_corta: string;
  duracion_minutos: number;
  calificacion: number;
  total_resenas: number;
  precio_desde: number;
  moneda: string;
  imagen_principal: string;
  provider: string;
  etiquetas: string[];
  idiomas_disponibles: string[];
  disponibilidad: {
    disponible: boolean;
    disponible_hoy: boolean;
    cupos_disponibles?: number;
    proxima_fecha_disponible?: string;
  };
}

export default function AttractionsIndexScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    ciudad?: string;
    fecha?: string;
    tipo?: string;
    proveedor?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [busqueda, setBusqueda] = useState({
    ciudad: params.ciudad || '',
    fecha: params.fecha || '',
    tipo: params.tipo || '',
  });

  // Providers selector
  const [selectedProvider, setSelectedProvider] = useState<AttractionProviderSelector>(
    (params.proveedor as AttractionProviderSelector) || 'todos'
  );
  const [failedProviders, setFailedProviders] = useState<string[]>([]);

  // List of attractions from API
  const [atracciones, setAtracciones] = useState<AttractionItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState('trending');

  // Dynamic filter state (local sidebar-like on Web, dropdown on Mobile)
  const [tipoFilter, setTipoFilter] = useState<string | null>(params.tipo || null);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  useEffect(() => {
    loadAttractions();
  }, [params.ciudad, params.fecha, params.tipo, selectedProvider, sortOption]);

  const loadAttractions = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams: any = {
        ordenar_por: sortOption,
      };

      if (params.ciudad) queryParams.ciudad = params.ciudad;
      if (params.fecha) queryParams.fecha = params.fecha;
      if (tipoFilter) queryParams.tipo = tipoFilter;

      const resp = await AtraccionesService.getAtracciones(queryParams, selectedProvider);
      
      if (resp.status !== 200 && selectedProvider !== 'todos') {
        setError(`El proveedor ${getProviderCompanyName(selectedProvider)} no está disponible en este momento.`);
        setAtracciones([]);
      } else {
        setAtracciones(resp.data ?? []);
        setFailedProviders(resp.failedProviders ?? []);
      }
    } catch (err) {
      console.error(err);
      setError('No pudimos cargar las atracciones. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = () => {
    setCurrentPage(1);
    const routeParams: Record<string, string> = {};
    if (busqueda.ciudad.trim()) routeParams.ciudad = busqueda.ciudad.trim();
    if (busqueda.fecha) routeParams.fecha = busqueda.fecha;
    if (busqueda.tipo) {
      routeParams.tipo = busqueda.tipo;
      setTipoFilter(busqueda.tipo);
    } else {
      setTipoFilter(null);
    }
    if (selectedProvider !== 'todos') routeParams.proveedor = selectedProvider;

    router.replace({
      pathname: '/atracciones' as any,
      params: routeParams,
    });
  };

  const verDetalle = (atr: AttractionItem) => {
    router.push({
      pathname: '/atracciones/[id]',
      params: { id: atr.id, provider: atr.provider }
    });
  };

  const filteredList = useMemo(() => {
    let list = [...atracciones];
    if (ratingFilter !== null) {
      list = list.filter(a => a.calificacion >= ratingFilter);
    }
    return list;
  }, [atracciones, ratingFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / ITEMS_PER_PAGE));
  const paged = filteredList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const formatDuration = (minutos: number) => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    if (h === 0) return `${m} min`;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <View style={s.root}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Search Hero */}
        <View style={s.hero}>
          <View style={s.heroOverlay} />
          <View style={s.heroContainer}>
            <View style={s.eyebrow}>
              <Ionicons name="compass-outline" size={14} color={Colors.accent} />
              <Text style={s.eyebrowText}>EXPERIENCIAS POOKING</Text>
            </View>
            <Text style={s.heroTitle}>Explora experiencias inolvidables</Text>
            <Text style={s.heroSub}>Tours, museos y aventuras para tu próximo viaje.</Text>

            {/* Floating Search Bar */}
            <View style={s.searchPanel}>
              <View style={s.formGrid}>
                <View style={s.row}>
                  <View style={s.field}>
                    <Text style={s.label}>Destino o ciudad</Text>
                    <View style={s.inputWrap}>
                      <Ionicons name="location-outline" size={16} color={Colors.extra2} />
                      <TextInput
                        style={s.textInp}
                        placeholder="¿Dónde quieres explorar?"
                        value={busqueda.ciudad}
                        onChangeText={v => setBusqueda({ ...busqueda, ciudad: v })}
                      />
                    </View>
                  </View>

                  <View style={s.field}>
                    <Text style={s.label}>Fecha</Text>
                    <View style={s.inputWrap}>
                      <Ionicons name="calendar-outline" size={16} color={Colors.extra2} />
                      <TextInput
                        style={s.textInp}
                        placeholder="YYYY-MM-DD"
                        value={busqueda.fecha}
                        onChangeText={v => setBusqueda({ ...busqueda, fecha: v })}
                      />
                    </View>
                  </View>
                </View>

                <View style={s.row}>
                  <View style={s.field}>
                    <Text style={s.label}>Proveedor microservicio</Text>
                    <View style={s.pickerWrap}>
                      <Ionicons name="cloud-outline" size={16} color={Colors.extra2} />
                      <TextInput
                        style={s.textInp}
                        value={selectedProvider === 'todos' ? 'Todos los proveedores' : (ATTRACTION_PROVIDER_LABELS as any)[selectedProvider]}
                        editable={false}
                      />
                      <ScrollView style={s.dropdownScroll} nestedScrollEnabled>
                        <TouchableOpacity style={s.dropdownItem} onPress={() => setSelectedProvider('todos')}>
                          <Text style={s.dropdownText}>Todos los proveedores</Text>
                        </TouchableOpacity>
                        {ALL_ATTRACTION_PROVIDERS.map(p => (
                          <TouchableOpacity key={p} style={s.dropdownItem} onPress={() => setSelectedProvider(p)}>
                            <Text style={s.dropdownText}>{ATTRACTION_PROVIDER_LABELS[p]}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>

                  <TouchableOpacity style={s.btnBuscar} onPress={handleBuscar} activeOpacity={0.85}>
                    <Ionicons name="search" size={16} color="#fff" />
                    <Text style={s.btnBuscarText}>Buscar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Results stats */}
        <View style={s.resultsBar}>
          <View style={{ flex: 1 }}>
            <Text style={s.resultsCount}>
              <Text style={{ fontWeight: '700' }}>{filteredList.length} experienci{filteredList.length === 1 ? 'a' : 'as'}</Text>
              {' '}disponible{filteredList.length === 1 ? '' : 's'}
              {params.ciudad ? <Text style={{ fontStyle: 'italic' }}> en {params.ciudad}</Text> : null}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[{ v: 'trending', l: 'Más populares' }, { v: 'rating', l: 'Mejor valorados' }, { v: 'price_asc', l: 'Precio: bajo a alto' }].map(opt => (
              <TouchableOpacity key={opt.v} style={[s.sortChip, sortOption === opt.v && s.sortChipOn]} onPress={() => { setSortOption(opt.v); setCurrentPage(1); }}>
                <Text style={[s.sortChipText, sortOption === opt.v && { color: Colors.titulo, fontWeight: '600' }]}>{opt.l}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Main layout */}
        <View style={s.bodyLayout}>
          {/* Web sidebar / Mobile rating filters */}
          {Platform.OS === 'web' && (
            <View style={s.sidebar}>
              <View style={s.sbSection}>
                <Text style={s.sbTitle}>Calificación Mínima</Text>
                {[5, 4, 3, 2].map(stars => (
                  <TouchableOpacity
                    key={stars}
                    style={s.sbOption}
                    onPress={() => { setRatingFilter(ratingFilter === stars ? null : stars); setCurrentPage(1); }}
                  >
                    <Ionicons name={ratingFilter === stars ? "checkbox" : "square-outline"} size={16} color={Colors.titulo} />
                    <Text style={s.sbOptionText}>{stars} ★ o más</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {ratingFilter !== null && (
                <TouchableOpacity style={s.btnClear} onPress={() => { setRatingFilter(null); setCurrentPage(1); }}>
                  <Text style={s.btnClearText}>Limpiar filtros</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* List Area */}
          <View style={s.mainArea}>
            {/* Warning if some providers failed in todos */}
            {selectedProvider === 'todos' && failedProviders.length > 0 && (
              <View style={s.warningBanner}>
                <Ionicons name="cloud-offline-outline" size={16} color={Colors.titulo} />
                <Text style={s.warningText}>
                  El proveedor de atracciones ({(failedProviders as any).map((p: any) => (ATTRACTION_PROVIDER_LABELS as any)[p] || p).join(', ')}) no respondió. Se muestran los demás resultados.
                </Text>
              </View>
            )}

            {loading ? (
              <View style={s.loadingBox}>
                <ActivityIndicator size="large" color={Colors.titulo} />
                <Text style={s.loadingText}>Buscando experiencias disponibles...</Text>
              </View>
            ) : error ? (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : filteredList.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="compass-outline" size={54} color={Colors.extra2} />
                <Text style={s.emptyTitle}>No encontramos experiencias</Text>
                <Text style={s.emptyDesc}>Ninguna atracción coincide con tus criterios de búsqueda. Intenta limpiar los filtros.</Text>
              </View>
            ) : (
              <View style={s.list}>
                {paged.map(atr => (
                  <View key={atr.id} style={s.card}>
                    {/* Card Image */}
                    <View style={s.cardImageWrap}>
                      <Image
                        source={{ uri: atr.imagen_principal || 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&q=80' }}
                        style={s.cardImage}
                        resizeMode="cover"
                      />
                      <View style={s.cardBadge}>
                        <Text style={s.cardBadgeText}>{atr.tipo_nombre}</Text>
                      </View>
                      <View style={[s.dispBadge, atr.disponibilidad?.disponible ? s.dispOk : s.dispNo]}>
                        <Text style={[s.dispBadgeText, atr.disponibilidad?.disponible ? { color: Colors.success } : { color: Colors.error }]}>
                          {atr.disponibilidad?.disponible ? 'Disponible' : 'Sin cupos'}
                        </Text>
                      </View>
                    </View>

                    {/* Card Info */}
                    <View style={s.cardInfo}>
                      <View style={s.cardTop}>
                        <Text style={s.cardName} numberOfLines={2}>{atr.nombre}</Text>
                        {atr.subtipo_nombre && <Text style={s.cardSubtype}>{atr.subtipo_nombre}</Text>}
                      </View>

                      <View style={s.cardLoc}>
                        <Ionicons name="location-outline" size={13} color={Colors.extra2} />
                        <Text style={s.cardLocText} numberOfLines={1}>{atr.ciudad}, {atr.pais}</Text>
                      </View>

                      <Text style={s.cardDesc} numberOfLines={2}>{atr.descripcion_corta}</Text>

                      {/* Meta info row */}
                      <View style={s.cardMeta}>
                        <View style={s.metaItem}>
                          <Ionicons name="time-outline" size={13} color={Colors.subtitulo} />
                          <Text style={s.metaText}>{formatDuration(atr.duracion_minutos)}</Text>
                        </View>
                        <View style={s.metaItem}>
                          <Ionicons name="star" size={13} color={Colors.star} />
                          <Text style={s.metaText}>{atr.calificacion.toFixed(1)} ({atr.total_resenas} reseñas)</Text>
                        </View>
                      </View>

                      {/* Footer: Price + Button */}
                      <View style={s.cardFooter}>
                        <View style={s.priceBlock}>
                          <Text style={s.priceLabel}>DESDE</Text>
                          <Text style={s.priceValue}>${atr.precio_desde.toFixed(2)} <Text style={s.currency}>{atr.moneda}</Text></Text>
                          <Text style={s.pricePer}>por persona</Text>
                        </View>
                        <TouchableOpacity style={s.btnVer} onPress={() => verDetalle(atr)} activeOpacity={0.85}>
                          <Text style={s.btnVerText}>Seleccionar</Text>
                          <Ionicons name="arrow-forward" size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
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
            )}
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

  // Hero section
  hero: {
    height: 320,
    backgroundColor: '#8E5A54',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  heroContainer: {
    zIndex: 2,
    alignItems: 'center',
    padding: Spacing.md,
    width: '100%',
    maxWidth: 960,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  eyebrowText: {
    color: Colors.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  searchPanel: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    width: '100%',
    ...Shadow.md,
  },
  formGrid: { gap: Spacing.sm },
  row: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: Spacing.sm,
  },
  field: {
    flex: 1,
    gap: 2,
    position: 'relative',
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.subtitulo,
    textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    height: 38,
    backgroundColor: Colors.bg,
  },
  pickerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    height: 38,
    backgroundColor: Colors.bg,
    zIndex: 10,
  },
  textInp: {
    flex: 1,
    fontSize: 12,
    color: Colors.extra1,
    paddingLeft: Spacing.xs,
  },
  dropdownScroll: {
    position: 'absolute',
    top: 36,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 100,
    borderRadius: BorderRadius.sm,
    ...Shadow.sm,
    display: Platform.OS === 'web' ? 'flex' : 'none',
  },
  dropdownItem: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownText: {
    fontSize: 11,
    color: Colors.extra1,
  },
  btnBuscar: {
    backgroundColor: Colors.titulo,
    borderRadius: BorderRadius.sm,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    alignSelf: Platform.OS === 'web' ? 'flex-end' : 'stretch',
    minWidth: 120,
  },
  btnBuscarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // Results bar
  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  resultsCount: {
    fontSize: 14,
    color: Colors.extra1,
  },
  sortChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bg,
    marginLeft: 6,
  },
  sortChipOn: {
    borderColor: Colors.titulo,
    backgroundColor: Colors.primaryLight,
  },
  sortChipText: {
    fontSize: 12,
    color: Colors.subtitulo,
  },

  // Body Layout
  bodyLayout: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },

  // Sidebar (Web)
  sidebar: {
    width: 200,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    alignSelf: 'flex-start',
    ...Shadow.sm,
  },
  sbSection: { gap: Spacing.xs },
  sbTitle: { fontSize: 13, fontWeight: '700', color: Colors.titulo, marginBottom: 4, textTransform: 'uppercase' },
  sbOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  sbOptionText: { fontSize: 12, color: Colors.extra1 },
  btnClear: { borderWidth: 1, borderColor: Colors.titulo, borderRadius: BorderRadius.sm, paddingVertical: 6, alignItems: 'center' },
  btnClearText: { color: Colors.titulo, fontWeight: '700', fontSize: 12 },

  // Main area list
  mainArea: { flex: 1 },
  warningBanner: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(142, 90, 84, 0.15)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: Colors.titulo,
    lineHeight: 16,
  },
  loadingBox: { padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  loadingText: { color: Colors.subtitulo, fontSize: 13 },
  errorBox: { padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  errorText: { color: Colors.error, fontSize: 13, textAlign: 'center' },
  emptyBox: { padding: Spacing.xxl, alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, gap: Spacing.xs, ...Shadow.sm },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.titulo },
  emptyDesc: { fontSize: 12, color: Colors.subtitulo, textAlign: 'center' },

  // List & Cards
  list: { gap: Spacing.md },
  card: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  cardImageWrap: {
    width: Platform.OS === 'web' ? 200 : '100%',
    height: Platform.OS === 'web' ? '100%' : 150,
    backgroundColor: '#eee',
    position: 'relative',
  },
  cardImage: { width: '100%', height: '100%' },
  cardBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: Colors.overlay, paddingVertical: 4, paddingHorizontal: 8, borderRadius: BorderRadius.sm },
  cardBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  dispBadge: { position: 'absolute', top: 8, right: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: BorderRadius.sm, borderWidth: 1 },
  dispBadgeText: { fontSize: 9, fontWeight: '700' },
  dispOk: { backgroundColor: 'rgba(39, 174, 96, 0.1)', borderColor: 'rgba(39, 174, 96, 0.2)' },
  dispNo: { backgroundColor: 'rgba(192, 57, 43, 0.1)', borderColor: 'rgba(192, 57, 43, 0.2)' },

  // Info card section
  cardInfo: { flex: 1, padding: Spacing.md, gap: Spacing.sm },
  cardTop: { gap: 2 },
  cardName: { fontSize: 16, fontWeight: '700', color: Colors.extra1 },
  cardSubtype: { fontSize: 10, color: Colors.titulo, fontWeight: '600', textTransform: 'uppercase' },
  cardLoc: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardLocText: { fontSize: 12, color: Colors.subtitulo },
  cardDesc: { fontSize: 12, color: Colors.subtitulo, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', gap: Spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: Colors.subtitulo },

  // Card footer pricing
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(198,177,125,0.15)',
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  priceBlock: { gap: 1 },
  priceLabel: { fontSize: 8, fontWeight: '700', color: Colors.subtitulo, letterSpacing: 0.5 },
  priceValue: { fontSize: 16, fontWeight: '700', color: Colors.titulo },
  currency: { fontSize: 12, fontWeight: '400' },
  pricePer: { fontSize: 10, color: Colors.subtitulo },
  btnVer: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.titulo, paddingVertical: 8, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm, ...Shadow.sm },
  btnVerText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // Pagination
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.md },
  pagBtn: { width: 32, height: 32, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: '#fff', justifyContent: 'center' },
  pagBtnActive: { backgroundColor: Colors.titulo, borderColor: Colors.titulo },
  pagBtnText: { fontSize: 12, color: Colors.extra1 },
});
