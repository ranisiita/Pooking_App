import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, ActivityIndicator, Platform, Dimensions,
  ImageBackground, useWindowDimensions, Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import CalendarModal from '../../components/CalendarModal';
import {
  AtraccionesService,
  ALL_ATTRACTION_PROVIDERS,
  ATTRACTION_PROVIDER_LABELS,
  getProviderCompanyName,
  AttractionProviderSelector
} from '../../services/atracciones.service';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';

const ITEMS_PER_PAGE = 4;
const BG_NATIVE = require('../../../public/images/search_resultado_fondo_atrac.jpg');

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

  const [containerWidth, setContainerWidth] = useState(0);
  const isWide = containerWidth >= 850;

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

  // Filters State
  const [filtrosLoading, setFiltrosLoading] = useState(true);
  const [filtrosData, setFiltrosData] = useState<any>(null);

  const [filtroDestino, setFiltroDestino] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string | null>(params.tipo || null);
  const [filtroEtiqueta, setFiltroEtiqueta] = useState<string | null>(null);
  const [filtroCalificacionMin, setFiltroCalificacionMin] = useState<number | null>(null);
  const [filtroHoraInicio, setFiltroHoraInicio] = useState<string | null>(null);
  const [filtroIdioma, setFiltroIdioma] = useState<string | null>(null);
  const [filtroSoloDisponibles, setFiltroSoloDisponibles] = useState(false);

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadFiltros();
  }, [selectedProvider]);

  useEffect(() => {
    loadAttractions();
  }, [params.ciudad, params.fecha, params.tipo, selectedProvider, sortOption, filtroDestino, filtroTipo, filtroEtiqueta, filtroCalificacionMin, filtroHoraInicio, filtroIdioma, filtroSoloDisponibles]);

  const loadFiltros = async () => {
    setFiltrosLoading(true);
    try {
      const resp = await AtraccionesService.getFiltros(selectedProvider);
      if (resp.status === 200) {
        setFiltrosData(resp.data);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setFiltrosLoading(false);
    }
  };

  const loadAttractions = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams: any = {
        ordenar_por: sortOption,
      };

      if (params.ciudad) queryParams.ciudad = params.ciudad;
      if (params.fecha) queryParams.fecha = params.fecha;
      if (filtroDestino) queryParams.ciudad = filtroDestino;
      if (filtroTipo) queryParams.tipo = filtroTipo;
      if (filtroEtiqueta) queryParams.etiqueta = filtroEtiqueta;
      if (filtroCalificacionMin) queryParams.calificacion_min = filtroCalificacionMin;
      if (filtroHoraInicio) queryParams.hora_inicio = filtroHoraInicio;
      if (filtroIdioma) queryParams.idioma = filtroIdioma;
      if (filtroSoloDisponibles) queryParams.disponible = true;

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
    if (busqueda.tipo) routeParams.tipo = busqueda.tipo;
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

  const limpiarFiltros = () => {
    setFiltroDestino(null);
    setFiltroTipo(null);
    setFiltroEtiqueta(null);
    setFiltroCalificacionMin(null);
    setFiltroHoraInicio(null);
    setFiltroIdioma(null);
    setFiltroSoloDisponibles(false);
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(atracciones.length / ITEMS_PER_PAGE));
  const paged = atracciones.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const formatDuration = (minutos: number) => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    if (h === 0) return `${m} min`;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const renderFiltersContent = () => {
    if (filtrosLoading) {
      return <ActivityIndicator size="small" color={Colors.titulo} style={{ padding: 20 }} />;
    }
    
    return (
      <View style={{ gap: Spacing.md }}>
        <View style={[sb.section, { zIndex: 100 }]}>
          <Text style={sb.title}><Ionicons name="cloud" size={14} /> Proveedor</Text>
          <View style={s.dropdownContainer}>
            <TouchableOpacity 
              style={s.pickerWrap}
              onPress={() => setShowProviderDropdown(!showProviderDropdown)}
              activeOpacity={0.8}
            >
              <Text style={s.pickerText} numberOfLines={1}>
                {selectedProvider === 'todos' ? 'Todos los proveedores' : (ATTRACTION_PROVIDER_LABELS as any)[selectedProvider]}
              </Text>
              <Ionicons name={showProviderDropdown ? "chevron-up" : "chevron-down"} size={16} color={Colors.extra1} />
            </TouchableOpacity>
            
            {showProviderDropdown && (
              <ScrollView style={s.dropdownScroll} nestedScrollEnabled>
                <TouchableOpacity 
                  style={s.dropdownItem} 
                  onPress={() => { setSelectedProvider('todos'); setShowProviderDropdown(false); setCurrentPage(1); }}
                >
                  <Text style={s.dropdownText}>Todos los proveedores</Text>
                </TouchableOpacity>
                {ALL_ATTRACTION_PROVIDERS.map(p => (
                  <TouchableOpacity 
                    key={p} 
                    style={s.dropdownItem} 
                    onPress={() => { setSelectedProvider(p); setShowProviderDropdown(false); setCurrentPage(1); }}
                  >
                    <Text style={s.dropdownText}>{ATTRACTION_PROVIDER_LABELS[p]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {filtrosData?.destinationFilters?.length > 0 && (
          <View style={sb.section}>
            <Text style={sb.title}><Ionicons name="location" size={14} /> Destino</Text>
            {filtrosData.destinationFilters.map((opt: any) => (
              <TouchableOpacity key={opt.name} style={sb.check} onPress={() => setFiltroDestino(filtroDestino === opt.name ? null : opt.name)}>
                <Ionicons name={filtroDestino === opt.name ? "checkbox" : "square-outline"} size={16} color={Colors.titulo} />
                <Text style={sb.checkLabel}>{opt.name} ({opt.productCount})</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {filtrosData?.typeFilters?.length > 0 && (
          <View style={sb.section}>
            <Text style={sb.title}><Ionicons name="flag" size={14} /> Tipo de atracción</Text>
            {filtrosData.typeFilters.map((opt: any) => (
              <TouchableOpacity key={opt.tagname} style={sb.check} onPress={() => setFiltroTipo(filtroTipo === opt.tagname ? null : opt.tagname)}>
                <Ionicons name={filtroTipo === opt.tagname ? "checkbox" : "square-outline"} size={16} color={Colors.titulo} />
                <Text style={sb.checkLabel}>{opt.name} ({opt.productCount})</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {filtrosData?.labelFilters?.length > 0 && (
          <View style={sb.section}>
            <Text style={sb.title}><Ionicons name="pricetag" size={14} /> Etiquetas</Text>
            {filtrosData.labelFilters.map((opt: any) => (
              <TouchableOpacity key={opt.tagname} style={sb.check} onPress={() => setFiltroEtiqueta(filtroEtiqueta === opt.tagname ? null : opt.tagname)}>
                <Ionicons name={filtroEtiqueta === opt.tagname ? "checkbox" : "square-outline"} size={16} color={Colors.titulo} />
                <Text style={sb.checkLabel}>{opt.name} ({opt.productCount})</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {filtrosData?.minRatingFilter?.length > 0 && (
          <View style={sb.section}>
            <Text style={sb.title}><Ionicons name="star" size={14} /> Calificación mínima</Text>
            {filtrosData.minRatingFilter.map((opt: any) => (
              <TouchableOpacity key={opt.tagname} style={sb.check} onPress={() => setFiltroCalificacionMin(filtroCalificacionMin === +opt.tagname ? null : +opt.tagname)}>
                <Ionicons name={filtroCalificacionMin === +opt.tagname ? "checkbox" : "square-outline"} size={16} color={Colors.titulo} />
                <Text style={sb.checkLabel}>{opt.name} ({opt.productCount})</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {filtrosData?.timeOfDayFilters?.length > 0 && (
          <View style={sb.section}>
            <Text style={sb.title}><Ionicons name="time" size={14} /> Horario del día</Text>
            {filtrosData.timeOfDayFilters.map((opt: any) => (
              <TouchableOpacity key={opt.tagname} style={sb.check} onPress={() => setFiltroHoraInicio(filtroHoraInicio === opt.tagname ? null : opt.tagname)}>
                <Ionicons name={filtroHoraInicio === opt.tagname ? "checkbox" : "square-outline"} size={16} color={Colors.titulo} />
                <Text style={sb.checkLabel}>{opt.name} ({opt.productCount})</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={sb.section}>
          <Text style={sb.title}><Ionicons name="calendar" size={14} /> Disponibilidad</Text>
          <TouchableOpacity style={sb.check} onPress={() => setFiltroSoloDisponibles(!filtroSoloDisponibles)}>
            <Ionicons name={filtroSoloDisponibles ? "checkbox" : "square-outline"} size={16} color={Colors.titulo} />
            <Text style={sb.checkLabel}>Solo disponibles</Text>
          </TouchableOpacity>
        </View>

        {(filtroDestino || filtroTipo || filtroEtiqueta || filtroCalificacionMin || filtroHoraInicio || filtroIdioma || filtroSoloDisponibles) && (
          <TouchableOpacity style={s.btnClear} onPress={limpiarFiltros}>
            <Text style={s.btnClearText}>Limpiar filtros</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={s.root}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Search Hero with requested background image */}
        <View
          style={[
            s.heroBanner,
            Platform.OS === 'web' && {
              backgroundImage: `linear-gradient(rgba(55, 34, 31, 0.72), rgba(55, 34, 31, 0.72)), url('/images/search_resultado_fondo_atrac.jpg')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            } as any,
          ]}
        >
          {Platform.OS !== 'web' && (
            <>
              <Image source={BG_NATIVE} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} resizeMode="cover" />
              <View style={s.heroOverlay} />
            </>
          )}
          <View style={s.heroContainer}>
            <View style={s.eyebrow}>
              <Ionicons name="compass-outline" size={14} color={Colors.accent} />
              <Text style={s.eyebrowText}>EXPERIENCIAS POOKING</Text>
            </View>
            <Text style={s.heroTitle}>Explora experiencias inolvidables</Text>
            <Text style={s.heroSub}>Tours, museos y aventuras para tu próximo viaje.</Text>

            {/* Interactive Search Panel */}
            <View style={s.searchPanel}>
              <View style={[s.spRow, isWide && s.spRowWide]}>
                
                <View style={[s.spField, isWide ? { flex: 1 } : s.spFieldMobile]}>
                  <Text style={s.spLabel}>Destino o ciudad</Text>
                  <View style={s.spInputWrap}>
                    <Ionicons name="location" size={16} color="#C6B17D" style={s.spIcon} />
                    <TextInput
                      style={s.spInput}
                      value={busqueda.ciudad}
                      onChangeText={v => setBusqueda({ ...busqueda, ciudad: v })}
                      placeholder="¿Dónde quieres explorar?"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                    />
                  </View>
                </View>

                <View style={[s.spField, isWide ? { flex: 1 } : s.spFieldMobile]}>
                  <Text style={s.spLabel}>Fecha</Text>
                  <TouchableOpacity
                    style={s.spInputWrap}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar" size={16} color="#C6B17D" style={s.spIcon} />
                    <Text
                      style={[
                        s.spInput,
                        {
                          color: busqueda.fecha ? '#fff' : 'rgba(255,255,255,0.4)',
                          textAlignVertical: 'center',
                          paddingLeft: 4,
                          lineHeight: Platform.OS === 'web' ? 38 : undefined,
                        },
                      ]}
                    >
                      {busqueda.fecha || 'YYYY-MM-DD'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={[s.spField, isWide ? { flex: 1 } : s.spFieldMobile]}>
                  <Text style={s.spLabel}>Tipo de atracción</Text>
                  <View style={s.spInputWrap}>
                    <Ionicons name="flag" size={16} color="#C6B17D" style={s.spIcon} />
                    <TextInput
                      style={s.spInput}
                      value={busqueda.tipo}
                      onChangeText={v => setBusqueda({ ...busqueda, tipo: v })}
                      placeholder="Todas las experiencias"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                    />
                  </View>
                </View>

                <TouchableOpacity style={[s.spBtn, !isWide && s.spBtnMobile]} onPress={handleBuscar} activeOpacity={0.85}>
                  <Ionicons name="search" size={16} color="#fff" />
                  <Text style={s.spBtnText}>Buscar</Text>
                </TouchableOpacity>

              </View>
            </View>
          </View>
        </View>

        {/* Results stats */}
        <View style={s.resultsBar}>
          <View style={{ flex: 1 }}>
            <Text style={s.resultsCount}>
              <Text style={{ fontWeight: '700' }}>{atracciones.length} experienci{atracciones.length === 1 ? 'a' : 'as'}</Text>
              {' '}disponible{atracciones.length === 1 ? '' : 's'}
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

          {!isWide && (
            <TouchableOpacity style={s.mobileFilterBtn} onPress={() => setShowMobileFilters(true)}>
              <Ionicons name="options-outline" size={16} color="#fff" />
              <Text style={s.mobileFilterBtnText}>Filtros</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Main layout */}
        <View 
          style={[s.bodyLayout, { flexDirection: isWide ? 'row' : 'column' }]}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          {/* Web sidebar */}
          {isWide && (
            <View style={s.sidebar}>
              {renderFiltersContent()}
            </View>
          )}

          {/* List Area */}
          <View style={s.mainArea}>
            {selectedProvider === 'todos' && failedProviders.length > 0 && (
              <View style={s.warningBanner}>
                <Ionicons name="cloud-offline-outline" size={16} color={Colors.titulo} />
                <Text style={s.warningText}>
                  Algunos proveedores no respondieron: ({(failedProviders as any).map((p: any) => (ATTRACTION_PROVIDER_LABELS as any)[p] || p).join(', ')}).
                  Mostrando los resultados disponibles.
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
            ) : atracciones.length === 0 ? (
              <View style={s.emptyBox}>
                <View style={s.customCompass}>
                  <View style={s.compassNeedle} />
                  <View style={s.compassPivot} />
                </View>
                <Text style={s.emptyTitle}>No encontramos experiencias</Text>
                <Text style={s.emptyDesc}>Ninguna atracción coincide con tus criterios de búsqueda. Prueba ampliando la categoría, el horario o el destino.</Text>
                <TouchableOpacity style={s.btnClear} onPress={limpiarFiltros}>
                  <Text style={s.btnClearText}>Limpiar filtros</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.list}>
                {paged.map(atr => (
                  <View key={`${atr.provider}-${atr.id}`} style={[s.card, { flexDirection: isWide ? 'row' : 'column' }]}>
                    <View style={[s.cardImageWrap, { width: isWide ? 260 : '100%', height: isWide ? 'auto' : 200 }]}>
                      <Image
                        source={{ uri: atr.imagen_principal || 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&q=80' }}
                        style={[s.cardImage, { height: isWide ? 240 : 200 }]}
                        resizeMode="cover"
                      />
                      <View style={s.cardBadge}>
                        <Text style={s.cardBadgeText}><Ionicons name="pricetag" size={10} /> {atr.tipo_nombre}</Text>
                      </View>
                    </View>

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

                      <View style={s.cardMeta}>
                        <View style={s.metaItem}>
                          <Ionicons name="time-outline" size={13} color={Colors.subtitulo} />
                          <Text style={s.metaText}>{formatDuration(atr.duracion_minutos)}</Text>
                        </View>
                        <View style={s.metaItem}>
                          <Ionicons name="star" size={13} color={Colors.star} />
                          <Text style={s.metaText}><strong>{atr.calificacion.toFixed(1)}</strong> ({atr.total_resenas} reseñas)</Text>
                        </View>
                        <View style={s.metaItem}>
                          <Ionicons name="language" size={13} color={Colors.subtitulo} />
                          <Text style={s.metaText}>{atr.idiomas_disponibles?.length || 0} idioma(s)</Text>
                        </View>
                      </View>

                      <View style={s.acDispInfo}>
                        {atr.disponibilidad?.disponible_hoy ? (
                          <Text style={{ color: Colors.success, fontSize: 12 }}><Ionicons name="calendar" size={12} /> Disponible hoy {atr.disponibilidad.cupos_disponibles != null && `· ${atr.disponibilidad.cupos_disponibles} cupos restantes`}</Text>
                        ) : atr.disponibilidad?.disponible && atr.disponibilidad?.proxima_fecha_disponible ? (
                          <Text style={{ color: Colors.titulo, fontSize: 12 }}><Ionicons name="calendar-outline" size={12} /> Próxima fecha disponible: {atr.disponibilidad.proxima_fecha_disponible}</Text>
                        ) : (
                          <Text style={{ color: Colors.error, fontSize: 12 }}><Ionicons name="close-circle-outline" size={12} /> Sin disponibilidad por el momento</Text>
                        )}
                      </View>

                      <View style={s.cardFooter}>
                        <View style={s.priceBlock}>
                          <Text style={s.priceLabel}>desde</Text>
                          <Text style={s.priceValue}>${atr.precio_desde.toFixed(2)} <Text style={s.currency}>{atr.moneda}</Text></Text>
                          <Text style={s.pricePer}>por persona</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity style={s.btnVer} onPress={() => verDetalle(atr)} activeOpacity={0.85}>
                            <Text style={s.btnVerText}>Ver atracción</Text>
                            <Ionicons name="arrow-forward" size={14} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}

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

      <Modal visible={showMobileFilters} animationType="slide" transparent={false} onRequestClose={() => setShowMobileFilters(false)}>
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Filtros</Text>
            <TouchableOpacity onPress={() => setShowMobileFilters(false)} style={s.modalCloseBtn}>
              <Ionicons name="close" size={24} color={Colors.extra1} />
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalScroll} contentContainerStyle={s.modalScrollContent}>
            {renderFiltersContent()}
          </ScrollView>
          <View style={s.modalFooter}>
            <TouchableOpacity style={s.modalClearBtn} onPress={() => { limpiarFiltros(); setShowMobileFilters(false); }}>
              <Text style={s.modalClearBtnText}>Restablecer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalApplyBtn} onPress={() => setShowMobileFilters(false)}>
              <Text style={s.modalApplyBtnText}>Ver {atracciones.length} resultados</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CalendarModal
        visible={showDatePicker}
        value={busqueda.fecha}
        onSelect={val => setBusqueda({ ...busqueda, fecha: val })}
        onClose={() => setShowDatePicker(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1 },

  heroBanner: {
    paddingTop: Spacing.xl + 28,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
    position: 'relative',
    minHeight: 250,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  heroOverlay: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(55, 34, 31, 0.72)', // Match the requested styling from other pages
  },
  heroContainer: {
    zIndex: 2,
    alignItems: 'center',
    padding: Spacing.md,
    width: '100%',
    maxWidth: 960,
  },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.xs },
  eyebrowText: { color: Colors.accent, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  heroTitle: { fontSize: 26, fontWeight: '700', color: '#fff', textAlign: 'center', fontFamily: 'PlayfairDisplay-Bold', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: Spacing.md },
  
  searchPanel: {
    backgroundColor: 'rgba(70, 60, 56, 0.78)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    width: '100%',
    gap: 12,
    marginTop: 8,
    ...Shadow.md,
    ...Platform.select({ web: { backdropFilter: 'blur(10px)' } as any }),
  },
  spRow: { gap: 10, width: '100%' },
  spRowWide: { flexDirection: 'row', alignItems: 'flex-end' },
  spField: { minWidth: 130 },
  spFieldMobile: { width: '100%' },
  spLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8, marginBottom: 5, paddingLeft: 2 },
  spInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8, paddingHorizontal: 10,
    height: 40,
  },
  spIcon: { marginRight: 6 },
  spInput: { flex: 1, color: '#fff', fontSize: 13, paddingVertical: 0, height: '100%' },
  spBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#8E5A54', borderRadius: 8,
    height: 40, paddingHorizontal: Spacing.xl,
  },
  spBtnMobile: {
    width: '100%',
    marginTop: 4,
  },
  spBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  resultsBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, flexWrap: 'wrap', gap: Spacing.md },
  resultsCount: { fontSize: 14, color: Colors.extra1 },
  sortChip: { paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg, marginLeft: 6 },
  sortChipOn: { borderColor: Colors.titulo, backgroundColor: Colors.primaryLight },
  sortChipText: { fontSize: 12, color: Colors.subtitulo },
  mobileFilterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.titulo, borderRadius: BorderRadius.md, paddingVertical: 8, paddingHorizontal: 16, marginTop: 8, alignSelf: 'stretch', justifyContent: 'center', ...Shadow.sm },
  mobileFilterBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  bodyLayout: { width: '100%', alignSelf: 'center', backgroundColor: Colors.bg, alignItems: 'flex-start' },
  
  sidebar: { width: 260, padding: Spacing.lg, borderRightWidth: 1, borderRightColor: Colors.border },
  pickerWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingHorizontal: 8, height: 38, backgroundColor: Colors.surface },
  textInp: { flex: 1, fontSize: 12, color: Colors.extra1, paddingLeft: Spacing.xs },
  pickerText: { flex: 1, fontSize: 12, color: Colors.extra1, paddingLeft: Spacing.xs },
  dropdownContainer: { position: 'relative', width: '100%', zIndex: 100 },
  dropdownScroll: { position: 'absolute', top: 42, left: 0, right: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border, maxHeight: 180, borderRadius: BorderRadius.sm, zIndex: 1000, ...Shadow.md },
  dropdownItem: { paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownText: { fontSize: 12, color: Colors.extra1 },
  btnClear: { borderWidth: 1, borderColor: Colors.titulo, borderRadius: BorderRadius.md, paddingVertical: 8, paddingHorizontal: Spacing.xl, alignItems: 'center', marginTop: Spacing.md },
  btnClearText: { color: Colors.titulo, fontWeight: '700', fontSize: 12 },

  mainArea: { flex: 1, padding: Spacing.lg, gap: Spacing.md, width: '100%' },
  warningBanner: { flexDirection: 'row', gap: 8, backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: 'rgba(142, 90, 84, 0.15)', borderRadius: BorderRadius.sm, padding: Spacing.sm, marginBottom: Spacing.md },
  warningText: { flex: 1, fontSize: 12, color: Colors.titulo, lineHeight: 18 },
  loadingBox: { padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  loadingText: { color: Colors.subtitulo, fontSize: 14 },
  errorBox: { padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  errorText: { color: Colors.error, fontSize: 14, textAlign: 'center' },
  emptyBox: { padding: Spacing.xxl, alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, gap: Spacing.md, ...Shadow.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.titulo, textAlign: 'center', alignSelf: 'stretch' },
  emptyDesc: { fontSize: 14, color: Colors.subtitulo, textAlign: 'center', alignSelf: 'stretch' },

  // Centered custom compass icon
  customCompass: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2.5,
    borderColor: Colors.extra2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  compassNeedle: {
    width: 10,
    height: 10,
    backgroundColor: Colors.extra2,
    transform: [{ rotate: '45deg' }, { scaleX: 0.5 }, { scaleY: 2.2 }],
  },
  compassPivot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.surface,
  },

  list: { gap: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadow.sm },
  cardImageWrap: { position: 'relative' },
  cardImage: { width: '100%', minHeight: 200 },
  cardBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: Colors.titulo, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  cardBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },


  cardInfo: { flex: 1, padding: Spacing.md, gap: Spacing.sm },
  cardTop: { gap: 2 },
  cardName: { fontSize: 17, fontWeight: '700', color: Colors.titulo, lineHeight: 22 },
  cardSubtype: { fontSize: 12, color: Colors.extra2, fontWeight: '500' },
  cardLoc: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardLocText: { fontSize: 12, color: Colors.subtitulo, flex: 1 },
  cardDesc: { fontSize: 13, color: Colors.subtitulo, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: Colors.subtitulo },

  acDispInfo: { marginTop: 4 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: Spacing.xs, flexWrap: 'wrap', gap: Spacing.sm },
  priceBlock: { alignItems: 'flex-end', gap: 1, minWidth: 100 },
  priceLabel: { fontSize: 11, color: Colors.textMuted },
  priceValue: { fontSize: 22, fontWeight: '800', color: Colors.titulo },
  currency: { fontSize: 14, fontWeight: '400', color: Colors.subtitulo },
  pricePer: { fontSize: 11, color: Colors.textMuted },
  btnVer: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.titulo, borderRadius: BorderRadius.md, paddingVertical: 10, paddingHorizontal: 16 },
  btnVerText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xl, width: '100%' },
  pagBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  pagBtnActive: { borderColor: Colors.titulo, backgroundColor: Colors.primaryLight },
  pagBtnText: { fontSize: 13, color: Colors.subtitulo },

  modalContainer: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.titulo, fontFamily: 'PlayfairDisplay-Bold' },
  modalCloseBtn: { padding: 4 },
  modalScroll: { flex: 1 },
  modalScrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  modalFooter: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  modalClearBtn: { flex: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, borderWidth: 1.5, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  modalClearBtnText: { color: Colors.subtitulo, fontWeight: '700', fontSize: 14 },
  modalApplyBtn: { flex: 2, backgroundColor: Colors.titulo, borderRadius: BorderRadius.md, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  modalApplyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

const sb = StyleSheet.create({
  section: { paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
  title: { fontSize: 13, fontWeight: '700', color: Colors.titulo, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  check: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 3 },
  checkLabel: { fontSize: 13, color: Colors.extra1 },
});
