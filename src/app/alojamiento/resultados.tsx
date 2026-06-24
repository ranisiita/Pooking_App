import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, ActivityIndicator, Platform, Modal,
  ImageBackground, useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import CalendarModal from '../../components/CalendarModal';
import { buscarLodgings } from '../../services/lodging.service';
import { Lodging } from '../../types/lodging.types';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';

const ITEMS = 4;
const BG_NATIVE = require('../../../public/images/search_resultado_fondo.jpg');

function Stars({ n, size = 13 }: { n: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {Array(5).fill(0).map((_, i) => (
        <Text key={i} style={{ fontSize: size, color: i < n ? '#F5C518' : 'rgba(198,177,125,0.3)' }}>★</Text>
      ))}
    </View>
  );
}

const SERVICE_ICONS: Record<string, any> = {
  'Wifi': 'wifi-outline', 'Piscina': 'water-outline', 'Spa': 'sparkles-outline',
  'Gimnasio': 'barbell-outline', 'Restaurante': 'restaurant-outline',
  'Estacionamiento': 'car-outline', 'Desayuno': 'cafe-outline',
};

function HotelCard({ h, onPress, isWide }: { h: Lodging; onPress: () => void; isWide: boolean }) {
  const ratingElement = h.reviewsCount > 0 ? (
    <View style={c.ratingInline}>
      <Ionicons name="star" size={11} color="#f1c40f" />
      <Text style={c.ratingInlineText}>
        <Text style={{ fontWeight: '700', color: Colors.titulo }}>{h.valoracion?.toFixed(1)}</Text>
        {' '}{h.ratingTexto} ({h.reviewsCount})
      </Text>
    </View>
  ) : null;

  return (
    <TouchableOpacity style={[c.card, { flexDirection: isWide ? 'row' : 'column' }]} onPress={onPress} activeOpacity={0.92}>
      {/* Image column */}
      <View style={[c.imgWrap, { width: isWide ? 260 : '100%', height: isWide ? 'auto' : 200 }]}>
        {h.imagen
          ? <Image source={{ uri: h.imagen }} style={[c.img, { height: isWide ? 240 : 200 }]} resizeMode="cover" />
          : <View style={c.imgPlaceholder}><Ionicons name="bed-outline" size={40} color={Colors.extra2} /></View>}
        <View style={c.badgeTipo}><Text style={c.badgeTipoText}>{h.tipo}</Text></View>
        <View style={c.starsRow}><Stars n={h.categoria} /></View>
      </View>

      {/* Info column */}
      <View style={c.info}>
        <View style={c.top}>
          <Text style={c.name} numberOfLines={2}>{h.nombre}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
            {h.calidad ? <Text style={c.calidad}>{h.calidad}</Text> : null}
            {!isWide && ratingElement}
          </View>
        </View>

        <View style={c.locRow}>
          <Ionicons name="location-outline" size={13} color={Colors.extra2} />
          <Text style={c.locText} numberOfLines={1}>{h.direccion}</Text>
        </View>

        <Text style={c.desc} numberOfLines={2}>{h.descripcion}</Text>

        {/* Meta chips */}
        <View style={c.meta}>
          {isWide && h.checkIn ? <View style={c.metaItem}><Ionicons name="log-in-outline" size={13} color={Colors.subtitulo} /><Text style={c.metaText}>Check-in <Text style={c.metaBold}>{h.checkIn}</Text></Text></View> : null}
          {isWide && h.checkOut ? <View style={c.metaItem}><Ionicons name="log-out-outline" size={13} color={Colors.subtitulo} /><Text style={c.metaText}>Check-out <Text style={c.metaBold}>{h.checkOut}</Text></Text></View> : null}
          {h.habitacionesDisponibles ? <View style={[c.metaItem, c.metaHighlight]}><Ionicons name="bed-outline" size={13} color={Colors.titulo} /><Text style={[c.metaText, { color: Colors.titulo }]}><Text style={c.metaBold}>{h.habitacionesDisponibles}</Text> hab. disponibles</Text></View> : null}
        </View>

        {/* Service chips */}
        <View style={c.chips}>
          {['Wifi','Desayuno','Piscina','Spa','Restaurante','Gimnasio','Estacionamiento']
            .filter(sv => h.servicios?.includes(sv))
            .slice(0, isWide ? undefined : 3)
            .map(sv => (
              <View key={sv} style={c.chip}>
                <Ionicons name={SERVICE_ICONS[sv] || 'checkmark-circle-outline'} size={12} color={Colors.titulo} />
                <Text style={c.chipText}>{sv}</Text>
              </View>
            ))}
          {h.aceptaNinos && <View style={[c.chip, c.chipNinos]}><Ionicons name="happy-outline" size={12} color="#2196f3" /><Text style={[c.chipText, { color: '#2196f3' }]}>Niños</Text></View>}
          {h.aceptaMascotas && <View style={[c.chip, c.chipMascotas]}><Ionicons name="paw-outline" size={12} color="#4caf50" /><Text style={[c.chipText, { color: '#4caf50' }]}>Mascotas</Text></View>}
        </View>

        {/* Footer: rating + price + button */}
        {isWide ? (
          <View style={c.footer}>
            {h.reviewsCount > 0 ? (
              <View style={c.rating}>
                <Text style={[c.ratingNum, h.valoracion < 3.5 && { color: Colors.error }, h.valoracion < 4.5 && h.valoracion >= 3.5 && { color: Colors.extra2 }]}>
                  {h.valoracion?.toFixed(1)}
                </Text>
                <View>
                  <Text style={c.ratingLabel}>{h.ratingTexto}</Text>
                  <Text style={c.ratingCount}>{h.reviewsCount} valoraciones</Text>
                </View>
              </View>
            ) : (
              <Text style={c.noRating}>Sin valoraciones aún</Text>
            )}

            <View style={c.priceBlock}>
              <View>
                <Text style={c.desde}>desde</Text>
                <Text style={c.price}><Text style={c.priceDollar}>$</Text>{h.precio} <Text style={c.priceUSD}>USD</Text></Text>
                <Text style={c.noche}>por noche</Text>
              </View>
              <TouchableOpacity style={c.btnVer} onPress={onPress} activeOpacity={0.85}>
                <Text style={c.btnVerText}>Ver alojamiento</Text>
                <Ionicons name="arrow-forward" size={15} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={c.mobileFooter}>
            <View style={c.mobilePriceBlock}>
              <Text style={c.desde}>desde</Text>
              <Text style={c.price}>
                <Text style={c.priceDollar}>$</Text>{h.precio}
                <Text style={c.noche}>/noche</Text>
              </Text>
            </View>
            <TouchableOpacity style={c.btnVerMobile} onPress={onPress} activeOpacity={0.85}>
              <Text style={c.btnVerText}>Ver hotel</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function LodgingResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ destino?: string; llegada?: string; salida?: string; habitaciones?: string; adultos?: string; ninos?: string }>();
  const { width } = useWindowDimensions();
  const isWide = width >= 850;

  const [lodgings, setLodgings] = useState<Lodging[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState('recomendados');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Search Fields state (for editing search on this page)
  const [destinoSearch, setDestinoSearch] = useState(params.destino || '');
  const [llegadaSearch, setLlegadaSearch] = useState(params.llegada || '');
  const [salidaSearch, setSalidaSearch] = useState(params.salida || '');
  const [habitacionesSearch, setHabitacionesSearch] = useState(params.habitaciones || '1');
  const [adultosSearch, setAdultosSearch] = useState(params.adultos || '2');
  const [ninosSearch, setNinosSearch] = useState(params.ninos || '0');

  // Date Pickers state
  const [showLlegadaSearchPicker, setShowLlegadaSearchPicker] = useState(false);
  const [showSalidaSearchPicker, setShowSalidaSearchPicker] = useState(false);

  // Filters
  const [precioMin, setPrecioMin] = useState(0);
  const [precioMax, setPrecioMax] = useState(300);
  const [filtroNinos, setFiltroNinos] = useState(false);
  const [filtroMascotas, setFiltroMascotas] = useState(false);
  const [filtroEstrellas, setFiltroEstrellas] = useState<Record<number,boolean>>({ 5:false, 4:false, 3:false, 2:false, 1:false });
  const [filtroTipos, setFiltroTipos] = useState<Record<string,boolean>>({ Hotel:false, Hostal:false, Motel:false, Apartamento:false });

  // Sync state if URL changes
  useEffect(() => {
    setDestinoSearch(params.destino || '');
    setLlegadaSearch(params.llegada || '');
    setSalidaSearch(params.salida || '');
    setHabitacionesSearch(params.habitaciones || '1');
    setAdultosSearch(params.adultos || '2');
    setNinosSearch(params.ninos || '0');

    setLoading(true);
    buscarLodgings({
      destino: params.destino,
      fechaInicio: params.llegada,
      fechaFin: params.salida,
      adultos: params.adultos ? +params.adultos : undefined,
      ninos: params.ninos ? +params.ninos : undefined,
      habitaciones: params.habitaciones ? +params.habitaciones : undefined,
    })
      .then(data => { setLodgings(data); setLoading(false); })
      .catch(() => { setLodgings([]); setLoading(false); });
  }, [params.destino, params.llegada, params.salida, params.habitaciones, params.adultos, params.ninos]);

  const executeNewSearch = () => {
    router.setParams({
      destino: destinoSearch,
      llegada: llegadaSearch,
      salida: salidaSearch,
      habitaciones: habitacionesSearch,
      adultos: adultosSearch,
      ninos: ninosSearch,
    });
  };

  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return 'Seleccionar';
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    try {
      const [y, m, d] = dStr.split('-');
      return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
    } catch {
      return dStr;
    }
  };

  const filtered = useMemo(() => {
    let r = lodgings.filter(h => {
      if (h.precio < precioMin) return false;
      if (precioMax < 300 && h.precio > precioMax) return false;
      if (filtroNinos && !h.aceptaNinos) return false;
      if (filtroMascotas && !h.aceptaMascotas) return false;
      const eStr = Object.entries(filtroEstrellas).filter(([,v]) => v).map(([k]) => +k);
      if (eStr.length > 0 && !eStr.includes(h.categoria)) return false;
      const tipos = Object.entries(filtroTipos).filter(([,v]) => v).map(([k]) => k);
      if (tipos.length > 0 && !tipos.includes(h.tipo)) return false;
      return true;
    });
    if (sortOption === 'precio_asc') r.sort((a,b) => a.precio - b.precio);
    else if (sortOption === 'precio_desc') r.sort((a,b) => b.precio - a.precio);
    else if (sortOption === 'valoracion') r.sort((a,b) => b.valoracion - a.valoracion);
    else if (sortOption === 'nombre') r.sort((a,b) => a.nombre.localeCompare(b.nombre));
    else r.sort((a,b) => (b.valoracion*100 - b.precio) - (a.valoracion*100 - a.precio));
    return r;
  }, [lodgings, precioMin, precioMax, filtroNinos, filtroMascotas, filtroEstrellas, filtroTipos, sortOption]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS));
  const paged = filtered.slice((currentPage-1)*ITEMS, currentPage*ITEMS);

  const goDetail = (h: Lodging) => router.push({ pathname: '/alojamiento/[id]', params: { id: h.id, provider: h.provider, llegada: params.llegada ?? '', salida: params.salida ?? '', adultos: params.adultos ?? '2', ninos: params.ninos ?? '0' } });

  const activeTags = useMemo(() => {
    const tags = [];
    if (precioMin > 0 || precioMax < 300) {
      tags.push({ label: `$${precioMin} – $${precioMax}`, type: 'precio' });
    }
    Object.entries(filtroEstrellas).forEach(([k, v]) => {
      if (v) tags.push({ label: `${k} ★`, type: 'estrella', value: +k });
    });
    Object.entries(filtroTipos).forEach(([k, v]) => {
      if (v) tags.push({ label: k, type: 'tipo', value: k });
    });
    if (filtroNinos) tags.push({ label: 'Acepta niños', type: 'ninos' });
    if (filtroMascotas) tags.push({ label: 'Acepta mascotas', type: 'mascotas' });
    return tags;
  }, [precioMin, precioMax, filtroEstrellas, filtroTipos, filtroNinos, filtroMascotas]);

  const removerTag = (tag: any) => {
    if (tag.type === 'precio') {
      setPrecioMin(0); setPrecioMax(300);
    } else if (tag.type === 'estrella') {
      setFiltroEstrellas({ ...filtroEstrellas, [tag.value]: false });
    } else if (tag.type === 'tipo') {
      setFiltroTipos({ ...filtroTipos, [tag.value]: false });
    } else if (tag.type === 'ninos') {
      setFiltroNinos(false);
    } else if (tag.type === 'mascotas') {
      setFiltroMascotas(false);
    }
    setCurrentPage(1);
  };

  const limpiarFiltros = () => {
    setPrecioMin(0); setPrecioMax(300); setFiltroNinos(false); setFiltroMascotas(false);
    setFiltroEstrellas({ 5:false,4:false,3:false,2:false,1:false });
    setFiltroTipos({ Hotel:false,Hostal:false,Motel:false,Apartamento:false });
    setCurrentPage(1);
  };

  const renderFiltersContent = () => (
    <>
      <SidebarSection title="Precio por noche">
        <View style={s.priceInputRow}>
          <View style={s.priceInputWrap}>
            <Text style={s.currencyPrefix}>$</Text>
            <TextInput style={s.priceInp} value={String(precioMin)} onChangeText={v => { setPrecioMin(+v||0); setCurrentPage(1); }} keyboardType="numeric" />
          </View>
          <View style={s.priceInputWrap}>
            <Text style={s.currencyPrefix}>$</Text>
            <TextInput style={s.priceInp} value={String(precioMax)} onChangeText={v => { setPrecioMax(+v||300); setCurrentPage(1); }} keyboardType="numeric" />
          </View>
        </View>
        <Text style={s.priceHint}>$0 USD — $300+ USD</Text>
      </SidebarSection>

      <SidebarSection title="Tipo de alojamiento">
        {(['Hotel','Hostal','Motel','Apartamento'] as const).map(t => (
          <FilterCheck key={t} label={t + 's'} checked={filtroTipos[t]} onToggle={() => { setFiltroTipos({...filtroTipos,[t]:!filtroTipos[t]}); setCurrentPage(1); }} />
        ))}
      </SidebarSection>

      <SidebarSection title="Categoría">
        {[5,4,3,2,1].map(e => (
          <FilterCheck key={e} label={'★'.repeat(e) + '☆'.repeat(5-e)} checked={filtroEstrellas[e]} onToggle={() => { setFiltroEstrellas({...filtroEstrellas,[e]:!filtroEstrellas[e]}); setCurrentPage(1); }} />
        ))}
      </SidebarSection>

      <SidebarSection title="Políticas de Grupo">
        <FilterCheck label="Acepta niños" checked={filtroNinos} onToggle={() => { setFiltroNinos(!filtroNinos); setCurrentPage(1); }} />
        <FilterCheck label="Acepta mascotas" checked={filtroMascotas} onToggle={() => { setFiltroMascotas(!filtroMascotas); setCurrentPage(1); }} />
      </SidebarSection>
    </>
  );

  return (
    <View style={s.root}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.mainContent}>
        
        {/* Search Hero Banner (Matches Screenshot) */}
        <View
          style={[
            s.heroBanner,
            Platform.OS === 'web' && {
              backgroundImage: `linear-gradient(rgba(55, 34, 31, 0.72), rgba(55, 34, 31, 0.72)), url('/images/search_resultado_fondo.jpg')`,
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
            <Text style={s.heroTitle}>Explora tu próximo destino</Text>
            
            {/* Interactive Search Panel */}
            <View style={s.searchPanel}>
              {/* Row 1: Destino + Llegada + Salida */}
              <View style={[s.spRow, isWide && s.spRowWide]}>
                
                {/* Destino */}
                <View style={s.spFieldDestino}>
                  <Text style={s.spLabel}>Destino</Text>
                  <View style={s.spInputWrap}>
                    <Ionicons name="location" size={16} color="#C6B17D" style={s.spIcon} />
                    <TextInput
                      style={s.spInput}
                      value={destinoSearch}
                      onChangeText={setDestinoSearch}
                      placeholder="¿A dónde vas?"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                    />
                  </View>
                </View>

                {/* Llegada */}
                <View style={s.spFieldDate}>
                  <Text style={s.spLabel}>Llegada</Text>
                  <TouchableOpacity style={s.spInputWrap} onPress={() => setShowLlegadaSearchPicker(true)}>
                    <Text style={s.spInputText}>{formatDisplayDate(llegadaSearch)}</Text>
                    <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.6)" />
                  </TouchableOpacity>
                </View>

                {/* Salida */}
                <View style={s.spFieldDate}>
                  <Text style={s.spLabel}>Salida</Text>
                  <TouchableOpacity style={s.spInputWrap} onPress={() => setShowSalidaSearchPicker(true)}>
                    <Text style={s.spInputText}>{formatDisplayDate(salidaSearch)}</Text>
                    <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.6)" />
                  </TouchableOpacity>
                </View>

              </View>

              {/* Horizontal Divider */}
              <View style={s.spDivider} />

              {/* Row 2: Habitaciones + Adultos + Niños + Buscar */}
              <View style={[s.spRow, isWide && s.spRowWide, isWide ? { alignItems: 'flex-end' } : { alignItems: 'stretch' }]}>
                
                {/* Habitaciones */}
                <View style={s.spFieldNum}>
                  <Text style={s.spLabel}>Habitaciones</Text>
                  <View style={s.spInputWrap}>
                    <Ionicons name="bed" size={15} color="rgba(255,255,255,0.6)" style={s.spIcon} />
                    <TextInput
                      style={s.spInput}
                      value={habitacionesSearch}
                      onChangeText={(val) => setHabitacionesSearch(val.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Adultos */}
                <View style={s.spFieldNum}>
                  <Text style={s.spLabel}>Adultos</Text>
                  <View style={s.spInputWrap}>
                    <Ionicons name="person" size={14} color="rgba(255,255,255,0.6)" style={s.spIcon} />
                    <TextInput
                      style={s.spInput}
                      value={adultosSearch}
                      onChangeText={(val) => setAdultosSearch(val.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Niños */}
                <View style={s.spFieldNum}>
                  <Text style={s.spLabel}>Niños</Text>
                  <View style={s.spInputWrap}>
                    <Ionicons name="happy" size={14} color="rgba(255,255,255,0.6)" style={s.spIcon} />
                    <TextInput
                      style={s.spInput}
                      value={ninosSearch}
                      onChangeText={(val) => setNinosSearch(val.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Buscar button */}
                <TouchableOpacity style={s.spBtn} onPress={executeNewSearch} activeOpacity={0.85}>
                  <Ionicons name="search" size={16} color="#fff" />
                  <Text style={s.spBtnText}>Buscar</Text>
                </TouchableOpacity>

              </View>
            </View>

          </View>
        </View>

        {/* Results bar */}
        <View style={[s.resultsBar, { flexDirection: isWide ? 'row' : 'column', alignItems: isWide ? 'center' : 'stretch' }]}>
          <View style={{ flex: 1, alignSelf: 'stretch', justifyContent: 'center' }}>
            <Text style={s.resultsCount}>
              <Text style={{ fontWeight: '700' }}>{filtered.length} alojamiento{filtered.length !== 1 ? 's' : ''}</Text>
              {' '}disponible{filtered.length !== 1 ? 's' : ''}
              {params.destino ? <Text style={{ fontStyle: 'italic' }}> en {params.destino}</Text> : null}
            </Text>
          </View>
          
          {/* Sorting Option */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
            {[{ v:'recomendados',l:'Recomendados' },{ v:'valoracion',l:'Mayor valoración' },{ v:'precio_asc',l:'Menor precio' },{ v:'precio_desc',l:'Mayor precio' },{ v:'nombre',l:'Nombre A–Z' }].map(opt => (
              <TouchableOpacity key={opt.v} style={[s.sortChip, sortOption === opt.v && s.sortChipOn]} onPress={() => { setSortOption(opt.v); setCurrentPage(1); }}>
                <Text style={[s.sortChipText, sortOption === opt.v && { color: Colors.titulo, fontWeight: '600' }]}>{opt.l}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Mobile Filter Toggle */}
          {!isWide && (
            <TouchableOpacity style={s.mobileFilterBtn} onPress={() => setShowMobileFilters(true)}>
              <Ionicons name="options-outline" size={16} color="#fff" />
              <Text style={s.mobileFilterBtnText}>Filtros ({activeTags.length})</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Active Tags Bar */}
        {activeTags.length > 0 && (
          <View style={s.tagsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tagsList}>
              {activeTags.map((tag, idx) => (
                <View key={idx} style={s.tagChip}>
                  <Text style={s.tagChipLabel}>{tag.label}</Text>
                  <TouchableOpacity onPress={() => removerTag(tag)} style={s.tagChipClose}>
                    <Ionicons name="close" size={12} color={Colors.titulo} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={limpiarFiltros} style={s.clearTagsBtn}>
                <Text style={s.clearTagsBtnText}>Limpiar filtros</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Body: Sidebar + Results */}
        <View style={[s.pageBody, { flexDirection: isWide ? 'row' : 'column' }]}>
          {/* Sidebar (Wide Screen Only) */}
          {isWide && (
            <View style={s.sidebar}>
              {renderFiltersContent()}
            </View>
          )}

          {/* Results */}
          <View style={s.resultsArea}>
            {loading ? (
              <View style={s.stateBox}>
                <ActivityIndicator size="large" color={Colors.titulo} />
                <Text style={s.stateText}>Buscando alojamientos...</Text>
              </View>
            ) : filtered.length === 0 ? (
              <View style={s.stateBox}>
                <Ionicons name="sad-outline" size={52} color={Colors.extra2} />
                <Text style={s.stateTitle}>No se encontraron alojamientos</Text>
                <Text style={s.stateText}>Ningún alojamiento coincide con los filtros seleccionados.</Text>
                <TouchableOpacity style={s.clearBtn} onPress={limpiarFiltros}>
                  <Text style={s.clearBtnText}>Restaurar filtros de búsqueda</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {paged.map(h => <HotelCard key={`${h.provider}-${h.id}`} h={h} onPress={() => goDetail(h)} isWide={isWide} />)}

                {totalPages > 1 && (
                  <View style={s.pagination}>
                    <PagBtn icon="play-skip-back-outline" onPress={() => setCurrentPage(1)} disabled={currentPage === 1} />
                    <PagBtn icon="chevron-back-outline" onPress={() => setCurrentPage(p => Math.max(1,p-1))} disabled={currentPage === 1} />
                    {Array(totalPages).fill(0).map((_,i) => (
                      <TouchableOpacity key={i} style={[s.pagNumBtn, currentPage === i+1 && s.pagNumBtnOn]} onPress={() => setCurrentPage(i+1)}>
                        <Text style={[s.pagNum, currentPage === i+1 && { color: Colors.titulo, fontWeight: '700' }]}>{i+1}</Text>
                      </TouchableOpacity>
                    ))}
                    <PagBtn icon="chevron-forward-outline" onPress={() => setCurrentPage(p => Math.min(totalPages,p+1))} disabled={currentPage === totalPages} />
                    <PagBtn icon="play-skip-forward-outline" onPress={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
                  </View>
                )}
              </>
            )}
          </View>
          </View>
        </View>

        <Footer />
      </ScrollView>

      {/* Arrival Picker */}
      <CalendarModal
        visible={showLlegadaSearchPicker}
        value={llegadaSearch}
        onSelect={setLlegadaSearch}
        onClose={() => setShowLlegadaSearchPicker(false)}
      />

      {/* Departure Picker */}
      <CalendarModal
        visible={showSalidaSearchPicker}
        value={salidaSearch}
        minDate={llegadaSearch || undefined}
        onSelect={setSalidaSearch}
        onClose={() => setShowSalidaSearchPicker(false)}
      />

      {/* Mobile Filters Modal */}
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
              <Text style={s.modalApplyBtnText}>Ver {filtered.length} resultados</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sb.section}>
      <Text style={sb.title}>{title}</Text>
      {children}
    </View>
  );
}

function FilterCheck({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity style={sb.check} onPress={onToggle} activeOpacity={0.7}>
      <View style={[sb.box, checked && sb.boxOn]}>
        {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>
      <Text style={sb.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function PagBtn({ icon, onPress, disabled }: { icon: any; onPress: () => void; disabled: boolean }) {
  return (
    <TouchableOpacity style={[s.pagBtn, disabled && { opacity: 0.3 }]} onPress={onPress} disabled={disabled}>
      <Ionicons name={icon} size={18} color={Colors.titulo} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, backgroundColor: Colors.bg },
  mainContent: { flex: 1, width: '100%' },

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
    backgroundColor: 'rgba(55, 34, 31, 0.72)', // Tinted overlay (terracotta palette)
  },
  heroContainer: { gap: Spacing.md, width: '100%', maxWidth: 960 },
  heroTitle: { fontSize: 28, fontWeight: '700', color: '#fff', textAlign: 'center', fontFamily: 'PlayfairDisplay-Bold', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },

  // Interactive Search Panel (Styled like mockup)
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
  spRowWide: { flexDirection: 'row' },
  spFieldDestino: { flex: 2, minWidth: 200 },
  spFieldDate: { flex: 1.2, minWidth: 130 },
  spFieldNum: { flex: 1, minWidth: 90 },
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
  spInputText: { flex: 1, color: '#fff', fontSize: 13 },
  spDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 4 },
  spBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#8E5A54', borderRadius: 8,
    height: 40, paddingHorizontal: Spacing.xl, alignSelf: 'stretch',
  },
  spBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  resultsBar: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
    backgroundColor: Colors.bg,
  },
  resultsCount: { fontSize: 14, color: Colors.subtitulo },
  sortChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, marginRight: 6, backgroundColor: Colors.surface },
  sortChipOn: { borderColor: Colors.titulo, backgroundColor: Colors.primaryLight },
  sortChipText: { fontSize: 12, color: Colors.subtitulo },

  mobileFilterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.titulo, borderRadius: BorderRadius.md,
    paddingVertical: 8, paddingHorizontal: 16, marginTop: 8,
    alignSelf: 'stretch', justifyContent: 'center',
    ...Shadow.sm,
  },
  mobileFilterBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  tagsContainer: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: 'rgba(251,248,234,0.5)', borderBottomWidth: 1, borderBottomColor: Colors.border },
  tagsList: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingLeft: 8, paddingRight: 4, paddingVertical: 4 },
  tagChipLabel: { fontSize: 11, color: Colors.titulo, fontWeight: '600' },
  tagChipClose: { padding: 2 },
  clearTagsBtn: { paddingHorizontal: 6 },
  clearTagsBtnText: { fontSize: 11, color: Colors.titulo, fontWeight: '700', textDecorationLine: 'underline' },

  pageBody: { flexDirection: Platform.OS === 'web' ? 'row' : 'column', alignItems: 'flex-start', backgroundColor: Colors.bg, width: '100%' },
  sidebar: { width: 260, padding: Spacing.lg, borderRightWidth: 1, borderRightColor: Colors.border },
  priceInputRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 8 },
  priceInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.accentBorder, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 6 },
  currencyPrefix: { fontSize: 13, color: Colors.titulo, fontWeight: '600', marginRight: 2 },
  priceInp: { flex: 1, fontSize: 13, color: Colors.extra1 },
  priceHint: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },

  resultsArea: { flex: 1, padding: Spacing.lg, gap: Spacing.md, width: '100%' },
  stateBox: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.md, width: '100%' },
  stateTitle: { fontSize: 18, fontWeight: '600', color: Colors.titulo, textAlign: 'center' },
  stateText: { fontSize: 14, color: Colors.subtitulo, textAlign: 'center', maxWidth: 340 },
  clearBtn: { marginTop: Spacing.sm, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, paddingVertical: 12, paddingHorizontal: Spacing.xl },
  clearBtnText: { color: Colors.titulo, fontWeight: '600', fontSize: 14 },

  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xl, width: '100%' },
  pagBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  pagNumBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  pagNumBtnOn: { borderColor: Colors.titulo, backgroundColor: Colors.primaryLight },
  pagNum: { fontSize: 13, color: Colors.subtitulo },

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
  box: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: Colors.accentBorder, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: Colors.titulo, borderColor: Colors.titulo },
  checkLabel: { fontSize: 13, color: Colors.extra1 },
});

const c = StyleSheet.create({
  card: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  imgWrap: { position: 'relative', width: Platform.OS === 'web' ? 260 : '100%', height: Platform.OS === 'web' ? 'auto' : 200 },
  img: { width: '100%', height: Platform.OS === 'web' ? 240 : 200, minHeight: 200 },
  imgPlaceholder: { width: '100%', height: 220, backgroundColor: Colors.accentLight, alignItems: 'center', justifyContent: 'center' },
  badgeTipo: { position: 'absolute', top: 10, left: 10, backgroundColor: Colors.titulo, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeTipoText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  starsRow: { position: 'absolute', bottom: 10, left: 10 },

  info: { flex: 1, padding: Spacing.md, gap: Spacing.sm },
  top: { gap: 2 },
  name: { fontSize: 17, fontWeight: '700', color: Colors.titulo, lineHeight: 22 },
  calidad: { fontSize: 12, color: Colors.extra2, fontWeight: '500' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locText: { fontSize: 12, color: Colors.subtitulo, flex: 1 },
  desc: { fontSize: 13, color: Colors.subtitulo, lineHeight: 18 },

  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaHighlight: { backgroundColor: Colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  metaText: { fontSize: 12, color: Colors.subtitulo },
  metaBold: { fontWeight: '700' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.border },
  chipText: { fontSize: 11, color: Colors.titulo },
  chipNinos: { backgroundColor: 'rgba(33,150,243,0.1)', borderColor: 'rgba(33,150,243,0.3)' },
  chipMascotas: { backgroundColor: 'rgba(76,175,80,0.1)', borderColor: 'rgba(76,175,80,0.3)' },

  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: Spacing.xs, flexWrap: 'wrap', gap: Spacing.sm },
  rating: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  ratingNum: { fontSize: 24, fontWeight: '800', color: '#27ae60' },
  ratingLabel: { fontSize: 12, fontWeight: '600', color: Colors.extra1 },
  ratingCount: { fontSize: 11, color: Colors.subtitulo },
  noRating: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },

  priceBlock: { alignItems: 'flex-end', gap: Spacing.xs, flex: 1, minWidth: 160 },
  desde: { fontSize: 11, color: Colors.textMuted },
  price: { fontSize: 22, fontWeight: '800', color: Colors.titulo },
  priceDollar: { fontSize: 16, fontWeight: '600' },
  priceUSD: { fontSize: 14, fontWeight: '400', color: Colors.subtitulo },
  noche: { fontSize: 11, color: Colors.textMuted },
  btnVer: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.titulo, borderRadius: BorderRadius.md,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  btnVerText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Mobile elements styling
  ratingInline: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ratingInlineText: { fontSize: 11, color: Colors.subtitulo },
  mobileFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginTop: 4 },
  mobilePriceBlock: { flexDirection: 'column', gap: 1 },
  btnVerMobile: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.titulo, borderRadius: BorderRadius.md,
    paddingVertical: 8, paddingHorizontal: 12,
  },
});
