import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { getLodgingById, getRooms } from '../../services/lodging.service';
import { Lodging, Room } from '../../types/lodging.types';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';

function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array(5).fill(0).map((_, i) => <Text key={i} style={{ fontSize: size, color: i < n ? '#F5C518' : 'rgba(198,177,125,0.3)' }}>★</Text>)}
    </View>
  );
}

function RoomCard({ room, onReservar, llegada, salida, adultos, ninos }: { room: Room; onReservar: () => void; llegada: string; salida: string; adultos: string; ninos: string }) {
  const nights = (() => {
    if (!llegada || !salida) return 1;
    const diff = new Date(salida).getTime() - new Date(llegada).getTime();
    return Math.max(1, Math.round(diff / 86400000));
  })();
  const total = room.precio * nights;

  return (
    <View style={rc.card}>
      {room.imagen && <Image source={{ uri: room.imagen }} style={rc.img} resizeMode="cover" />}
      <View style={rc.body}>
        <Text style={rc.name}>{room.nombre}</Text>
        <Text style={rc.desc} numberOfLines={2}>{room.descripcion}</Text>

        <View style={rc.chips}>
          {room.capacidad && <View style={rc.chip}><Ionicons name="people-outline" size={12} color={Colors.titulo} /><Text style={rc.chipText}>{room.capacidad} personas</Text></View>}
          {room.camas && <View style={rc.chip}><Ionicons name="bed-outline" size={12} color={Colors.titulo} /><Text style={rc.chipText}>{room.camas}</Text></View>}
          {room.servicios?.slice(0,3).map(sv => <View key={sv} style={rc.chip}><Text style={rc.chipText}>{sv}</Text></View>)}
        </View>

        <View style={rc.footer}>
          <View>
            <Text style={rc.desde}>desde</Text>
            <Text style={rc.price}><Text style={{ fontSize: 14 }}>$</Text>{room.precio} <Text style={{ fontSize: 13, color: Colors.subtitulo }}>USD/noche</Text></Text>
            {nights > 1 && <Text style={rc.totalNights}>Total {nights} noches: <Text style={{ fontWeight: '700' }}>${total.toFixed(2)}</Text></Text>}
          </View>
          <TouchableOpacity style={rc.btn} onPress={onReservar} activeOpacity={0.85}>
            <Text style={rc.btnText}>Reservar</Text>
            <Ionicons name="arrow-forward" size={15} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const rc = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: Spacing.md, ...Shadow.sm },
  img: { width: '100%', height: 180 },
  body: { padding: Spacing.md, gap: Spacing.sm },
  name: { fontSize: 17, fontWeight: '700', color: Colors.titulo },
  desc: { fontSize: 13, color: Colors.subtitulo, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: Colors.primaryLight },
  chipText: { fontSize: 11, color: Colors.titulo },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  desde: { fontSize: 11, color: Colors.textMuted },
  price: { fontSize: 20, fontWeight: '800', color: Colors.titulo },
  totalNights: { fontSize: 12, color: Colors.subtitulo },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.titulo, borderRadius: BorderRadius.md, paddingVertical: 10, paddingHorizontal: 16 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LodgingDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; provider?: string; llegada?: string; salida?: string; adultos?: string; ninos?: string }>();

  const [lodging, setLodging] = useState<Lodging | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (!params.id || !params.provider) { router.back(); return; }
    Promise.all([
      getLodgingById(params.id, params.provider),
      getRooms(params.id, params.provider, { llegada: params.llegada, salida: params.salida, adultos: params.adultos ? +params.adultos : undefined, ninos: params.ninos ? +params.ninos : undefined }),
    ]).then(([l, r]) => { setLodging(l); setRooms(r); setLoading(false); });
  }, [params.id]);

  if (loading) {
    return (
      <View style={s.root}>
        <Navbar />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md }}>
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md }}>
          <Ionicons name="alert-circle-outline" size={52} color={Colors.error} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.titulo }}>Alojamiento no encontrado</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>Volver a resultados</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const images = [lodging.imagen, ...(lodging.imagenes ?? [])].filter(Boolean) as string[];

  return (
    <View style={s.root}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Image Carousel */}
        <View style={s.carousel}>
          <Image source={{ uri: images[imgIdx] || lodging.imagen }} style={s.carouselImg} resizeMode="cover" />
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
          <TouchableOpacity style={s.carouselBack} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={s.body}>
          {/* Header */}
          <View style={s.headerSection}>
            <View style={s.headerTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{lodging.nombre}</Text>
                <Stars n={lodging.categoria} size={16} />
                {lodging.calidad && <Text style={s.calidad}>{lodging.calidad}</Text>}
              </View>
              {lodging.valoracion > 0 && (
                <View style={s.ratingBox}>
                  <Text style={s.ratingNum}>{lodging.valoracion.toFixed(1)}</Text>
                  <Text style={s.ratingLabel}>{lodging.ratingTexto}</Text>
                  <Text style={s.ratingCount}>{lodging.reviewsCount} val.</Text>
                </View>
              )}
            </View>

            <View style={s.location}>
              <Ionicons name="location-outline" size={15} color={Colors.extra2} />
              <Text style={s.locationText}>{lodging.direccion}</Text>
            </View>

            <Text style={s.desc}>{lodging.descripcion}</Text>
          </View>

          {/* Meta info */}
          <View style={s.metaRow}>
            {lodging.checkIn && <MetaItem icon="log-in-outline" label={`Check-in: ${lodging.checkIn}`} />}
            {lodging.checkOut && <MetaItem icon="log-out-outline" label={`Check-out: ${lodging.checkOut}`} />}
            {lodging.habitacionesDisponibles && <MetaItem icon="bed-outline" label={`${lodging.habitacionesDisponibles} habitaciones disponibles`} highlight />}
          </View>

          {/* Services */}
          {lodging.servicios?.length > 0 && (
            <View style={s.servicesSection}>
              <Text style={s.sectionTitle}>Instalaciones</Text>
              <View style={s.servicesGrid}>
                {lodging.servicios.map(sv => (
                  <View key={sv} style={s.serviceItem}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={Colors.titulo} />
                    <Text style={s.serviceText}>{sv}</Text>
                  </View>
                ))}
                {lodging.aceptaNinos && <View style={s.serviceItem}><Ionicons name="happy-outline" size={16} color="#2196f3" /><Text style={[s.serviceText, { color: '#2196f3' }]}>Acepta niños</Text></View>}
                {lodging.aceptaMascotas && <View style={s.serviceItem}><Ionicons name="paw-outline" size={16} color="#4caf50" /><Text style={[s.serviceText, { color: '#4caf50' }]}>Mascotas permitidas</Text></View>}
              </View>
            </View>
          )}

          {/* Rooms */}
          <View style={s.roomsSection}>
            <Text style={s.sectionTitle}>Habitaciones disponibles</Text>
            {rooms.length === 0
              ? <Text style={{ color: Colors.subtitulo, fontStyle: 'italic' }}>No hay habitaciones disponibles para las fechas seleccionadas.</Text>
              : rooms.map(r => (
                  <RoomCard
                    key={r.id}
                    room={r}
                    llegada={params.llegada ?? ''}
                    salida={params.salida ?? ''}
                    adultos={params.adultos ?? '2'}
                    ninos={params.ninos ?? '0'}
                    onReservar={() => router.push({
                      pathname: '/alojamiento/[id]/reservar',
                      params: { id: params.id!, provider: params.provider!, roomId: r.id, roomName: r.nombre, precio: String(r.precio), llegada: params.llegada ?? '', salida: params.salida ?? '', adultos: params.adultos ?? '2', ninos: params.ninos ?? '0' }
                    })}
                  />
                ))
            }
          </View>

          {/* Reviews */}
          {lodging.reviews && lodging.reviews.length > 0 && (
            <View style={s.reviewsSection}>
              <Text style={s.sectionTitle}>Opiniones de los huéspedes</Text>
              {lodging.reviews.slice(0, 5).map((r, i) => (
                <View key={i} style={s.reviewCard}>
                  <View style={s.reviewHeader}>
                    <View style={s.reviewAvatar}><Text style={s.reviewAvatarText}>{(r.nombre || 'H')[0]?.toUpperCase()}</Text></View>
                    <View>
                      <Text style={s.reviewAuthor}>{r.nombre}</Text>
                      <Stars n={r.score} size={12} />
                    </View>
                    {r.fecha && <Text style={s.reviewDate}>{r.fecha}</Text>}
                  </View>
                  <Text style={s.reviewText}>{r.positivo}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Footer />
      </ScrollView>
    </View>
  );
}

function MetaItem({ icon, label, highlight = false }: { icon: any; label: string; highlight?: boolean }) {
  return (
    <View style={[s.metaItem, highlight && s.metaItemHighlight]}>
      <Ionicons name={icon} size={14} color={highlight ? Colors.titulo : Colors.subtitulo} />
      <Text style={[s.metaText, highlight && { color: Colors.titulo, fontWeight: '600' }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1 },

  carousel: { position: 'relative', height: Platform.OS === 'web' ? 450 : 280 },
  carouselImg: { width: '100%', height: '100%' },
  carouselArrow: { position: 'absolute', top: '50%', backgroundColor: 'rgba(70,64,60,0.6)', borderRadius: 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -22 },
  carouselLeft: { left: 12 },
  carouselRight: { right: 12 },
  carouselDots: { position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 20 },
  carouselBack: { position: 'absolute', top: 14, left: 14, backgroundColor: 'rgba(70,64,60,0.6)', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  body: { padding: Spacing.lg, gap: Spacing.xl, maxWidth: Platform.OS === 'web' ? 900 : undefined, alignSelf: Platform.OS === 'web' ? 'center' : undefined, width: '100%' },

  headerSection: { gap: Spacing.sm },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.md },
  name: { fontSize: Platform.OS === 'web' ? 28 : 22, fontWeight: '700', color: Colors.titulo, marginBottom: 4 },
  calidad: { fontSize: 13, color: Colors.extra2, fontWeight: '500', marginTop: 2 },
  ratingBox: { backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', minWidth: 64, borderWidth: 1, borderColor: Colors.accentBorder },
  ratingNum: { fontSize: 24, fontWeight: '800', color: Colors.titulo },
  ratingLabel: { fontSize: 11, fontWeight: '600', color: Colors.titulo },
  ratingCount: { fontSize: 10, color: Colors.subtitulo },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 14, color: Colors.subtitulo, flex: 1 },
  desc: { fontSize: 14, color: Colors.extra1, lineHeight: 22 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  metaItemHighlight: { backgroundColor: Colors.primaryLight, borderColor: Colors.accentBorder },
  metaText: { fontSize: 13, color: Colors.subtitulo },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.titulo, marginBottom: Spacing.sm },
  servicesSection: { gap: Spacing.sm },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  serviceItem: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 140 },
  serviceText: { fontSize: 13, color: Colors.extra1 },

  roomsSection: { gap: Spacing.sm },

  reviewsSection: { gap: Spacing.md },
  reviewCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.titulo, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  reviewAuthor: { fontSize: 14, fontWeight: '600', color: Colors.extra1 },
  reviewDate: { fontSize: 11, color: Colors.textMuted, marginLeft: 'auto' as any },
  reviewText: { fontSize: 13, color: Colors.subtitulo, lineHeight: 18 },

  backBtn: { backgroundColor: Colors.titulo, borderRadius: BorderRadius.md, paddingVertical: 12, paddingHorizontal: Spacing.xl },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
