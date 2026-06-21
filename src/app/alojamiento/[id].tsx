import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform, useWindowDimensions, Modal, Pressable
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import CalendarModal from '../../components/CalendarModal';
import { getLodgingById, getRooms, getReviews } from '../../services/lodging.service';
import { Lodging, Room, Review } from '../../types/lodging.types';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';

function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array(5).fill(0).map((_, i) => (
        <Text key={i} style={{ fontSize: size, color: i < n ? '#F5C518' : 'rgba(198,177,125,0.3)' }}>★</Text>
      ))}
    </View>
  );
}

export default function LodgingDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; provider?: string; llegada?: string; salida?: string; adultos?: string; ninos?: string }>();
  const [containerWidth, setContainerWidth] = useState(0);
  const isWide = containerWidth >= 850;

  const [lodging, setLodging] = useState<Lodging | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);

  // Collapsible description
  const [showFullDesc, setShowFullDesc] = useState(false);

  // Anchors navigation active state
  const [activeTab, setActiveTab] = useState('info');

  // Dates state
  const [fechaLlegada, setFechaLlegada] = useState(params.llegada || '');
  const [fechaSalida, setFechaSalida] = useState(params.salida || '');
  const [showLlegadaPicker, setShowLlegadaPicker] = useState(false);
  const [showSalidaPicker, setShowSalidaPicker] = useState(false);

  // Search Criteria targets
  const adultosSearch = parseInt(params.adultos || '2');
  const ninosSearch = parseInt(params.ninos || '0');

  // Room selections state
  const [selectedRooms, setSelectedRooms] = useState<any[]>([]);

  // Room modal configuration state
  const [configRoom, setConfigRoom] = useState<Room | null>(null);
  const [modalRoomIdx, setModalRoomIdx] = useState(0);
  const [modalHabitaciones, setModalHabitaciones] = useState(1);
  const [modalAdultos, setModalAdultos] = useState(1);
  const [modalNinos, setModalNinos] = useState(0);

  // Autoplay interval for lodging gallery
  useEffect(() => {
    if (!lodging || lodging.imagenes.length <= 1) return;
    const interval = setInterval(() => {
      setImgIdx(prev => (prev + 1) % lodging.imagenes.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [lodging]);

  // Load Initial Lodging Data
  useEffect(() => {
    if (!params.id || !params.provider) { router.back(); return; }
    setLoading(true);

    getLodgingById(params.id, params.provider, fechaLlegada, fechaSalida).then(async (l) => {
      if (l) {
        // Fetch reviews too
        const rvs = await getReviews(params.id!, params.provider!);
        l.reviews = rvs;
        l.reviewsCount = rvs.length;
        
        // Load rooms
        const rms = await getRooms(params.id!, params.provider!, { llegada: fechaLlegada, salida: fechaSalida });
        setLodging(l);
        setRooms(rms);
      }
      setLoading(false);
    });
  }, [params.id, params.provider]);

  // Refresh rooms on date change
  const handleDateChange = (llegada: string, salida: string) => {
    if (!params.id || !params.provider) return;
    getLodgingById(params.id, params.provider, llegada, salida).then(async (l) => {
      if (l) {
        const rms = await getRooms(params.id!, params.provider!, { llegada, salida });
        setRooms(rms);
        
        // Filter out selections that are no longer available in the refreshed room list
        setSelectedRooms(prev => prev.filter(sel => rms.some(r => r.id === sel.roomId)));
      }
    });
  };

  const nights = useMemo(() => {
    if (!fechaLlegada || !fechaSalida) return 2;
    const diff = new Date(fechaSalida).getTime() - new Date(fechaLlegada).getTime();
    return Math.max(1, Math.round(diff / 86400000));
  }, [fechaLlegada, fechaSalida]);

  const precioNoche = useMemo(() => {
    if (selectedRooms.length === 0) return lodging?.precio || 0;
    return selectedRooms.reduce((sum, sel) => sum + (sel.precio * sel.habitaciones), 0);
  }, [selectedRooms, lodging]);

  const precioBase = precioNoche * nights;
  const iva = precioBase * 0.15;
  const total = precioBase + iva;

  const totalAdultosSeleccionados = selectedRooms.reduce((sum, sel) => sum + sel.adultos, 0);
  const totalNinosSeleccionados = selectedRooms.reduce((sum, sel) => sum + sel.ninos, 0);
  const totalHabitacionesSeleccionadas = selectedRooms.reduce((sum, sel) => sum + sel.habitaciones, 0);

  const puedeReservar = totalAdultosSeleccionados >= adultosSearch && totalNinosSeleccionados >= ninosSearch;

  const isRoomSelected = (roomId: string) => selectedRooms.some(sel => sel.roomId === roomId);

  const openRoomConfig = (room: Room) => {
    setConfigRoom(room);
    setModalRoomIdx(0);
    const existing = selectedRooms.find(sel => sel.roomId === room.id);
    if (existing) {
      setModalHabitaciones(existing.habitaciones);
      setModalAdultos(existing.adultos);
      setModalNinos(existing.ninos);
    } else {
      setModalHabitaciones(1);
      const remainingAdults = Math.max(1, adultosSearch - totalAdultosSeleccionados);
      setModalAdultos(Math.min(room.capacidadAdultos, remainingAdults));
      const remainingKids = Math.max(0, ninosSearch - totalNinosSeleccionados);
      setModalNinos(Math.min(room.capacidadNinos, remainingKids));
    }
  };

  const confirmRoomSelection = () => {
    if (!configRoom) return;
    const selection = {
      roomId: configRoom.id,
      roomName: configRoom.nombre,
      precio: configRoom.precio,
      habitaciones: modalHabitaciones,
      adultos: modalAdultos,
      ninos: modalNinos,
      maxAdultos: configRoom.capacidadAdultos,
      maxNinos: configRoom.capacidadNinos,
      disponibles: configRoom.disponibles
    };
    setSelectedRooms(prev => [...prev.filter(sel => sel.roomId !== configRoom.id), selection]);
    setConfigRoom(null);
  };

  const removeRoomSelection = (roomId: string) => {
    setSelectedRooms(prev => prev.filter(sel => sel.roomId !== roomId));
    setConfigRoom(null);
  };

  const procederAReserva = () => {
    if (!puedeReservar || !lodging) return;
    router.push({
      pathname: '/alojamiento/[id]/reservar',
      params: {
        id: lodging.id,
        provider: params.provider!,
        llegada: fechaLlegada,
        salida: fechaSalida,
        adultos: String(adultosSearch),
        ninos: String(ninosSearch),
        roomName: selectedRooms.map(sel => `${sel.roomName} (x${sel.habitaciones})`).join(', '),
        precio: String(precioNoche),
        seleccion: JSON.stringify(selectedRooms),
        // Hotel metadata for the booking sidebar
        hotelNombre: lodging.nombre,
        hotelImagen: lodging.imagenes[0] || lodging.imagen,
        hotelCategoria: String(lodging.categoria),
        hotelDireccion: lodging.direccion,
        hotelPrecioDesde: String(lodging.precio),
        hotelCheckIn: lodging.checkIn,
        hotelCheckOut: lodging.checkOut,
      }
    });
  };

  // Scroll anchor simulation
  const scrollRef = useRef<ScrollView>(null);
  const sectionRefs = {
    info: useRef<View>(null),
    rooms: useRef<View>(null),
    services: useRef<View>(null),
    reviews: useRef<View>(null),
    location: useRef<View>(null),
  };

  const scrollToSection = (section: keyof typeof sectionRefs) => {
    setActiveTab(section);
    sectionRefs[section].current?.measureLayout(
      scrollRef.current as any,
      (x, y) => {
        scrollRef.current?.scrollTo({ y: y - 60, animated: true });
      },
      () => {}
    );
  };

  if (loading) {
    return (
      <View style={s.root}>
        <Navbar />
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color={Colors.titulo} />
          <Text style={{ color: Colors.subtitulo }}>Cargando alojamiento...</Text>
        </View>
      </View>
    );
  }

  if (!lodging) {
    return (
      <View style={s.root}>
        <Navbar />
        <View style={s.centerBox}>
          <Ionicons name="alert-circle-outline" size={52} color={Colors.error} />
          <Text style={s.errorTitle}>Alojamiento no encontrado</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>Volver a resultados</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const images = lodging.imagenes?.length > 0 ? lodging.imagenes : [lodging.imagen];

  return (
    <View style={s.root} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      <Navbar />

      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Gallery Auto Carousel */}
        <View style={[s.carousel, { height: isWide ? 420 : 250 }]}>
          <Image source={{ uri: images[imgIdx] }} style={s.carouselImg} resizeMode="cover" />
          {images.length > 1 && (
            <>
              <TouchableOpacity style={[s.carouselArrow, s.carouselLeft]} onPress={() => setImgIdx(i => (i - 1 + images.length) % images.length)}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[s.carouselArrow, s.carouselRight]} onPress={() => setImgIdx(i => (i + 1) % images.length)}>
                <Ionicons name="chevron-forward" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={s.carouselDots}>
                {images.map((_, i) => <View key={i} style={[s.dot, i === imgIdx && s.dotActive]} />)}
              </View>
            </>
          )}
          <View style={s.carouselCounter}>
            <Ionicons name="camera" size={12} color="#fff" style={{ marginRight: 4 }} />
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{imgIdx + 1} / {images.length}</Text>
          </View>
          <TouchableOpacity style={s.carouselBack} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Layout content */}
        <View style={[s.bodyContainer, { flexDirection: isWide ? 'row' : 'column', padding: isWide ? Spacing.lg : Spacing.md }]}>
          
          {/* Main Column */}
          <View style={[s.mainColumn, { width: isWide ? 'auto' : '100%', flex: isWide ? 2 : undefined }]}>
            
            {/* Header info */}
            <View ref={sectionRefs.info} style={s.sectionCard}>
              <View style={[s.headerTop, { flexDirection: isWide ? 'row' : 'column', alignItems: isWide ? 'flex-start' : 'stretch', gap: Spacing.md }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{lodging.nombre}</Text>
                  <View style={s.starsRow}>
                    <Stars n={lodging.categoria} size={15} />
                    <Text style={s.starsLabel}>{lodging.tipo} · {lodging.categoria} estrellas</Text>
                  </View>
                  <View style={s.location}>
                    <Ionicons name="location-outline" size={15} color={Colors.extra2} />
                    <Text style={s.locationText}>{lodging.direccion}</Text>
                  </View>
                </View>
                {lodging.valoracion > 0 && (
                  <View style={[s.ratingBox, !isWide && { alignSelf: 'flex-start', flexDirection: 'row', gap: 8, minWidth: 0, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' }]}>
                    <Text style={s.ratingNum}>{lodging.valoracion.toFixed(1)}</Text>
                    <View style={!isWide && { justifyContent: 'center' }}>
                      <Text style={s.ratingLabel}>{lodging.ratingTexto}</Text>
                      <Text style={[s.ratingCount, !isWide && { marginTop: 1 }]}>{lodging.reviewsCount} val.</Text>
                    </View>
                  </View>
                )}
              </View>
              
              <View style={s.horizontalDivider} />

              <Text style={s.sectionSubTitle}>Sobre este alojamiento</Text>
              <Text style={s.desc} numberOfLines={showFullDesc ? undefined : 3}>{lodging.descripcion}</Text>
              {showFullDesc && lodging.descripcionLarga ? <Text style={[s.desc, { marginTop: 6 }]}>{lodging.descripcionLarga}</Text> : null}
              <TouchableOpacity onPress={() => setShowFullDesc(!showFullDesc)} style={s.readMoreBtn}>
                <Text style={s.readMoreText}>{showFullDesc ? 'Mostrar menos' : 'Leer más'}</Text>
                <Ionicons name={showFullDesc ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.titulo} />
              </TouchableOpacity>
            </View>

            {/* Rooms list */}
            <View ref={sectionRefs.rooms} style={s.sectionCard}>
              <Text style={s.sectionTitle}>Habitaciones disponibles</Text>
              {rooms.length === 0 ? (
                <Text style={s.emptyText}>No hay habitaciones disponibles para el rango de fechas seleccionado.</Text>
              ) : (
                rooms.map(room => (
                  <View key={room.id} style={[s.roomCard, { flexDirection: isWide ? 'row' : 'column' }]}>
                    <View style={[s.roomImgContainer, { width: isWide ? 180 : '100%', height: isWide ? 'auto' : 160 }]}>
                      <Image source={{ uri: room.imagen || lodging.imagen }} style={s.roomImg} />
                      {room.imagenes && room.imagenes.length > 0 && (
                        <View style={s.roomPhotoCount}>
                          <Ionicons name="image" size={10} color="#fff" style={{ marginRight: 3 }} />
                          <Text style={s.roomPhotoCountText}>{room.imagenes.length} fotos</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.roomBody}>
                      <Text style={s.roomName}>{room.nombre}</Text>
                      <View style={s.roomMetaGrid}>
                        <View style={s.roomMetaItem}><Ionicons name="bed" size={13} color={Colors.subtitulo} /><Text style={s.roomMetaText}>{room.cama || 'Cama doble'}</Text></View>
                        <View style={s.roomMetaItem}><Ionicons name="people" size={13} color={Colors.subtitulo} /><Text style={s.roomMetaText}>{room.capacidad}</Text></View>
                        <View style={s.roomMetaItem}><Ionicons name="resize" size={13} color={Colors.subtitulo} /><Text style={s.roomMetaText}>{room.metros} m²</Text></View>
                        <View style={s.roomMetaItem}><Ionicons name="business" size={13} color={Colors.subtitulo} /><Text style={s.roomMetaText}>{room.piso || 'Nivel 1'}</Text></View>
                      </View>
                      <View style={s.roomFooter}>
                        <View>
                          <Text style={s.roomPriceLabel}>por noche</Text>
                          <Text style={s.roomPrice}>${room.precio} <Text style={s.roomCurrency}>USD</Text></Text>
                          <Text style={[s.roomAvail, room.disponibles <= 2 && { color: Colors.error }]}>
                            ● {room.disponibles === 1 ? '¡Solo queda 1!' : `${room.disponibles} disponibles`}
                          </Text>
                        </View>
                        <TouchableOpacity style={[s.roomSelectBtn, isRoomSelected(room.id) && s.roomSelectBtnActive]} onPress={() => openRoomConfig(room)}>
                          {isRoomSelected(room.id) && <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginRight: 4 }} />}
                          <Text style={[s.roomSelectText, isRoomSelected(room.id) && { color: '#fff' }]}>
                            {isRoomSelected(room.id) ? 'Configurada' : 'Seleccionar'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Amenities / Services */}
            <View ref={sectionRefs.services} style={s.sectionCard}>
              <Text style={s.sectionTitle}>Servicios e instalaciones</Text>
              <View style={s.amenitiesGrid}>
                {lodging.servicios?.map(serv => (
                  <View key={serv} style={s.amenityCell}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={Colors.titulo} />
                    <Text style={s.amenityText}>{serv}</Text>
                  </View>
                ))}
                {lodging.aceptaNinos && (
                  <View style={s.amenityCell}>
                    <Ionicons name="happy" size={18} color="#2196f3" />
                    <Text style={[s.amenityText, { color: '#2196f3' }]}>Acepta niños</Text>
                  </View>
                )}
                {lodging.aceptaMascotas && (
                  <View style={s.amenityCell}>
                    <Ionicons name="paw" size={18} color="#4caf50" />
                    <Text style={[s.amenityText, { color: '#4caf50' }]}>Mascotas permitidas</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Location block */}
            <View ref={sectionRefs.location} style={s.sectionCard}>
              <Text style={s.sectionTitle}>Ubicación</Text>
              <View style={s.mapContainer}>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&q=85' }} style={s.mapImg} />
                <View style={s.mapPin}>
                  <Ionicons name="location" size={20} color={Colors.error} />
                  <Text style={s.mapPinText}>{lodging.nombre}</Text>
                </View>
              </View>
              <View style={s.locCard}>
                <Ionicons name="location-outline" size={18} color={Colors.titulo} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.extra1 }}>Dirección oficial</Text>
                  <Text style={{ fontSize: 13, color: Colors.subtitulo }}>{lodging.direccion}</Text>
                </View>
              </View>
            </View>

            {/* Reviews list */}
            <View ref={sectionRefs.reviews} style={s.sectionCard}>
              <Text style={s.sectionTitle}>Opiniones reales de huéspedes</Text>
              
              {/* Score summary track */}
              <View style={s.reviewsSummarySingle}>
                <View style={s.rssPill}><Text style={s.rssPillText}>{lodging.valoracion.toFixed(1)}</Text></View>
                <View style={s.rssInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="ribbon" size={16} color={Colors.titulo} />
                    <Text style={s.rssWord}>{lodging.ratingTexto}</Text>
                  </View>
                  <Text style={s.rssTotal}>Basado en {lodging.reviewsCount} opiniones</Text>
                  <View style={s.rssTrack}>
                    <View style={[s.rssBar, { width: `${lodging.valoracion * 10}%` }]} />
                  </View>
                </View>
              </View>

              {lodging.reviews && lodging.reviews.length > 0 ? (
                lodging.reviews.map((rv, i) => (
                  <View key={i} style={s.reviewCard}>
                    <View style={s.reviewHeader}>
                      <View style={s.reviewAvatar}><Text style={s.reviewAvatarText}>{rv.iniciales || 'HU'}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.reviewAuthor}>{rv.nombre}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Stars n={Math.round(rv.score / 2)} size={11} />
                          <Text style={s.reviewDate}>{rv.fecha}</Text>
                        </View>
                      </View>
                      <View style={s.reviewScoreBox}><Text style={s.reviewScoreText}>{rv.score.toFixed(1)}</Text></View>
                    </View>
                    <View style={s.reviewContent}>
                      {rv.positivo ? (
                        <View style={s.reviewTextRow}>
                          <Ionicons name="thumbs-up" size={13} color="#27ae60" style={{ marginTop: 2 }} />
                          <Text style={s.reviewText}>{rv.positivo}</Text>
                        </View>
                      ) : null}
                      {rv.negativo ? (
                        <View style={s.reviewTextRow}>
                          <Ionicons name="thumbs-down" size={13} color={Colors.error} style={{ marginTop: 2 }} />
                          <Text style={s.reviewText}>{rv.negativo}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))
              ) : (
                <Text style={s.emptyText}>No hay comentarios disponibles para este hotel aún.</Text>
              )}
            </View>

          </View>

          {/* Booking Sidebar Widget */}
          <View style={[s.sidebarColumn, { width: isWide ? 'auto' : '100%', flex: isWide ? 1 : undefined, marginLeft: isWide ? Spacing.lg : 0, marginTop: isWide ? 0 : Spacing.md }]}>
            <View style={s.bookingCard}>
              <Text style={s.bcTitle}>Resumen de tu estadía</Text>
              
              <View style={s.bcDatesGrid}>
                {/* Arrival Date */}
                <TouchableOpacity style={s.bcDateCell} onPress={() => setShowLlegadaPicker(true)}>
                  <Text style={s.bcDateLabel}>Llegada</Text>
                  <Text style={s.bcDateVal}>{fechaLlegada || 'Seleccionar'}</Text>
                </TouchableOpacity>
                {/* Departure Date */}
                <TouchableOpacity style={s.bcDateCell} onPress={() => setShowSalidaPicker(true)}>
                  <Text style={s.bcDateLabel}>Salida</Text>
                  <Text style={s.bcDateVal}>{fechaSalida || 'Seleccionar'}</Text>
                </TouchableOpacity>
              </View>

              {/* Guest allocation premium track */}
              <View style={s.guestStatusTrack}>
                <View style={s.gstRow}>
                  <Text style={s.gstLabel}>Búsqueda inicial</Text>
                  <Text style={s.gstVal}>{adultosSearch} adultos · {ninosSearch} niños</Text>
                </View>
                <View style={s.gstDivider} />
                <View style={s.gstRow}>
                  <Text style={s.gstSubLabel}>Habitaciones config:</Text>
                  <Text style={s.gstSubVal}>{totalHabitacionesSeleccionadas} seleccionadas</Text>
                </View>
                <View style={s.gstRow}>
                  <Text style={s.gstSubLabel}>Adultos asignados:</Text>
                  <Text style={[s.gstSubVal, { color: totalAdultosSeleccionados >= adultosSearch ? '#27ae60' : Colors.error }]}>
                    {totalAdultosSeleccionados} / {adultosSearch}
                  </Text>
                </View>
                <View style={s.gstRow}>
                  <Text style={s.gstSubLabel}>Niños asignados:</Text>
                  <Text style={[s.gstSubVal, { color: totalNinosSeleccionados >= ninosSearch ? '#27ae60' : Colors.error }]}>
                    {totalNinosSeleccionados} / {ninosSearch}
                  </Text>
                </View>
                <View style={[s.statusPill, puedeReservar ? s.statusPillOk : s.statusPillErr]}>
                  <Ionicons name={puedeReservar ? 'checkmark-circle' : 'information-circle'} size={14} color={puedeReservar ? '#27ae60' : Colors.error} />
                  <Text style={[s.statusPillText, { color: puedeReservar ? '#2a7d4f' : '#b52020' }]}>
                    {puedeReservar ? 'Asignación completa' : 'Asigna los huéspedes en las habitaciones'}
                  </Text>
                </View>
              </View>

              {/* Breakdown */}
              <View style={s.breakdown}>
                <View style={s.breakdownRow}>
                  <Text style={s.bdLabel}>Precio base ({nights} noches)</Text>
                  <Text style={s.bdVal}>${precioBase.toFixed(2)}</Text>
                </View>
                <View style={s.breakdownRow}>
                  <Text style={s.bdLabel}>IVA (15%)</Text>
                  <Text style={s.bdVal}>${iva.toFixed(2)}</Text>
                </View>
                <View style={s.bdDivider} />
                <View style={s.breakdownRow}>
                  <Text style={s.bdTotalLabel}>Total estimado</Text>
                  <Text style={s.bdTotalVal}>${total.toFixed(2)} <Text style={{ fontSize: 12 }}>USD</Text></Text>
                </View>
              </View>

              {/* CTA Booking */}
              <TouchableOpacity
                style={[s.bookBtn, !puedeReservar && s.bookBtnDisabled]}
                disabled={!puedeReservar}
                onPress={procederAReserva}
              >
                <Ionicons name={puedeReservar ? 'heart' : 'lock-closed'} size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={s.bookBtnText}>{puedeReservar ? 'Reservar ahora' : 'Completa la selección'}</Text>
              </TouchableOpacity>
              <Text style={s.disclaimer}>No se cobra nada hasta el momento del check-in</Text>
            </View>
          </View>

        </View>

        <Footer />
      </ScrollView>

      {/* Arrival Date Picker */}
      <CalendarModal
        visible={showLlegadaPicker}
        value={fechaLlegada}
        onSelect={val => {
          setFechaLlegada(val);
          if (fechaSalida && val > fechaSalida) setFechaSalida(val);
          handleDateChange(val, fechaSalida || val);
        }}
        onClose={() => setShowLlegadaPicker(false)}
      />

      {/* Departure Date Picker */}
      <CalendarModal
        visible={showSalidaPicker}
        value={fechaSalida}
        minDate={fechaLlegada || undefined}
        onSelect={val => {
          setFechaSalida(val);
          if (fechaLlegada && val < fechaLlegada) setFechaLlegada(val);
          handleDateChange(fechaLlegada || val, val);
        }}
        onClose={() => setShowSalidaPicker(false)}
      />

      {/* Room Configuration Dialog Modal */}
      {configRoom && (
        <Modal visible={!!configRoom} transparent animationType="fade" onRequestClose={() => setConfigRoom(null)}>
          <Pressable style={s.modalOverlay} onPress={() => setConfigRoom(null)}>
             <Pressable style={[s.modalContent, { width: containerWidth > 420 ? 380 : '90%' }]}>
              <View style={s.mHeader}>
                <Text style={s.mTitle} numberOfLines={1}>{configRoom.nombre}</Text>
                <TouchableOpacity onPress={() => setConfigRoom(null)} style={s.mClose}>
                  <Ionicons name="close" size={20} color={Colors.subtitulo} />
                </TouchableOpacity>
              </View>

              {/* Room images carousel */}
              {configRoom.imagenes && configRoom.imagenes.length > 0 && (
                <View style={s.mCarousel}>
                  <Image source={{ uri: configRoom.imagenes[modalRoomIdx] }} style={s.mCarouselImg} />
                  {configRoom.imagenes.length > 1 && (
                    <>
                      <TouchableOpacity style={[s.mCarouselArrow, s.mCarouselLeft]} onPress={() => setModalRoomIdx(i => (i - 1 + configRoom.imagenes!.length) % configRoom.imagenes!.length)}>
                        <Ionicons name="chevron-back" size={18} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.mCarouselArrow, s.mCarouselRight]} onPress={() => setModalRoomIdx(i => (i + 1) % configRoom.imagenes!.length)}>
                        <Ionicons name="chevron-forward" size={18} color="#fff" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}

              {/* Specifications pills */}
              <View style={s.mSpecs}>
                <View style={s.mSpecPill}><Ionicons name="bed" size={12} color={Colors.titulo} /><Text style={s.mSpecText}>{configRoom.cama || 'Cama Doble'}</Text></View>
                <View style={s.mSpecPill}><Ionicons name="people" size={12} color={Colors.titulo} /><Text style={s.mSpecText}>{configRoom.capacidad}</Text></View>
                <View style={s.mSpecPill}><Ionicons name="resize" size={12} color={Colors.titulo} /><Text style={s.mSpecText}>{configRoom.metros} m²</Text></View>
              </View>

              {/* Counters */}
              <View style={s.mCounters}>
                {/* Rooms Quantity Counter */}
                <View style={s.mCounterRow}>
                  <View>
                    <Text style={s.mCounterLabel}>Habitaciones</Text>
                    <Text style={s.mCounterSub}>Disponibles: {configRoom.disponibles}</Text>
                  </View>
                  <View style={s.mCounterActions}>
                    <TouchableOpacity style={s.mCounterBtn} onPress={() => setModalHabitaciones(h => Math.max(1, h - 1))}>
                      <Text style={s.mCounterBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.mCounterVal}>{modalHabitaciones}</Text>
                    <TouchableOpacity style={s.mCounterBtn} onPress={() => setModalHabitaciones(h => Math.min(configRoom.disponibles, h + 1))}>
                      <Text style={s.mCounterBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Adults Counter */}
                <View style={s.mCounterRow}>
                  <View>
                    <Text style={s.mCounterLabel}>Adultos</Text>
                    <Text style={s.mCounterSub}>Máximo: {configRoom.capacidadAdultos * modalHabitaciones}</Text>
                  </View>
                  <View style={s.mCounterActions}>
                    <TouchableOpacity style={s.mCounterBtn} onPress={() => setModalAdultos(a => Math.max(1, a - 1))}>
                      <Text style={s.mCounterBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.mCounterVal}>{modalAdultos}</Text>
                    <TouchableOpacity style={s.mCounterBtn} onPress={() => setModalAdultos(a => Math.min(configRoom.capacidadAdultos * modalHabitaciones, a + 1))}>
                      <Text style={s.mCounterBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Kids Counter */}
                <View style={s.mCounterRow}>
                  <View>
                    <Text style={s.mCounterLabel}>Niños</Text>
                    <Text style={s.mCounterSub}>Máximo: {configRoom.capacidadNinos * modalHabitaciones}</Text>
                  </View>
                  <View style={s.mCounterActions}>
                    <TouchableOpacity style={s.mCounterBtn} onPress={() => setModalNinos(k => Math.max(0, k - 1))}>
                      <Text style={s.mCounterBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.mCounterVal}>{modalNinos}</Text>
                    <TouchableOpacity style={s.mCounterBtn} onPress={() => setModalNinos(k => Math.min(configRoom.capacidadNinos * modalHabitaciones, k + 1))}>
                      <Text style={s.mCounterBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Action buttons */}
              <View style={s.mActions}>
                <TouchableOpacity style={s.mSubmitBtn} onPress={confirmRoomSelection}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={s.mSubmitBtnText}>
                    {isRoomSelected(configRoom.id) ? 'Guardar configuración' : 'Agregar habitación'}
                  </Text>
                </TouchableOpacity>
                {isRoomSelected(configRoom.id) && (
                  <TouchableOpacity style={s.mDeleteBtn} onPress={() => removeRoomSelection(configRoom.id)}>
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  </TouchableOpacity>
                )}
              </View>

            </Pressable>
          </Pressable>
        </Modal>
      )}

    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  errorTitle: { fontSize: 18, fontWeight: '700', color: Colors.titulo },
  backBtn: { backgroundColor: Colors.titulo, borderRadius: BorderRadius.md, paddingVertical: 12, paddingHorizontal: Spacing.xl },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  subnav: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: Spacing.md },
  subnavTab: { paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  subnavTabActive: { borderBottomColor: Colors.titulo },
  subnavText: { fontSize: 12, color: Colors.subtitulo, fontWeight: '500' },
  subnavTextActive: { color: Colors.titulo, fontWeight: '700' },

  carousel: { position: 'relative' },
  carouselImg: { width: '100%', height: '100%' },
  carouselArrow: { position: 'absolute', top: '50%', backgroundColor: 'rgba(70,64,60,0.6)', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginTop: -20 },
  carouselLeft: { left: 12 },
  carouselRight: { right: 12 },
  carouselDots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 18 },
  carouselCounter: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  carouselBack: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(70,64,60,0.6)', borderRadius: 18, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  bodyContainer: { padding: Spacing.lg, gap: Spacing.lg },
  bodyContainerWide: { flexDirection: 'row', maxWidth: 1100, alignSelf: 'center', width: '100%' },
  
  mainColumn: { gap: Spacing.lg },
  sectionCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, ...Shadow.sm },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.titulo, marginBottom: Spacing.md, fontFamily: 'PlayfairDisplay-Bold' },
  sectionSubTitle: { fontSize: 15, fontWeight: '700', color: Colors.titulo, marginBottom: 6 },
  horizontalDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },

  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.md },
  name: { fontSize: 22, fontWeight: '700', color: Colors.titulo, fontFamily: 'PlayfairDisplay-Bold' },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 4 },
  starsLabel: { fontSize: 11, color: Colors.subtitulo },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText: { fontSize: 13, color: Colors.subtitulo, flex: 1 },
  desc: { fontSize: 13, color: Colors.extra1, lineHeight: 20 },
  readMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'flex-start' },
  readMoreText: { fontSize: 12, fontWeight: '700', color: Colors.titulo },

  ratingBox: { backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, padding: 10, alignItems: 'center', minWidth: 60, borderWidth: 1, borderColor: Colors.accentBorder },
  ratingNum: { fontSize: 22, fontWeight: '800', color: Colors.titulo },
  ratingLabel: { fontSize: 11, fontWeight: '600', color: Colors.titulo },
  ratingCount: { fontSize: 10, color: Colors.subtitulo },

  emptyText: { fontSize: 13, fontStyle: 'italic', color: Colors.textMuted },
  
  roomCard: { borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: Spacing.md, backgroundColor: Colors.surface },
  roomImgContainer: { position: 'relative' },
  roomImg: { width: '100%', height: '100%', minHeight: 140 },
  roomPhotoCount: { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 3, flexDirection: 'row', alignItems: 'center' },
  roomPhotoCountText: { fontSize: 9, color: '#fff', fontWeight: '600' },
  roomBody: { flex: 1, padding: Spacing.md, gap: Spacing.sm },
  roomName: { fontSize: 15, fontWeight: '700', color: Colors.titulo },
  roomMetaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roomMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3, width: '45%' },
  roomMetaText: { fontSize: 11, color: Colors.subtitulo },
  roomFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 },
  roomPriceLabel: { fontSize: 11, color: Colors.textMuted },
  roomPrice: { fontSize: 18, fontWeight: '800', color: Colors.titulo },
  roomCurrency: { fontSize: 12, fontWeight: '500', color: Colors.subtitulo },
  roomAvail: { fontSize: 11, color: '#27ae60', marginTop: 2 },
  roomSelectBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.sm, borderWidth: 1.5, borderColor: Colors.titulo },
  roomSelectBtnActive: { backgroundColor: Colors.titulo },
  roomSelectText: { fontSize: 12, fontWeight: '700', color: Colors.titulo },

  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  amenityCell: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 140 },
  amenityText: { fontSize: 13, color: Colors.extra1 },

  mapContainer: { height: 180, borderRadius: BorderRadius.md, overflow: 'hidden', position: 'relative', marginBottom: 12 },
  mapImg: { width: '100%', height: '100%' },
  mapPin: { position: 'absolute', top: '40%', left: '40%', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.9)', padding: 6, borderRadius: 6, borderWidth: 1, borderColor: Colors.border },
  mapPinText: { fontSize: 11, fontWeight: '700', color: Colors.extra1 },
  locCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, padding: Spacing.sm, borderRadius: BorderRadius.sm },

  reviewsSummarySingle: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryLight, padding: 12, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
  rssPill: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.titulo, alignItems: 'center', justifyContent: 'center' },
  rssPillText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  rssInfo: { flex: 1, marginLeft: 12 },
  rssWord: { fontSize: 14, fontWeight: '700', color: Colors.titulo },
  rssTotal: { fontSize: 11, color: Colors.subtitulo, marginTop: 2 },
  rssTrack: { height: 4, backgroundColor: 'rgba(198,177,125,0.3)', borderRadius: 2, marginTop: 6 },
  rssBar: { height: '100%', backgroundColor: Colors.titulo, borderRadius: 2 },

  reviewCard: { paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  reviewAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.titulo, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  reviewAuthor: { fontSize: 13, fontWeight: '600', color: Colors.extra1 },
  reviewDate: { fontSize: 11, color: Colors.textMuted },
  reviewScoreBox: { backgroundColor: '#27ae60', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  reviewScoreText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  reviewContent: { marginTop: Spacing.sm, gap: 4 },
  reviewTextRow: { flexDirection: 'row', gap: 6 },
  reviewText: { fontSize: 12, color: Colors.subtitulo, flex: 1, lineHeight: 18 },

  sidebarColumn: { width: '100%' },
  sidebarColumnWide: { marginLeft: Spacing.lg },
  bookingCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.accentBorder, padding: Spacing.md, ...Shadow.md },
  bcTitle: { fontSize: 16, fontWeight: '700', color: Colors.titulo, marginBottom: Spacing.md, fontFamily: 'PlayfairDisplay-Bold' },
  bcDatesGrid: { flexDirection: 'row', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, overflow: 'hidden', marginBottom: Spacing.md },
  bcDateCell: { flex: 1, padding: 10, backgroundColor: '#fff', alignItems: 'center' },
  bcDateLabel: { fontSize: 9, fontWeight: '600', color: Colors.subtitulo, textTransform: 'uppercase' },
  bcDateVal: { fontSize: 13, fontWeight: '700', color: Colors.extra1, marginTop: 3 },
  guestStatusTrack: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: 12, gap: 6, marginBottom: Spacing.md },
  gstRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gstLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: Colors.subtitulo },
  gstVal: { fontSize: 12, fontWeight: '700', color: Colors.titulo },
  gstDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 2 },
  gstSubRow: { flexDirection: 'row', justifyContent: 'space-between' },
  gstSubLabel: { fontSize: 11, color: Colors.extra1 },
  gstSubVal: { fontSize: 11, fontWeight: '700' },
  statusPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, borderRadius: 6, marginTop: 4 },
  statusPillOk: { backgroundColor: '#eaf7ee' },
  statusPillErr: { backgroundColor: '#fdeaea' },
  statusPillText: { fontSize: 10, fontWeight: '600' },

  breakdown: { gap: 6, marginBottom: Spacing.md },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bdLabel: { fontSize: 12, color: Colors.subtitulo },
  bdVal: { fontSize: 12, color: Colors.extra1, fontWeight: '500' },
  bdDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  bdTotalLabel: { fontSize: 14, fontWeight: '700', color: Colors.titulo },
  bdTotalVal: { fontSize: 18, fontWeight: '800', color: Colors.titulo },
  disclaimer: { fontSize: 10, color: Colors.textMuted, textAlign: 'center', marginTop: 6 },
  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.titulo, borderRadius: BorderRadius.md, paddingVertical: 12, ...Shadow.sm },
  bookBtnDisabled: { backgroundColor: 'rgba(96,98,86,0.3)', elevation: 0 },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: Colors.bg, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.accentBorder, ...Shadow.lg },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 6 },
  mTitle: { fontSize: 15, fontWeight: '700', color: Colors.titulo, flex: 1, fontFamily: 'PlayfairDisplay-Bold' },
  mClose: { padding: 2 },
  mCarousel: { height: 150, borderRadius: BorderRadius.md, overflow: 'hidden', position: 'relative', marginBottom: Spacing.sm },
  mCarouselImg: { width: '100%', height: '100%' },
  mCarouselArrow: { position: 'absolute', top: '50%', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginTop: -14 },
  mCarouselLeft: { left: 8 },
  mCarouselRight: { right: 8 },
  mSpecs: { flexDirection: 'row', gap: 6, marginBottom: Spacing.md },
  mSpecPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.surface, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: Colors.border },
  mSpecText: { fontSize: 10, color: Colors.subtitulo },
  mCounters: { gap: 12, marginBottom: Spacing.md },
  mCounterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mCounterLabel: { fontSize: 13, fontWeight: '700', color: Colors.titulo },
  mCounterSub: { fontSize: 10, color: Colors.subtitulo, marginTop: 1 },
  mCounterActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mCounterBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.accentBorder, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  mCounterBtnText: { fontSize: 15, fontWeight: '700', color: Colors.titulo },
  mCounterVal: { fontSize: 14, fontWeight: '700', width: 20, textAlign: 'center', color: Colors.extra1 },
  mActions: { flexDirection: 'row', gap: 8 },
  mSubmitBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.titulo, borderRadius: BorderRadius.md, paddingVertical: 12 },
  mSubmitBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  mDeleteBtn: { paddingHorizontal: 12, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.error, alignItems: 'center', justifyContent: 'center' },
});
