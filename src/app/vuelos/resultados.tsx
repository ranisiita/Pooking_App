import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform, Dimensions, Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { FlightService } from '../../services/flights.service';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { getStorageItem, setStorageItem } from '../../services/storage';

const ITEMS_PER_PAGE = 10;
const { width } = Dimensions.get('window');

interface FlightItem {
  guidServicio: string;
  nombreComercial: string;
  tipoServicioNombre: string;
  salida: string;
  llegada: string;
  duracion: string;
  escalas: number;
  precioBase: number;
  origen: string;
  destino: string;
  fecha: string;
  proveedor: string;
  idVuelo: number;
  nombreOrigen: string;
  nombreDestino: string;
  estadoVuelo?: string;
  asientosDisponibles?: number;
  capacidadTotal?: number;
  fechaHoraSalida?: string;
  fechaHoraLlegada?: string;
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.sbSection}>
      <Text style={s.sbSectionTitle}>{title}</Text>
      <View style={s.sbSectionContent}>{children}</View>
    </View>
  );
}

function FilterCheck({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity style={s.filterCheck} onPress={onToggle} activeOpacity={0.7}>
      <View style={[s.checkbox, checked && s.checkboxOn]}>
        {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>
      <Text style={s.filterCheckText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function FlightResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    origen?: string;
    destino?: string;
    fecha?: string;
    fechaRegreso?: string;
    tipoViaje?: string;
  }>();

  const [vuelos, setVuelos] = useState<FlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState('recomendados');
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [precioMin, setPrecioMin] = useState(0);
  const [precioMax, setPrecioMax] = useState(1000);
  const [filtroEscalas, setFiltroEscalas] = useState<Record<string, boolean>>({
    directo: false,
    escala1: false,
    escalas2: false,
  });
  const [filtroAerolineas, setFiltroAerolineas] = useState<Record<string, boolean>>({
    Nacho: false,
    Mary: false,
    Marcillo: false,
  });

  // UI state
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [vueloParaConfirmar, setVueloParaConfirmar] = useState<FlightItem | null>(null);
  const [reservandoId, setReservandoId] = useState<string | null>(null);

  // Resolved airports names
  const [oriName, setOriName] = useState(params.origen || '');
  const [destName, setDestName] = useState(params.destino || '');

  useEffect(() => {
    async function loadFlights() {
      setLoading(true);
      setError(null);
      try {
        let oriIata = params.origen || '';
        let destIata = params.destino || '';

        // Try to match search terms with IATA codes
        const airList = await FlightService.cargarTodosAeropuertos();
        
        if (oriIata.length !== 3 || oriIata !== oriIata.toUpperCase()) {
          const match = airList.find(a => 
            a.nombre.toLowerCase().includes(oriIata.toLowerCase()) ||
            a.codigoIata.toLowerCase() === oriIata.toLowerCase()
          );
          if (match) {
            oriIata = match.codigoIata;
            setOriName(`${match.nombre} (${match.codigoIata})`);
          }
        } else {
          const match = airList.find(a => a.codigoIata === oriIata);
          if (match) setOriName(`${match.nombre} (${match.codigoIata})`);
        }

        if (destIata.length !== 3 || destIata !== destIata.toUpperCase()) {
          const match = airList.find(a => 
            a.nombre.toLowerCase().includes(destIata.toLowerCase()) ||
            a.codigoIata.toLowerCase() === destIata.toLowerCase()
          );
          if (match) {
            destIata = match.codigoIata;
            setDestName(`${match.nombre} (${match.codigoIata})`);
          }
        } else {
          const match = airList.find(a => a.codigoIata === destIata);
          if (match) setDestName(`${match.nombre} (${match.codigoIata})`);
        }

        const data = await FlightService.buscarVuelos({
          origen: oriIata,
          destino: destIata,
          fechaSalida: params.fecha,
        });

        setVuelos(data);
        await setStorageItem('flight-results', JSON.stringify(data));
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar los vuelos. Intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    }
    loadFlights();
  }, [params.origen, params.destino, params.fecha]);

  const toggleDetalle = (guid: string) => {
    const next = new Set(expandidos);
    if (next.has(guid)) next.delete(guid);
    else next.add(guid);
    setExpandidos(next);
  };

  const filtered = useMemo(() => {
    let r = vuelos.filter(v => {
      // Precio
      if (v.precioBase < precioMin) return false;
      if (precioMax < 1000 && v.precioBase > precioMax) return false;
      
      // Escalas
      const escFilterActive = Object.values(filtroEscalas).some(Boolean);
      if (escFilterActive) {
        if (v.escalas === 0 && !filtroEscalas.directo) return false;
        if (v.escalas === 1 && !filtroEscalas.escala1) return false;
        if (v.escalas > 1 && !filtroEscalas.escalas2) return false;
      }

      // Aerolínea
      const aeroFilterActive = Object.values(filtroAerolineas).some(Boolean);
      if (aeroFilterActive && !filtroAerolineas[v.proveedor]) return false;

      return true;
    });

    // Sort options
    if (sortOption === 'precio_asc') r.sort((a, b) => a.precioBase - b.precioBase);
    else if (sortOption === 'precio_desc') r.sort((a, b) => b.precioBase - a.precioBase);
    else if (sortOption === 'duracion') {
      const getMin = (d: string) => {
        const parts = d.match(/(\d+)h\s*(\d*)m?/);
        if (!parts) return 0;
        const h = parseInt(parts[1]) || 0;
        const m = parseInt(parts[2]) || 0;
        return h * 60 + m;
      };
      r.sort((a, b) => getMin(a.duracion) - getMin(b.duracion));
    }
    
    return r;
  }, [vuelos, precioMin, precioMax, filtroEscalas, filtroAerolineas, sortOption]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const cleanFilters = () => {
    setPrecioMin(0);
    setPrecioMax(1000);
    setFiltroEscalas({ directo: false, escala1: false, escalas2: false });
    setFiltroAerolineas({ Nacho: false, Mary: false, Marcillo: false });
    setCurrentPage(1);
  };

  const handleReservar = async (vuelo: FlightItem) => {
    setReservandoId(vuelo.guidServicio);
    try {
      const token = await getStorageItem('token');
      if (!token) {
        alert('Debes iniciar sesión para realizar una reserva.');
        router.push('/login');
        return;
      }

      // Return URL for the redirect
      const urlRetorno = Platform.OS === 'web' 
        ? window.location.origin + '/vuelos/resultados'
        : 'pookingapp://vuelos/resultados';

      const res = await FlightService.iniciarReservaVuelo(vuelo.proveedor, vuelo.idVuelo, urlRetorno, token);
      const redirectUrl = res?.data?.urlRedirect || res?.urlRedirect;

      setVueloParaConfirmar(null);

      if (redirectUrl && typeof redirectUrl === 'string' && redirectUrl.startsWith('http')) {
        if (Platform.OS === 'web') {
          window.location.href = redirectUrl;
        } else {
          // Open in System Browser
          await Linking.openURL(redirectUrl);
        }
      } else {
        alert('Reserva iniciada. Procesando tu pago...');
        // Fallback to standalone checkout
        router.push({
          pathname: '/checkout/[guid]',
          params: { guid: vuelo.guidServicio }
        });
      }
    } catch (err: any) {
      console.error(err);
      if (err.status === 401) {
        alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
        router.push('/login');
      } else {
        alert('No se pudo iniciar la reserva. Redirigiendo a pasarela interna...');
        // Standalone checkout as fallback
        router.push({
          pathname: '/checkout/[guid]',
          params: { guid: vuelo.guidServicio }
        });
      }
    } finally {
      setReservandoId(null);
    }
  };

  const formatPrice = (val: number) => {
    return val.toFixed(2);
  };

  return (
    <View style={s.root}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero Banner */}
        <View style={s.heroBanner}>
          <View style={s.heroOverlay} />
          <View style={s.heroContainer}>
            <Text style={s.heroTitle}>Busca tu vuelo</Text>
            <View style={s.searchBarCompact}>
              <View style={s.sbField}>
                <Text style={s.sbLabel}>Origen</Text>
                <Text style={s.sbValue} numberOfLines={1}>{oriName || params.origen || '—'}</Text>
              </View>
              <View style={s.sbSep} />
              <View style={s.sbField}>
                <Text style={s.sbLabel}>Destino</Text>
                <Text style={s.sbValue} numberOfLines={1}>{destName || params.destino || '—'}</Text>
              </View>
              <View style={s.sbSep} />
              <View style={s.sbField}>
                <Text style={s.sbLabel}>Fecha de salida</Text>
                <Text style={s.sbValue}>{params.fecha || '—'}</Text>
              </View>
              <TouchableOpacity style={s.sbBtn} onPress={() => router.back()} activeOpacity={0.85}>
                <Ionicons name="search" size={15} color="#fff" />
                <Text style={s.sbBtnText}>Modificar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Results Info Bar */}
        <View style={s.resultsBar}>
          <View style={{ flex: 1 }}>
            <Text style={s.resultsCount}>
              <Text style={{ fontWeight: '700' }}>{filtered.length} vuelo{filtered.length !== 1 ? 's' : ''}</Text>
              {' '}encontrado{filtered.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[{ v: 'recomendados', l: 'Recomendados' }, { v: 'precio_asc', l: 'Menor precio' }, { v: 'precio_desc', l: 'Mayor precio' }, { v: 'duracion', l: 'Menor duración' }].map(opt => (
              <TouchableOpacity key={opt.v} style={[s.sortChip, sortOption === opt.v && s.sortChipOn]} onPress={() => { setSortOption(opt.v); setCurrentPage(1); }}>
                <Text style={[s.sortChipText, sortOption === opt.v && { color: Colors.titulo, fontWeight: '600' }]}>{opt.l}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Page Content Layout */}
        <View style={s.pageBody}>
          {/* Filters Sidebar (Web only) */}
          {Platform.OS === 'web' && (
            <View style={s.sidebar}>
              <SidebarSection title="Precio por persona">
                <View style={s.priceInputRow}>
                  <View style={s.priceInputWrap}>
                    <Text style={s.currencyPrefix}>$</Text>
                    <TextInput style={s.priceInp} value={String(precioMin)} onChangeText={v => { setPrecioMin(+v || 0); setCurrentPage(1); }} keyboardType="numeric" />
                  </View>
                  <View style={s.priceInputWrap}>
                    <Text style={s.currencyPrefix}>$</Text>
                    <TextInput style={s.priceInp} value={String(precioMax)} onChangeText={v => { setPrecioMax(+v || 1000); setCurrentPage(1); }} keyboardType="numeric" />
                  </View>
                </View>
                <Text style={s.priceHint}>$0 USD — $1000+ USD</Text>
              </SidebarSection>

              <SidebarSection title="Escalas">
                <FilterCheck label="Vuelos Directos" checked={filtroEscalas.directo} onToggle={() => { setFiltroEscalas({ ...filtroEscalas, directo: !filtroEscalas.directo }); setCurrentPage(1); }} />
                <FilterCheck label="1 Escala" checked={filtroEscalas.escala1} onToggle={() => { setFiltroEscalas({ ...filtroEscalas, escala1: !filtroEscalas.escala1 }); setCurrentPage(1); }} />
                <FilterCheck label="2+ Escalas" checked={filtroEscalas.escalas2} onToggle={() => { setFiltroEscalas({ ...filtroEscalas, escalas2: !filtroEscalas.escalas2 }); setCurrentPage(1); }} />
              </SidebarSection>

              <SidebarSection title="Aerolínea">
                {(['Nacho', 'Mary', 'Marcillo'] as const).map(aero => (
                  <FilterCheck key={aero} label={aero} checked={filtroAerolineas[aero]} onToggle={() => { setFiltroAerolineas({ ...filtroAerolineas, [aero]: !filtroAerolineas[aero] }); setCurrentPage(1); }} />
                ))}
              </SidebarSection>

              <TouchableOpacity style={s.btnClearFilters} onPress={cleanFilters}>
                <Ionicons name="trash-outline" size={14} color={Colors.titulo} />
                <Text style={s.btnClearFiltersText}>Limpiar filtros</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Flights list */}
          <View style={s.mainContent}>
            {loading ? (
              <View style={s.loadingBox}>
                <ActivityIndicator size="large" color={Colors.titulo} />
                <Text style={s.loadingText}>Buscando vuelos disponibles...</Text>
              </View>
            ) : error ? (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : filtered.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="airplane-outline" size={54} color={Colors.extra2} style={{ transform: [{ rotate: '45deg' }] }} />
                <Text style={s.emptyTitle}>Sin vuelos disponibles</Text>
                <Text style={s.emptyDesc}>No hemos encontrado vuelos que coincidan con tu búsqueda. Intenta modificar tus filtros o criterios de búsqueda.</Text>
                {Platform.OS === 'web' && (
                  <TouchableOpacity style={s.btnReset} onPress={cleanFilters}>
                    <Text style={s.btnResetText}>Restablecer filtros</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={s.list}>
                {paged.map(v => {
                  const isExp = expandidos.has(v.guidServicio);
                  return (
                    <View key={v.guidServicio} style={s.card}>
                      <TouchableOpacity style={s.cardInteractive} onPress={() => toggleDetalle(v.guidServicio)} activeOpacity={0.9}>
                        {/* Header: Aerolínea + Escalas */}
                        <View style={s.cardHeader}>
                          <View style={s.airlineInfo}>
                            <View style={s.airlineIcon}>
                              <Ionicons name="airplane" size={16} color={Colors.titulo} />
                            </View>
                            <View>
                              <Text style={s.airlineName}>{v.proveedor}</Text>
                              <Text style={s.flightCode}>Vuelo {v.nombreComercial}</Text>
                            </View>
                          </View>
                          <View style={[s.scalesBadge, v.escalas === 0 ? s.scalesDirect : s.scalesStop]}>
                            <Text style={[s.scalesBadgeText, v.escalas === 0 ? { color: Colors.success } : { color: '#f59e0b' }]}>
                              {v.escalas === 0 ? 'DIRECTO' : `${v.escalas} ESCALA${v.escalas > 1 ? 'S' : ''}`}
                            </Text>
                          </View>
                        </View>

                        {/* Route: Horarios, Duración, Paths */}
                        <View style={s.cardRoute}>
                          <View style={s.routeNode}>
                            <Text style={s.routeTime}>{v.salida}</Text>
                            <Text style={s.routeIata}>{v.origen}</Text>
                            <Text style={s.routeAirport} numberOfLines={1}>Aeropuerto</Text>
                          </View>

                          <View style={s.routeJourney}>
                            <Text style={s.journeyDuration}>{v.duracion}</Text>
                            <View style={s.journeyPathLine}>
                              <View style={s.pathLine} />
                              <Ionicons name="airplane" size={14} color={Colors.titulo} style={s.pathPlane} />
                            </View>
                            <Text style={[s.journeyStops, { color: v.escalas === 0 ? Colors.success : '#f59e0b' }]}>
                              {v.escalas === 0 ? 'Directo' : `${v.escalas} escala${v.escalas > 1 ? 's' : ''}`}
                            </Text>
                          </View>

                          <View style={[s.routeNode, { alignItems: 'flex-end' }]}>
                            <Text style={s.routeTime}>{v.llegada}</Text>
                            <Text style={s.routeIata}>{v.destino}</Text>
                            <Text style={s.routeAirport} numberOfLines={1}>Aeropuerto</Text>
                          </View>
                        </View>

                        {/* Footer: Precio + Acciones */}
                        <View style={s.cardFooter}>
                          <View style={s.priceSection}>
                            <Text style={s.priceLabel}>DESDE</Text>
                            <Text style={s.priceValue}>${formatPrice(v.precioBase)}</Text>
                            <Text style={s.priceSub}>por persona</Text>
                          </View>
                          <View style={s.actions}>
                            <TouchableOpacity style={s.btnDetails} onPress={() => toggleDetalle(v.guidServicio)}>
                              <Ionicons name="information-circle-outline" size={16} color={Colors.titulo} />
                              <Text style={s.btnDetailsText}>Detalles</Text>
                              <Ionicons name={isExp ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.titulo} />
                            </TouchableOpacity>
                            <TouchableOpacity style={s.btnReserve} onPress={() => setVueloParaConfirmar(v)} activeOpacity={0.8}>
                              <Text style={s.btnReserveText}>Reservar</Text>
                              <Ionicons name="arrow-forward" size={14} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>

                      {/* Expandable Details */}
                      {isExp && (
                        <View style={s.detailsSection}>
                          <View style={s.detailsDivider} />
                          <View style={s.detailsGrid}>
                            <View style={s.detailsCol}>
                              <Text style={s.detailsTitle}>Información del vuelo</Text>
                              <View style={s.detailsList}>
                                <Text style={s.detailItem}><Text style={s.detailBold}>Número de vuelo:</Text> {v.nombreComercial}</Text>
                                <Text style={s.detailItem}><Text style={s.detailBold}>Origen:</Text> {v.nombreOrigen || v.origen}</Text>
                                <Text style={s.detailItem}><Text style={s.detailBold}>Destino:</Text> {v.nombreDestino || v.destino}</Text>
                                <Text style={s.detailItem}><Text style={s.detailBold}>Salida:</Text> {v.fechaHoraSalida ? new Date(v.fechaHoraSalida).toLocaleString('es-EC') : v.salida}</Text>
                                <Text style={s.detailItem}><Text style={s.detailBold}>Llegada:</Text> {v.fechaHoraLlegada ? new Date(v.fechaHoraLlegada).toLocaleString('es-EC') : v.llegada}</Text>
                                <Text style={s.detailItem}><Text style={s.detailBold}>Duración:</Text> {v.duracion}</Text>
                                <Text style={s.detailItem}><Text style={s.detailBold}>Asientos Libres:</Text> {v.asientosDisponibles ?? 'N/D'}</Text>
                              </View>
                            </View>
                            <View style={s.detailsCol}>
                              <Text style={s.detailsTitle}>Políticas y equipaje</Text>
                              <View style={s.detailsList}>
                                <Text style={s.detailItem}>• Presentarse 3 horas antes en el aeropuerto</Text>
                                <Text style={s.detailItem}>• Cambios sujetos a la tarifa seleccionada</Text>
                                <Text style={s.detailItem}>• Check-in online disponible 24 horas antes</Text>
                                <Text style={s.detailItem}>• Incluye bolso de mano cabina (8kg)</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <View style={s.pagination}>
                    <TouchableOpacity style={s.pagBtn} disabled={currentPage === 1} onPress={() => { setCurrentPage(currentPage - 1); }}>
                      <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? Colors.textMuted : Colors.titulo} />
                    </TouchableOpacity>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <TouchableOpacity key={p} style={[s.pagBtn, currentPage === p && s.pagBtnActive]} onPress={() => setCurrentPage(p)}>
                        <Text style={[s.pagBtnText, currentPage === p && { color: '#fff', fontWeight: '700' }]}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={s.pagBtn} disabled={currentPage === totalPages} onPress={() => { setCurrentPage(currentPage + 1); }}>
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

      {/* Confirmation Modal */}
      {vueloParaConfirmar && (
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Ionicons name="airplane-outline" size={24} color={Colors.titulo} style={{ transform: [{ rotate: '45deg' }] }} />
              <Text style={s.modalTitleText}>Confirmar reserva</Text>
              <TouchableOpacity style={s.modalClose} onPress={() => setVueloParaConfirmar(null)}>
                <Ionicons name="close" size={20} color={Colors.subtitulo} />
              </TouchableOpacity>
            </View>

            <View style={s.modalBody}>
              <Text style={s.modalFlightName}>{vueloParaConfirmar.proveedor} — Vuelo {vueloParaConfirmar.nombreComercial}</Text>
              
              <View style={s.modalRoute}>
                <Text style={s.modalIata}>{vueloParaConfirmar.origen}</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.titulo} />
                <Text style={s.modalIata}>{vueloParaConfirmar.destino}</Text>
              </View>

              <View style={s.modalInfoRow}>
                <Ionicons name="time-outline" size={16} color={Colors.subtitulo} />
                <Text style={s.modalInfoText}>{vueloParaConfirmar.salida} → {vueloParaConfirmar.llegada} ({vueloParaConfirmar.duracion})</Text>
              </View>

              <View style={s.modalInfoRow}>
                <Ionicons name="cash-outline" size={16} color={Colors.subtitulo} />
                <Text style={s.modalInfoText}>Desde ${formatPrice(vueloParaConfirmar.precioBase)} USD por persona</Text>
              </View>

              <View style={s.modalNotice}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.titulo} />
                <Text style={s.modalNoticeText}>Serás redirigido a la pasarela del proveedor para formalizar el pago de tu vuelo.</Text>
              </View>
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalBtnCancel} onPress={() => setVueloParaConfirmar(null)}>
                <Text style={s.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.modalBtnConfirm, reservandoId !== null && { opacity: 0.6 }]} 
                disabled={reservandoId !== null} 
                onPress={() => handleReservar(vueloParaConfirmar)}
              >
                {reservandoId !== null ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={s.modalBtnConfirmText}>Continuar</Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1 },

  // Hero
  heroBanner: {
    height: 220,
    backgroundColor: '#8E5A54',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  heroContainer: {
    zIndex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    width: '100%',
    maxWidth: 960,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: Spacing.md,
  },
  searchBarCompact: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    width: '100%',
    alignItems: 'center',
    ...Shadow.md,
  },
  sbField: {
    flex: 1,
    minWidth: 100,
    paddingHorizontal: Spacing.sm,
  },
  sbLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.subtitulo,
    textTransform: 'uppercase',
  },
  sbValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.extra1,
  },
  sbSep: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    alignSelf: 'center',
  },
  sbBtn: {
    backgroundColor: Colors.titulo,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sbBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
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
    paddingVertical: 6,
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

  // Page body
  pageBody: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },

  // Sidebar (Web)
  sidebar: {
    width: 260,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.lg,
    alignSelf: 'flex-start',
    ...Shadow.sm,
  },
  sbSection: {
    gap: Spacing.sm,
  },
  sbSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.titulo,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.border,
    paddingBottom: 4,
  },
  sbSectionContent: {
    gap: Spacing.xs,
    paddingTop: 4,
  },
  priceInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  priceInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    backgroundColor: Colors.bg,
  },
  currencyPrefix: {
    color: Colors.subtitulo,
    marginRight: 4,
    fontSize: 13,
  },
  priceInp: {
    flex: 1,
    height: 32,
    fontSize: 13,
    color: Colors.extra1,
  },
  priceHint: {
    fontSize: 11,
    color: Colors.subtitulo,
    textAlign: 'center',
  },
  filterCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderColor: Colors.accentBorder,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
  },
  checkboxOn: {
    borderColor: Colors.titulo,
    backgroundColor: Colors.titulo,
  },
  filterCheckText: {
    fontSize: 13,
    color: Colors.extra1,
  },
  btnClearFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.titulo,
    borderRadius: BorderRadius.sm,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  btnClearFiltersText: {
    color: Colors.titulo,
    fontWeight: '700',
    fontSize: 13,
  },

  // Main List
  mainContent: {
    flex: 1,
  },
  list: {
    gap: Spacing.md,
  },
  loadingBox: {
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.subtitulo,
    fontSize: 14,
  },
  errorBox: {
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyBox: {
    padding: Spacing.xxl,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.titulo,
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.subtitulo,
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 20,
  },
  btnReset: {
    backgroundColor: Colors.titulo,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  btnResetText: {
    color: '#fff',
    fontWeight: '700',
  },

  // Flight Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  cardInteractive: {
    padding: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198, 177, 125, 0.15)',
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.md,
  },
  airlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  airlineIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  airlineName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.extra1,
  },
  flightCode: {
    fontSize: 11,
    color: Colors.subtitulo,
  },
  scalesBadge: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  scalesDirect: {
    backgroundColor: 'rgba(39,174,96,0.1)',
    borderColor: 'rgba(39,174,96,0.2)',
  },
  scalesStop: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.2)',
  },
  scalesBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Route Time and Journey
  cardRoute: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  routeNode: {
    width: '30%',
  },
  routeTime: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.extra1,
  },
  routeIata: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.titulo,
    marginVertical: 2,
  },
  routeAirport: {
    fontSize: 12,
    color: Colors.subtitulo,
  },
  routeJourney: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyDuration: {
    fontSize: 12,
    color: Colors.subtitulo,
    fontWeight: '500',
  },
  journeyPathLine: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: Spacing.md,
    height: 18,
    position: 'relative',
    justifyContent: 'center',
  },
  pathLine: {
    height: 2,
    backgroundColor: Colors.border,
    width: '80%',
  },
  pathPlane: {
    position: 'absolute',
    alignSelf: 'center',
    transform: [{ rotate: '90deg' }],
  },
  journeyStops: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(198, 177, 125, 0.15)',
    paddingTop: Spacing.sm,
    marginTop: Spacing.md,
  },
  priceSection: {
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
  priceSub: {
    fontSize: 11,
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
    fontWeight: '600',
    fontSize: 12,
  },
  btnReserve: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.titulo,
    borderRadius: BorderRadius.sm,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    ...Shadow.sm,
  },
  btnReserveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // Details section
  detailsSection: {
    backgroundColor: 'rgba(251, 248, 234, 0.5)',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  detailsGrid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: Spacing.md,
  },
  detailsCol: {
    flex: 1,
    gap: Spacing.xs,
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.titulo,
    marginBottom: 4,
  },
  detailsList: {
    gap: 3,
  },
  detailItem: {
    fontSize: 12,
    color: Colors.extra1,
  },
  detailBold: {
    fontWeight: '600',
    color: Colors.subtitulo,
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

  // Confirmation Modal
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: Spacing.md,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 5,
    borderLeftColor: Colors.titulo,
    width: '100%',
    maxWidth: 500,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    position: 'relative',
    paddingRight: 32,
  },
  modalTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.titulo,
  },
  modalClose: {
    position: 'absolute',
    right: 0,
    top: -2,
    padding: 4,
  },
  modalBody: {
    gap: Spacing.sm,
  },
  modalFlightName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.extra1,
  },
  modalRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.xs,
  },
  modalIata: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.titulo,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalInfoText: {
    fontSize: 13,
    color: Colors.extra1,
  },
  modalNotice: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(142,90,84,0.15)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalNoticeText: {
    flex: 1,
    fontSize: 12,
    color: Colors.titulo,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancelText: {
    color: Colors.titulo,
    fontWeight: '700',
    fontSize: 13,
  },
  modalBtnConfirm: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: 12,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.titulo,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  modalBtnConfirmText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
