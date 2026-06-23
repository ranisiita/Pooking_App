import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, ActivityIndicator,
  Platform, TouchableOpacity, Dimensions, useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { AtraccionesService, getProviderCompanyName } from '../../services/atracciones.service';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { getStorageItem, setStorageItem } from '../../services/storage';

const { width } = Dimensions.get('window');

interface Ticket {
  tck_guid: string;
  tipo: string;
  precio: number;
  moneda: string;
}

interface AttractionDetail {
  id: string;
  nombre: string;
  tipo_nombre: string;
  subtipo_nombre?: string;
  ciudad: string;
  pais: string;
  descripcion_corta: string;
  descripcion: string;
  duracion_minutos: number;
  calificacion: number;
  total_resenas: number;
  precio_desde: number;
  moneda: string;
  imagen_principal: string;
  imagenes?: string[];
  punto_encuentro?: string;
  incluye_transporte: boolean;
  incluye_acompaniante: boolean;
  incluye: string[];
  no_incluye: string[];
  etiquetas?: string[];
  tickets: Ticket[];
  disponibilidad: {
    disponible: boolean;
    disponible_hoy: boolean;
    cupos_disponibles?: number;
    proxima_fecha_disponible?: string;
  };
  provider: string;
}

export default function AttractionDetailScreen() {
  const router = useRouter();
  const { id, provider } = useLocalSearchParams<{ id: string; provider: string }>();

  const [containerWidth, setContainerWidth] = useState(0);
  const isWide = containerWidth >= 850;

  const [detalle, setDetalle] = useState<AttractionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    async function loadAttractionDetail() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const prov = (provider as any) || 'jhonatan';
        const res = await AtraccionesService.getAtraccionDetalle(id, prov);
        if (!res || !res.data) {
          setError('No pudimos encontrar los detalles de esta atracción.');
        } else {
          setDetalle(res.data);
          setActiveImage(res.data.imagen_principal);
        }
      } catch (err) {
        console.error(err);
        setError('Ocurrió un error al cargar la experiencia.');
      } finally {
        setLoading(false);
      }
    }
    loadAttractionDetail();
  }, [id, provider]);

  const gallery = useMemo(() => {
    if (!detalle) return [];
    const set = new Set<string>();
    if (detalle.imagen_principal) set.add(detalle.imagen_principal);
    if (detalle.imagenes) {
      detalle.imagenes.forEach(img => set.add(img));
    }
    return Array.from(set);
  }, [detalle]);

  const handleReservar = async () => {
    if (!detalle) return;
    await setStorageItem('attraction-selected', JSON.stringify(detalle));
    router.push({
      pathname: '/atracciones/[id]/reservar',
      params: { id: detalle.id, provider: detalle.provider }
    });
  };

  const formatDuration = (minutos: number) => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    if (h === 0) return `${m} min`;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  if (loading) {
    return (
      <View style={s.root}>
        <Navbar />
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={Colors.titulo} />
          <Text style={s.loadingText}>Cargando experiencia...</Text>
        </View>
        <Footer />
      </View>
    );
  }

  if (error || !detalle) {
    return (
      <View style={s.root}>
        <Navbar />
        <View style={s.errorBox}>
          <Ionicons name="alert-circle-outline" size={54} color={Colors.error} />
          <Text style={s.errorTitle}>Error al cargar</Text>
          <Text style={s.errorText}>{error || 'Atracción no encontrada.'}</Text>
          <TouchableOpacity style={s.btnBack} onPress={() => router.push('/atracciones' as any)}>
            <Text style={s.btnBackText}>Volver al listado</Text>
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
        <View style={[s.hero, !isWide && s.heroMobile]}>
          <Image
            source={{ uri: activeImage || detalle.imagen_principal }}
            style={s.heroImage}
            resizeMode="cover"
          />
          <View style={s.heroOverlay} />

          <View style={s.heroContainer}>
            <View style={s.breadcrumbRow}>
              <TouchableOpacity style={s.heroBackBtn} onPress={() => router.push('/atracciones' as any)}>
                <Ionicons name="arrow-back" size={16} color="#fff" />
                <Text style={s.heroBackText}>Volver</Text>
              </TouchableOpacity>
              {isWide && (
                <Text style={s.breadcrumbText}>Atracciones  /  {detalle.tipo_nombre}  /  {detalle.nombre}</Text>
              )}
            </View>

            <View style={s.heroInfo}>
              <View style={s.badges}>
                <View style={s.badge}><Text style={s.badgeText}>{detalle.tipo_nombre}</Text></View>
                {detalle.subtipo_nombre && <View style={s.badge}><Text style={s.badgeText}>{detalle.subtipo_nombre}</Text></View>}
                <View style={[s.badge, detalle.disponibilidad?.disponible ? s.badgeOk : s.badgeWarn]}>
                  <Text style={s.badgeText}>
                    {detalle.disponibilidad?.disponible ? 'Disponible' : 'Sin cupos'}
                  </Text>
                </View>
              </View>
              <Text style={[s.atrTitle, !isWide && s.atrTitleMobile]}>{detalle.nombre}</Text>
              <Text style={s.atrSub}>
                <Ionicons name="location-outline" size={14} color="#fff" />
                {' '}{detalle.ciudad}, {detalle.pais}
              </Text>
              {isWide && (
                <Text style={s.atrSummary} numberOfLines={2}>{detalle.descripcion_corta}</Text>
              )}

              <View style={s.heroMeta}>
                <View style={s.metaItem}>
                  <Ionicons name="star" size={14} color={Colors.star} />
                  <Text style={s.metaTextBold}>{detalle.calificacion.toFixed(1)} <Text style={s.metaTextNormal}>({detalle.total_resenas} reseñas)</Text></Text>
                </View>
                <View style={s.metaItem}>
                  <Ionicons name="time-outline" size={14} color="#fff" />
                  <Text style={s.metaTextNormal}>{formatDuration(detalle.duracion_minutos)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Body Layout */}
        <View 
          style={[s.bodyLayout, { flexDirection: isWide ? 'row' : 'column' }]}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          {/* Main Info Left Column */}
          <View style={[s.leftCol, isWide ? { flex: 2 } : s.leftColMobile]}>
            {/* Description */}
            <View style={s.infoCard}>
              <View style={s.cardHeader}>
                <Ionicons name="document-text-outline" size={18} color={Colors.titulo} />
                <Text style={s.cardTitle}>Sobre esta experiencia</Text>
              </View>
              <Text style={s.cardDescText}>{detalle.descripcion}</Text>
              
              {detalle.etiquetas && detalle.etiquetas.length > 0 && (
                <View style={s.tagsGrid}>
                  {detalle.etiquetas.map(et => (
                    <View key={et} style={s.tagChip}>
                      <Ionicons name="pricetag-outline" size={12} color={Colors.titulo} />
                      <Text style={s.tagChipText}>{et}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Gallery Thumbs */}
            {gallery.length > 1 && (
              <View style={s.infoCard}>
                <View style={s.cardHeader}>
                  <Ionicons name="images-outline" size={18} color={Colors.titulo} />
                  <Text style={s.cardTitle}>Galería de imágenes</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbsGrid}>
                  {gallery.map((img, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[s.thumbWrap, activeImage === img && s.thumbWrapActive]}
                      onPress={() => setActiveImage(img)}
                    >
                      <Image source={{ uri: img }} style={s.thumbImage} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Inclusions / Exclusions */}
            <View style={s.infoCard}>
              <View style={s.cardHeader}>
                <Ionicons name="checkmark-done-circle-outline" size={18} color={Colors.titulo} />
                <Text style={s.cardTitle}>Qué incluye la experiencia</Text>
              </View>

              <View style={[s.inclusionsGrid, { flexDirection: isWide ? 'row' : 'column' }]}>
                {/* Includes */}
                <View style={[s.inclusionsCol, isWide && { flex: 1 }]}>
                  <View style={s.incHeaderRow}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                    <Text style={[s.incHeaderText, { color: Colors.success }]}>Incluye</Text>
                  </View>
                  {detalle.incluye && detalle.incluye.length > 0 ? (
                    <View style={s.incList}>
                      {detalle.incluye.map((it, idx) => (
                        <Text key={idx} style={s.incItem}>✓ {it}</Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={s.incEmpty}>No especificado.</Text>
                  )}
                </View>

                {/* Excludes */}
                <View style={[s.inclusionsCol, isWide && { flex: 1 }]}>
                  <View style={s.incHeaderRow}>
                    <Ionicons name="close-circle" size={14} color={Colors.error} />
                    <Text style={[s.incHeaderText, { color: Colors.error }]}>No incluye</Text>
                  </View>
                  {detalle.no_incluye && detalle.no_incluye.length > 0 ? (
                    <View style={s.incList}>
                      {detalle.no_incluye.map((it, idx) => (
                        <Text key={idx} style={s.incItem}>✗ {it}</Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={s.incEmpty}>No especificado.</Text>
                  )}
                </View>
              </View>

              {/* Transportation badges */}
              <View style={s.logisticRow}>
                <View style={[s.logPill, detalle.incluye_transporte && s.logPillActive]}>
                  <Ionicons name="bus-outline" size={14} color={detalle.incluye_transporte ? Colors.titulo : Colors.subtitulo} />
                  <Text style={[s.logPillText, detalle.incluye_transporte && { color: Colors.titulo }]}>
                    {detalle.incluye_transporte ? 'Transporte incluido' : 'Sin transporte'}
                  </Text>
                </View>
                <View style={[s.logPill, detalle.incluye_acompaniante && s.logPillActive]}>
                  <Ionicons name="people-outline" size={14} color={detalle.incluye_acompaniante ? Colors.titulo : Colors.subtitulo} />
                  <Text style={[s.logPillText, detalle.incluye_acompaniante && { color: Colors.titulo }]}>
                    {detalle.incluye_acompaniante ? 'Guía acompañante' : 'Sin acompañante'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Meeting point */}
            {detalle.punto_encuentro ? (
              <View style={s.infoCard}>
                <View style={s.cardHeader}>
                  <Ionicons name="flag-outline" size={18} color={Colors.titulo} />
                  <Text style={s.cardTitle}>Punto de encuentro</Text>
                </View>
                <Text style={s.meetingText}>
                  <Ionicons name="pin" size={14} color={Colors.titulo} />
                  {' '}{detalle.punto_encuentro}
                </Text>
              </View>
            ) : null}

            {/* Ticket types available */}
            {detalle.tickets && detalle.tickets.length > 0 ? (
              <View style={s.infoCard}>
                <View style={s.cardHeader}>
                  <Ionicons name="ticket-outline" size={18} color={Colors.titulo} />
                  <Text style={s.cardTitle}>Tickets disponibles</Text>
                </View>
                <View style={s.ticketsList}>
                  {detalle.tickets.map(t => (
                    <View key={t.tck_guid} style={[s.ticketRow, !isWide && s.ticketRowMobile, !isWide && { padding: Spacing.md }]}>
                      <View style={[s.ticketLeft, isWide && { flex: 1 }]}>
                        <Ionicons name="ticket-outline" size={18} color={Colors.titulo} style={{ marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.ticketType}>{t.tipo}</Text>
                          <Text style={s.ticketId}>ID: {t.tck_guid}</Text>
                        </View>
                      </View>
                      <Text style={[s.ticketPrice, !isWide && s.ticketPriceMobile]}>
                        ${t.precio.toFixed(2)} <Text style={s.ticketCurr}>{t.moneda}</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          {/* Sticky booking Card Right Column */}
          <View style={[s.rightCol, isWide ? { flex: 1 } : s.rightColMobile]}>
            <View style={s.stickyCard}>
              <View style={s.stickyPriceBlock}>
                <Text style={s.stickyPriceLabel}>Desde</Text>
                <Text style={s.stickyPriceValue}>${detalle.precio_desde.toFixed(2)} <Text style={s.stickyPriceCurr}>{detalle.moneda}</Text></Text>
                <Text style={s.stickyPriceSub}>por persona</Text>
              </View>

              <View style={s.stickySummary}>
                <View style={s.summaryRow}>
                  <Ionicons name="time-outline" size={15} color={Colors.subtitulo} />
                  <Text style={s.summaryRowText}>{formatDuration(detalle.duracion_minutos)}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Ionicons name="star" size={15} color={Colors.star} />
                  <Text style={s.summaryRowText}>{detalle.calificacion.toFixed(1)} · {detalle.total_resenas} reseñas</Text>
                </View>
              </View>

              <View style={[s.availBadge, detalle.disponibilidad?.disponible ? s.availBadgeOk : s.availBadgeWarn]}>
                <Ionicons name={detalle.disponibilidad?.disponible ? "checkmark-circle" : "close-circle"} size={16} color={detalle.disponibilidad?.disponible ? Colors.success : Colors.error} />
                <View>
                  <Text style={[s.availText, detalle.disponibilidad?.disponible ? { color: Colors.success } : { color: Colors.error }]}>
                    {detalle.disponibilidad?.disponible_hoy ? 'Disponible hoy' : detalle.disponibilidad?.disponible ? 'Disponible' : 'Sin cupos'}
                  </Text>
                  {detalle.disponibilidad?.cupos_disponibles !== undefined && (
                    <Text style={s.availSub}>{detalle.disponibilidad.cupos_disponibles} cupos restantes</Text>
                  )}
                  {detalle.disponibilidad?.proxima_fecha_disponible && (
                    <Text style={s.availSub}>Próxima: {detalle.disponibilidad.proxima_fecha_disponible}</Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[s.btnReserve, !detalle.disponibilidad?.disponible && { opacity: 0.6 }]}
                disabled={!detalle.disponibilidad?.disponible}
                onPress={handleReservar}
                activeOpacity={0.85}
              >
                <Ionicons name="calendar-outline" size={18} color="#fff" />
                <Text style={s.btnReserveText}>Reservar ahora</Text>
              </TouchableOpacity>
              
              <Text style={s.stickyFootText}>✓ Proveedor: {getProviderCompanyName(detalle.provider)}</Text>
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

  // Loading / Error
  loadingBox: { flex: 1, padding: Spacing.xxl, alignItems: 'center', justifyContent: 'center', minHeight: 400 },
  loadingText: { color: Colors.subtitulo, fontSize: 13, marginTop: 8 },
  errorBox: { flex: 1, padding: Spacing.xxl, alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: Spacing.md },
  errorTitle: { fontSize: 18, fontWeight: '700', color: Colors.titulo },
  errorText: { fontSize: 14, color: Colors.subtitulo, textAlign: 'center' },
  btnBack: { backgroundColor: Colors.titulo, paddingVertical: 10, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.sm },
  btnBackText: { color: '#fff', fontWeight: '700' },

  // Hero section
  hero: {
    height: 280,
    backgroundColor: '#8E5A54',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  heroMobile: {
    minHeight: 240,
    height: undefined,
    paddingTop: Spacing.lg + 20,
    paddingBottom: Spacing.md,
  },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.48)' },
  heroContainer: {
    zIndex: 2,
    padding: Spacing.md,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  breadcrumbRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  heroBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: BorderRadius.sm,
    paddingVertical: 5,
    paddingHorizontal: Spacing.sm,
  },
  heroBackText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  breadcrumbText: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  heroInfo: { gap: Spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: BorderRadius.sm },
  badgeOk: { backgroundColor: Colors.success },
  badgeWarn: { backgroundColor: Colors.error },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  atrTitle: { fontSize: 26, fontWeight: '700', color: '#fff' },
  atrTitleMobile: { fontSize: 20 },
  atrSub: { fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  atrSummary: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.xs },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTextBold: { color: '#fff', fontSize: 12, fontWeight: '700' },
  metaTextNormal: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '400' },

  // Body layout
  bodyLayout: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  leftCol: { gap: Spacing.md },
  leftColMobile: { width: '100%' },
  rightCol: { minWidth: 280 },
  rightColMobile: { width: '100%', minWidth: 0 },

  // Info card styling
  infoCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: 1.5, borderBottomColor: Colors.border, paddingBottom: Spacing.xs, marginBottom: Spacing.xs },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.titulo },
  cardDescText: { fontSize: 13, color: Colors.extra1, lineHeight: 20 },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: 'rgba(142,90,84,0.15)', borderRadius: BorderRadius.sm, paddingVertical: 4, paddingHorizontal: 8 },
  tagChipText: { fontSize: 11, color: Colors.titulo, fontWeight: '600' },

  // Thumbs list
  thumbsGrid: { gap: Spacing.xs },
  thumbWrap: { width: 60, height: 45, borderRadius: BorderRadius.sm, borderWidth: 1.5, borderColor: 'transparent', overflow: 'hidden' },
  thumbWrapActive: { borderColor: Colors.titulo },
  thumbImage: { width: '100%', height: '100%' },

  // Inclusions grid
  inclusionsGrid: { gap: Spacing.md },
  inclusionsCol: { gap: Spacing.xs },
  incHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.xs },
  incHeaderText: { fontSize: 13, fontWeight: '700' },
  incList: { gap: Spacing.xs },
  incItem: { fontSize: 12, color: Colors.extra1 },
  incEmpty: { fontSize: 11, color: Colors.subtitulo },
  logisticRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  logPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingVertical: 5, paddingHorizontal: 10 },
  logPillActive: { borderColor: Colors.titulo, backgroundColor: Colors.primaryLight },
  logPillText: { fontSize: 11, color: Colors.subtitulo, fontWeight: '600' },

  meetingText: { fontSize: 13, color: Colors.extra1 },

  // Tickets
  ticketsList: { gap: Spacing.sm },
  ticketRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, padding: Spacing.sm, backgroundColor: Colors.bg },
  ticketRowMobile: { flexDirection: 'column', alignItems: 'stretch', gap: 8 },
  ticketLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ticketType: { fontSize: 13, fontWeight: '700', color: Colors.extra1 },
  ticketId: { fontSize: 10, color: Colors.subtitulo, marginTop: 1 },
  ticketPrice: { fontSize: 14, fontWeight: '700', color: Colors.titulo },
  ticketPriceMobile: { alignSelf: 'flex-end', fontSize: 15 },
  ticketCurr: { fontSize: 10, fontWeight: '400', color: Colors.subtitulo },

  // Sticky Sidebar right
  stickyCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  stickyPriceBlock: { alignItems: 'center', gap: 1 },
  stickyPriceLabel: { fontSize: 10, fontWeight: '700', color: Colors.subtitulo, textTransform: 'uppercase' },
  stickyPriceValue: { fontSize: 24, fontWeight: '700', color: Colors.titulo },
  stickyPriceCurr: { fontSize: 14, fontWeight: '400' },
  stickyPriceSub: { fontSize: 11, color: Colors.subtitulo },
  stickySummary: { gap: Spacing.xs, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryRowText: { fontSize: 12, color: Colors.extra1 },
  availBadge: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, alignItems: 'center' },
  availBadgeOk: { backgroundColor: 'rgba(39, 174, 96, 0.08)', borderColor: 'rgba(39, 174, 96, 0.2)' },
  availBadgeWarn: { backgroundColor: 'rgba(192, 57, 43, 0.08)', borderColor: 'rgba(192, 57, 43, 0.2)' },
  availText: { fontSize: 13, fontWeight: '700' },
  availSub: { fontSize: 11, color: Colors.subtitulo, marginTop: 1 },
  btnReserve: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.titulo, paddingVertical: 12, borderRadius: BorderRadius.sm, ...Shadow.sm },
  btnReserveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  stickyFootText: { fontSize: 11, color: Colors.subtitulo, textAlign: 'center' },
});
