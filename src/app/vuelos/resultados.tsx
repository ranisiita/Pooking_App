import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform, Linking,
  ImageBackground, useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import CalendarModal from '../../components/CalendarModal';
import AirportAutocomplete from '../../components/AirportAutocomplete';
import { FlightService } from '../../services/flights.service';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { getStorageItem, setStorageItem } from '../../services/storage';

const ITEMS_PER_PAGE = 10;

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

function formatDisplayDate(dStr: string) {
  if (!dStr) return 'Seleccionar';
  const [y, m, d] = dStr.split('-');
  return `${d}/${m}/${y}`;
}

export default function FlightResultsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const heroHeight = isWide ? 420 : 360;

  const params = useLocalSearchParams<{
    origen?: string;
    destino?: string;
    fecha?: string;
    fechaRegreso?: string;
    tipoViaje?: string;
  }>();

  // Results state
  const [vuelos, setVuelos] = useState<FlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState('recomendados');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [vueloParaConfirmar, setVueloParaConfirmar] = useState<FlightItem | null>(null);
  const [reservandoId, setReservandoId] = useState<string | null>(null);

  // Resolved airport display names (for search panel)
  const [oriName, setOriName] = useState('');
  const [destName, setDestName] = useState('');

  // Editable search form
  const [tipoViaje, setTipoViaje] = useState<'roundtrip' | 'oneway'>(
    params.tipoViaje === 'roundtrip' ? 'roundtrip' : 'oneway'
  );
  const [searchOrigen, setSearchOrigen] = useState(params.origen || '');
  const [searchOrigenDisplay, setSearchOrigenDisplay] = useState('');
  const [searchDestino, setSearchDestino] = useState(params.destino || '');
  const [searchDestinoDisplay, setSearchDestinoDisplay] = useState('');
  const [searchFecha, setSearchFecha] = useState(params.fecha || '');
  const [searchFechaRegreso, setSearchFechaRegreso] = useState(params.fechaRegreso || '');
  const [showCalSalida, setShowCalSalida] = useState(false);
  const [showCalRegreso, setShowCalRegreso] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function loadFlights() {
      setLoading(true);
      setError(null);
      try {
        let oriIata = params.origen || '';
        let destIata = params.destino || '';

        const airList = await FlightService.cargarTodosAeropuertos();

        if (oriIata.length !== 3 || oriIata !== oriIata.toUpperCase()) {
          const match = airList.find(a =>
            a.nombre.toLowerCase().includes(oriIata.toLowerCase()) ||
            a.codigoIata.toLowerCase() === oriIata.toLowerCase()
          );
          if (match) {
            oriIata = match.codigoIata;
            const display = match.display || `${match.nombre} (${match.codigoIata})`;
            setOriName(display);
            setSearchOrigen(match.codigoIata);
            setSearchOrigenDisplay(display);
          }
        } else {
          const match = airList.find(a => a.codigoIata === oriIata);
          if (match) {
            const display = match.display || `${match.nombre} (${match.codigoIata})`;
            setOriName(display);
            setSearchOrigenDisplay(display);
          }
        }

        if (destIata.length !== 3 || destIata !== destIata.toUpperCase()) {
          const match = airList.find(a =>
            a.nombre.toLowerCase().includes(destIata.toLowerCase()) ||
            a.codigoIata.toLowerCase() === destIata.toLowerCase()
          );
          if (match) {
            destIata = match.codigoIata;
            const display = match.display || `${match.nombre} (${match.codigoIata})`;
            setDestName(display);
            setSearchDestino(match.codigoIata);
            setSearchDestinoDisplay(display);
          }
        } else {
          const match = airList.find(a => a.codigoIata === destIata);
          if (match) {
            const display = match.display || `${match.nombre} (${match.codigoIata})`;
            setDestName(display);
            setSearchDestinoDisplay(display);
          }
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

  const handleBuscarNuevo = async () => {
    if (!searchOrigen || !searchDestino || !searchFecha) return;
    setLoading(true);
    setError(null);
    setCurrentPage(1);
    try {
      const data = await FlightService.buscarVuelos({
        origen: searchOrigen,
        destino: searchDestino,
        fechaSalida: searchFecha,
      });
      setVuelos(data);
      await setStorageItem('flight-results', JSON.stringify(data));
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los vuelos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDetalle = (guid: string) => {
    const next = new Set(expandidos);
    if (next.has(guid)) next.delete(guid);
    else next.add(guid);
    setExpandidos(next);
  };

  const filtered = useMemo(() => {
    const r = [...vuelos];
    if (sortOption === 'precio_asc') r.sort((a, b) => a.precioBase - b.precioBase);
    else if (sortOption === 'precio_desc') r.sort((a, b) => b.precioBase - a.precioBase);
    else if (sortOption === 'duracion') {
      const getMin = (d: string) => {
        const parts = d.match(/(\d+)h\s*(\d*)m?/);
        if (!parts) return 0;
        return (parseInt(parts[1]) || 0) * 60 + (parseInt(parts[2]) || 0);
      };
      r.sort((a, b) => getMin(a.duracion) - getMin(b.duracion));
    }
    return r;
  }, [vuelos, sortOption]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleReservar = async (vuelo: FlightItem) => {
    setReservandoId(vuelo.guidServicio);
    try {
      const token = await getStorageItem('token');
      if (!token) {
        alert('Debes iniciar sesión para realizar una reserva.');
        router.push('/login');
        return;
      }

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
          await Linking.openURL(redirectUrl);
        }
      } else {
        alert('Reserva iniciada. Procesando tu pago...');
        router.push({ pathname: '/checkout/[guid]', params: { guid: vuelo.guidServicio } });
      }
    } catch (err: any) {
      console.error(err);
      if (err.status === 401) {
        alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
        router.push('/login');
      } else {
        alert('No se pudo iniciar la reserva. Redirigiendo a pasarela interna...');
        router.push({ pathname: '/checkout/[guid]', params: { guid: vuelo.guidServicio } });
      }
    } finally {
      setReservandoId(null);
    }
  };

  const formatPrice = (val: number) => val.toFixed(2);

  return (
    <View style={s.root}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero — background image + title only */}
        <ImageBackground
          source={require('../../../public/images/avion.jpg')}
          style={[s.hero, { height: heroHeight }]}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(20,14,12,0.72)', 'rgba(40,28,24,0.55)', 'rgba(20,14,12,0.78)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.heroContent}>
            <Text style={s.heroTitle}>Busca tu vuelo</Text>
          </View>
        </ImageBackground>

        {/* Glass search panel — overlaps hero bottom edge */}
        <View style={s.glassPanelWrap}>
          <View style={s.glassPanel}>
            {/* Trip type tabs */}
            <View style={s.tripTabs}>
              <TouchableOpacity
                style={[s.tripTab, tipoViaje === 'roundtrip' && s.tripTabActive]}
                onPress={() => setTipoViaje('roundtrip')}
                activeOpacity={0.8}
              >
                <Text style={[s.tripTabText, tipoViaje === 'roundtrip' && s.tripTabTextActive]}>
                  IDA Y VUELTA
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tripTab, tipoViaje === 'oneway' && s.tripTabActive]}
                onPress={() => setTipoViaje('oneway')}
                activeOpacity={0.8}
              >
                <Text style={[s.tripTabText, tipoViaje === 'oneway' && s.tripTabTextActive]}>
                  SOLO IDA
                </Text>
              </TouchableOpacity>
            </View>

            {/* Origen / Destino autocomplete */}
            <View style={[s.fieldRow, isWide && { flexDirection: 'row' }]}>
              <View style={[s.acField, { zIndex: 12 }]}>
                <Text style={s.fieldLabel}>Origen</Text>
                <AirportAutocomplete
                  value={searchOrigenDisplay}
                  onSelect={(iata, display) => { setSearchOrigen(iata); setSearchOrigenDisplay(display); }}
                  placeholder="Ciudad o aeropuerto de origen"
                  icon="flight-takeoff"
                />
              </View>
              <View style={[s.acField, { zIndex: 11 }]}>
                <Text style={s.fieldLabel}>Destino</Text>
                <AirportAutocomplete
                  value={searchDestinoDisplay}
                  onSelect={(iata, display) => { setSearchDestino(iata); setSearchDestinoDisplay(display); }}
                  placeholder="Ciudad o aeropuerto de destino"
                  icon="flight-land"
                />
              </View>
            </View>

            {/* Dates */}
            <View style={[s.fieldRow, isWide && { flexDirection: 'row' }]}>
              <View style={s.dateField}>
                <Text style={s.fieldLabel}>Fecha de salida</Text>
                <TouchableOpacity style={s.dateTrigger} onPress={() => setShowCalSalida(true)} activeOpacity={0.8}>
                  <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={s.dateTriggerText}>{formatDisplayDate(searchFecha)}</Text>
                </TouchableOpacity>
              </View>
              <View style={[s.dateField, tipoViaje === 'oneway' && { opacity: 0.4 }]}>
                <Text style={s.fieldLabel}>Fecha de regreso</Text>
                <TouchableOpacity
                  style={s.dateTrigger}
                  onPress={tipoViaje === 'roundtrip' ? () => setShowCalRegreso(true) : undefined}
                  activeOpacity={tipoViaje === 'roundtrip' ? 0.8 : 1}
                >
                  <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={s.dateTriggerText}>{formatDisplayDate(searchFechaRegreso)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Search button */}
            <TouchableOpacity style={s.btnSearch} onPress={handleBuscarNuevo} activeOpacity={0.85}>
              <Ionicons name="search" size={18} color="#fff" />
              <Text style={s.btnSearchText}>Buscar vuelos</Text>
            </TouchableOpacity>
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
            {[
              { v: 'recomendados', l: 'Recomendados' },
              { v: 'precio_asc', l: 'Menor precio' },
              { v: 'precio_desc', l: 'Mayor precio' },
              { v: 'duracion', l: 'Menor duración' },
            ].map(opt => (
              <TouchableOpacity
                key={opt.v}
                style={[s.sortChip, sortOption === opt.v && s.sortChipOn]}
                onPress={() => { setSortOption(opt.v); setCurrentPage(1); }}
              >
                <Text style={[s.sortChipText, sortOption === opt.v && { color: Colors.titulo, fontWeight: '600' }]}>
                  {opt.l}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Page Content */}
        <View style={[s.pageBody, isWide && { flexDirection: 'row' }]}>
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
                <Text style={s.emptyDesc}>
                  No hemos encontrado vuelos que coincidan con tu búsqueda. Intenta modificar los criterios.
                </Text>
              </View>
            ) : (
              <View style={s.list}>
                {paged.map(v => {
                  const isExp = expandidos.has(v.guidServicio);
                  return (
                    <View key={v.guidServicio} style={s.card}>
                      <TouchableOpacity
                        style={s.cardInteractive}
                        onPress={() => toggleDetalle(v.guidServicio)}
                        activeOpacity={0.9}
                      >
                        {/* Header with gradient */}
                        <LinearGradient
                          colors={[Colors.titulo, '#9d6961']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={s.cardHeader}
                        >
                          <View style={s.airlineInfo}>
                            <View style={s.airlineIcon}>
                              <Ionicons name="airplane" size={16} color="#fff" />
                            </View>
                            <View>
                              <Text style={s.airlineName}>{v.proveedor}</Text>
                              <Text style={s.flightCode}>Vuelo {v.nombreComercial}</Text>
                            </View>
                          </View>
                          <View style={[s.scalesBadge, v.escalas === 0 ? s.scalesDirect : s.scalesStop]}>
                            <Text style={[s.scalesBadgeText, v.escalas === 0 ? { color: '#4ade80' } : { color: '#fbbf24' }]}>
                              {v.escalas === 0 ? 'DIRECTO' : `${v.escalas} ESCALA${v.escalas > 1 ? 'S' : ''}`}
                            </Text>
                          </View>
                        </LinearGradient>

                        {/* Ticket notch divider */}
                        <View style={s.ticketRow} pointerEvents="none">
                          <View style={s.ticketCircle} />
                          <View style={s.ticketLine} />
                          <View style={s.ticketCircle} />
                        </View>

                        {/* Route */}
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

                        {/* Footer */}
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
                          <View style={[s.detailsGrid, isWide && { flexDirection: 'row' }]}>
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

      {/* Calendar Modals */}
      <CalendarModal
        visible={showCalSalida}
        value={searchFecha}
        onSelect={d => setSearchFecha(d)}
        onClose={() => setShowCalSalida(false)}
        minDate={today}
      />
      <CalendarModal
        visible={showCalRegreso}
        value={searchFechaRegreso}
        onSelect={d => setSearchFechaRegreso(d)}
        onClose={() => setShowCalRegreso(false)}
        minDate={searchFecha || today}
      />

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
  hero: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  heroContent: {
    zIndex: 1,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // Glass search panel (sits below hero, overlaps with negative marginTop)
  glassPanelWrap: {
    marginTop: -Spacing.xl,
    paddingHorizontal: Spacing.md,
    zIndex: 10,
    marginBottom: Spacing.md,
  },
  glassPanel: {
    backgroundColor: 'rgba(28,22,20,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.lg,
  },

  // Trip type tabs
  tripTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: BorderRadius.lg,
    padding: 3,
    gap: 3,
  },
  tripTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  tripTabActive: {
    backgroundColor: Colors.titulo,
    ...Shadow.sm,
  },
  tripTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },
  tripTabTextActive: {
    color: '#fff',
  },

  // Autocomplete fields
  fieldRow: {
    gap: Spacing.sm,
  },
  acField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  // Date fields
  dateField: {
    flex: 1,
  },
  dateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dateTriggerText: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
  },

  // Search button
  btnSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.titulo,
    borderRadius: BorderRadius.md,
    paddingVertical: 13,
    ...Shadow.md,
  },
  btnSearchText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
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
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },

  // Main List
  mainContent: { flex: 1 },
  list: { gap: Spacing.md },
  loadingBox: {
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: { color: Colors.subtitulo, fontSize: 14 },
  errorBox: {
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorText: { color: Colors.error, fontSize: 14, textAlign: 'center' },
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
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.titulo },
  emptyDesc: {
    fontSize: 14,
    color: Colors.subtitulo,
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 20,
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
    paddingBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: 0,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  airlineName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  flightCode: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  scalesBadge: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  scalesDirect: {
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderColor: 'rgba(74,222,128,0.3)',
  },
  scalesStop: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderColor: 'rgba(251,191,36,0.3)',
  },
  scalesBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Ticket notch divider
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 0,
  },
  ticketCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.bg,
    borderWidth: 2,
    borderColor: 'rgba(198,177,125,0.3)',
    marginHorizontal: -10,
    zIndex: 1,
  },
  ticketLine: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(198,177,125,0.3)',
  },

  // Route
  cardRoute: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  routeNode: { width: '30%' },
  routeTime: { fontSize: 22, fontWeight: '700', color: Colors.extra1 },
  routeIata: { fontSize: 15, fontWeight: '700', color: Colors.titulo, marginVertical: 2 },
  routeAirport: { fontSize: 12, color: Colors.subtitulo },
  routeJourney: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyDuration: { fontSize: 12, color: Colors.subtitulo, fontWeight: '500' },
  journeyPathLine: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: Spacing.md,
    height: 18,
    position: 'relative',
    justifyContent: 'center',
  },
  pathLine: { height: 2, backgroundColor: Colors.border, width: '80%' },
  pathPlane: {
    position: 'absolute',
    alignSelf: 'center',
    transform: [{ rotate: '90deg' }],
  },
  journeyStops: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(198, 177, 125, 0.15)',
    paddingTop: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  priceSection: { gap: 1 },
  priceLabel: { fontSize: 9, fontWeight: '600', color: Colors.subtitulo, letterSpacing: 0.5 },
  priceValue: { fontSize: 20, fontWeight: '700', color: Colors.titulo },
  priceSub: { fontSize: 11, color: Colors.subtitulo },
  actions: { flexDirection: 'row', gap: Spacing.sm },
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
  btnDetailsText: { color: Colors.titulo, fontWeight: '600', fontSize: 12 },
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
  btnReserveText: { color: '#fff', fontWeight: '700', fontSize: 13 },

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
    gap: Spacing.md,
  },
  detailsCol: { flex: 1, gap: Spacing.xs },
  detailsTitle: { fontSize: 13, fontWeight: '700', color: Colors.titulo, marginBottom: 4 },
  detailsList: { gap: 3 },
  detailItem: { fontSize: 12, color: Colors.extra1 },
  detailBold: { fontWeight: '600', color: Colors.subtitulo },

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
  pagBtnActive: { backgroundColor: Colors.titulo, borderColor: Colors.titulo },
  pagBtnText: { fontSize: 13, color: Colors.extra1 },

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
  modalTitleText: { fontSize: 18, fontWeight: '700', color: Colors.titulo },
  modalClose: { position: 'absolute', right: 0, top: -2, padding: 4 },
  modalBody: { gap: Spacing.sm },
  modalFlightName: { fontSize: 15, fontWeight: '700', color: Colors.extra1 },
  modalRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.xs,
  },
  modalIata: { fontSize: 20, fontWeight: '700', color: Colors.titulo },
  modalInfoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  modalInfoText: { fontSize: 13, color: Colors.extra1 },
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
  modalNoticeText: { flex: 1, fontSize: 12, color: Colors.titulo, lineHeight: 18 },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancelText: { color: Colors.titulo, fontWeight: '700', fontSize: 13 },
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
  modalBtnConfirmText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
