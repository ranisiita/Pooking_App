import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, ActivityIndicator, Platform, Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { CarService, CriteriosBusquedaAutos } from '../../services/cars.service';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { setStorageItem } from '../../services/storage';

const ITEMS_PER_PAGE = 6;
const { width } = Dimensions.get('window');

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

export default function CarResultsScreen() {
  const router = useRouter();
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

  // Filter lists from API
  const [localizaciones, setLocalizaciones] = useState<LocationItem[]>([]);
  const [categorias, setCategorias] = useState<CategoryItem[]>([]);

  // Search Criterias
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

  useEffect(() => {
    async function loadFilters() {
      try {
        const prov = criterios.proveedor;
        const locs = await CarService.getLocalizaciones(prov);
        const cats = await CarService.getCategorias(prov);
        setLocalizaciones(locs);
        setCategorias(cats);
        
        // If no pick-up location is selected, default to the first one available
        if (!criterios.idLocalizacionRecogida && locs.length > 0) {
          setCriterios(c => ({
            ...c,
            idLocalizacionRecogida: locs[0].idLocalizacion
          }));
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

  const buscarResultados = async () => {
    setLoading(true);
    try {
      const searchParams: CriteriosBusquedaAutos = {
        idLocalizacionRecogida: params.idLocalizacionRecogida ? +params.idLocalizacionRecogida : criterios.idLocalizacionRecogida,
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
      
      // Perform parallel availability checks for each vehicle returned
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

      // Sort logic
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

    router.replace({
      pathname: '/autos/resultados',
      params: routeParams,
    });
  };

  const verDetalle = async (vehiculo: VehicleItem) => {
    await setStorageItem('car-selected', JSON.stringify(vehiculo));
    if (vehiculo.provider) {
      await setStorageItem('car-provider', vehiculo.provider);
    }
    router.push({
      pathname: '/autos/detalle/[id]' as any,
      params: { id: String(vehiculo.idVehiculo) }
    });
  };

  const handleReservar = async (vehiculo: VehicleItem) => {
    await setStorageItem('car-selected', JSON.stringify(vehiculo));
    if (vehiculo.provider) {
      await setStorageItem('car-provider', vehiculo.provider);
    }
    router.push({
      pathname: '/autos/checkout/[id]' as any,
      params: { id: String(vehiculo.idVehiculo) }
    });
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

  return (
    <View style={s.root}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Search Panel floating header */}
        <View style={s.searchBarFloating}>
          <Text style={s.searchTitle}>Alquiler de Autos</Text>
          <View style={s.formGrid}>
            <View style={s.row}>
              {/* Recogida */}
              <View style={s.field}>
                <Text style={s.label}>Lugar de Recogida</Text>
                <View style={s.pickerWrap}>
                  <Ionicons name="location-outline" size={16} color={Colors.extra2} />
                  <TextInput
                    style={s.textInp}
                    placeholder="Sucursal"
                    value={nombreLocalizacion(criterios.idLocalizacionRecogida ?? null)}
                    editable={false}
                  />
                  {localizaciones.length > 0 && (
                    <ScrollView style={s.dropdownScroll} nestedScrollEnabled>
                      {localizaciones.map(l => (
                        <TouchableOpacity
                          key={l.idLocalizacion}
                          style={s.dropdownItem}
                          onPress={() => setCriterios(c => ({ ...c, idLocalizacionRecogida: l.idLocalizacion }))}
                        >
                          <Text style={s.dropdownText}>{l.nombre}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>

              {/* Devolucion */}
              <View style={s.field}>
                <Text style={s.label}>Lugar de Devolución</Text>
                <View style={s.pickerWrap}>
                  <Ionicons name="location-outline" size={16} color={Colors.extra2} />
                  <TextInput
                    style={s.textInp}
                    placeholder="Misma sucursal"
                    value={nombreLocalizacion(criterios.idLocalizacionDevolucion ?? null)}
                    editable={false}
                  />
                  {localizaciones.length > 0 && (
                    <ScrollView style={s.dropdownScroll} nestedScrollEnabled>
                      <TouchableOpacity
                        style={s.dropdownItem}
                        onPress={() => setCriterios(c => ({ ...c, idLocalizacionDevolucion: null }))}
                      >
                        <Text style={s.dropdownText}>Misma sucursal</Text>
                      </TouchableOpacity>
                      {localizaciones.map(l => (
                        <TouchableOpacity
                          key={l.idLocalizacion}
                          style={s.dropdownItem}
                          onPress={() => setCriterios(c => ({ ...c, idLocalizacionDevolucion: l.idLocalizacion }))}
                        >
                          <Text style={s.dropdownText}>{l.nombre}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>
            </View>

            <View style={s.row}>
              {/* Recogida Date */}
              <View style={s.field}>
                <Text style={s.label}>Fecha Recogida</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.extra2} />
                  <TextInput
                    style={s.textInp}
                    placeholder="YYYY-MM-DD"
                    value={criterios.fechaRecogida}
                    onChangeText={v => setCriterios(c => ({ ...c, fechaRecogida: v }))}
                  />
                </View>
              </View>

              {/* Devolucion Date */}
              <View style={s.field}>
                <Text style={s.label}>Fecha Devolución</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.extra2} />
                  <TextInput
                    style={s.textInp}
                    placeholder="YYYY-MM-DD"
                    value={criterios.fechaDevolucion}
                    onChangeText={v => setCriterios(c => ({ ...c, fechaDevolucion: v }))}
                  />
                </View>
              </View>
            </View>

            <View style={s.row}>
              {/* Categoria */}
              <View style={s.field}>
                <Text style={s.label}>Categoría</Text>
                <View style={s.pickerWrap}>
                  <Ionicons name="apps-outline" size={16} color={Colors.extra2} />
                  <TextInput
                    style={s.textInp}
                    placeholder="Todas las categorías"
                    value={criterios.nombreCategoria}
                    editable={false}
                  />
                  {categorias.length > 0 && (
                    <ScrollView style={s.dropdownScroll} nestedScrollEnabled>
                      <TouchableOpacity style={s.dropdownItem} onPress={() => setCriterios(c => ({ ...c, nombreCategoria: '' }))}>
                        <Text style={s.dropdownText}>Todas las categorías</Text>
                      </TouchableOpacity>
                      {categorias.map(cat => (
                        <TouchableOpacity
                          key={cat.idCategoria}
                          style={s.dropdownItem}
                          onPress={() => setCriterios(c => ({ ...c, nombreCategoria: cat.nombre }))}
                        >
                          <Text style={s.dropdownText}>{cat.nombre}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>

              {/* Marca */}
              <View style={s.field}>
                <Text style={s.label}>Marca</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="car-outline" size={16} color={Colors.extra2} />
                  <TextInput
                    style={s.textInp}
                    placeholder="Ej: Toyota"
                    value={criterios.nombreMarca}
                    onChangeText={v => setCriterios(c => ({ ...c, nombreMarca: v }))}
                  />
                </View>
              </View>
            </View>

            <View style={s.row}>
              {/* Transmision */}
              <View style={s.field}>
                <Text style={s.label}>Transmisión</Text>
                <View style={s.pickerWrap}>
                  <Ionicons name="settings-outline" size={16} color={Colors.extra2} />
                  <TextInput
                    style={s.textInp}
                    placeholder="Cualquiera"
                    value={criterios.transmision === 'AUTOMATICA' ? 'Automática' : criterios.transmision === 'MANUAL' ? 'Manual' : 'Cualquiera'}
                    editable={false}
                  />
                  <ScrollView style={s.dropdownScroll} nestedScrollEnabled>
                    <TouchableOpacity style={s.dropdownItem} onPress={() => setCriterios(c => ({ ...c, transmision: '' }))}>
                      <Text style={s.dropdownText}>Cualquiera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.dropdownItem} onPress={() => setCriterios(c => ({ ...c, transmision: 'AUTOMATICA' }))}>
                      <Text style={s.dropdownText}>Automática</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.dropdownItem} onPress={() => setCriterios(c => ({ ...c, transmision: 'MANUAL' }))}>
                      <Text style={s.dropdownText}>Manual</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </View>

              {/* Ordenar */}
              <View style={s.field}>
                <Text style={s.label}>Ordenar por</Text>
                <View style={s.pickerWrap}>
                  <Ionicons name="filter-outline" size={16} color={Colors.extra2} />
                  <TextInput
                    style={s.textInp}
                    placeholder="Relevancia"
                    value={criterios.sort === 'price_asc' ? 'Precio: Menor a Mayor' : criterios.sort === 'price_desc' ? 'Precio: Mayor a Menor' : 'Relevancia'}
                    editable={false}
                  />
                  <ScrollView style={s.dropdownScroll} nestedScrollEnabled>
                    <TouchableOpacity style={s.dropdownItem} onPress={() => setCriterios(c => ({ ...c, sort: '' }))}>
                      <Text style={s.dropdownText}>Relevancia</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.dropdownItem} onPress={() => setCriterios(c => ({ ...c, sort: 'price_asc' }))}>
                      <Text style={s.dropdownText}>Precio: Menor a Mayor</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.dropdownItem} onPress={() => setCriterios(c => ({ ...c, sort: 'price_desc' }))}>
                      <Text style={s.dropdownText}>Precio: Mayor a Menor</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </View>
            </View>

            <TouchableOpacity style={s.btnBuscar} onPress={handleBuscar}>
              <Ionicons name="search" size={18} color="#fff" />
              <Text style={s.btnBuscarText}>Buscar Vehículos</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results Body */}
        <View style={s.mainContent}>
          <View style={s.resultsHeader}>
            <Text style={s.resultsTitle}>
              {loading ? 'Buscando...' : `${vehiculos.length} vehículo${vehiculos.length !== 1 ? 's' : ''} disponible${vehiculos.length !== 1 ? 's' : ''}`}
            </Text>
            {criterios.idLocalizacionRecogida ? (
              <Text style={s.resultsSubtitle}>
                <Ionicons name="location-outline" size={14} color={Colors.extra2} />
                {' '}{nombreLocalizacion(criterios.idLocalizacionRecogida)}
                {criterios.idLocalizacionDevolucion && criterios.idLocalizacionDevolucion !== criterios.idLocalizacionRecogida ? (
                  <Text> → {nombreLocalizacion(criterios.idLocalizacionDevolucion)}</Text>
                ) : null}
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
                  {/* Card Header */}
                  <View style={s.cardHeader}>
                    <View style={s.brandRow}>
                      <View style={s.brandIcon}>
                        <Ionicons name="car" size={16} color={Colors.titulo} />
                      </View>
                      <View>
                        <Text style={s.brandName}>{v.marca}</Text>
                        <Text style={s.modelName}>{v.modelo} · {v.anio}</Text>
                      </View>
                    </View>
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{v.categoria?.nombre || 'General'}</Text>
                    </View>
                  </View>

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

                  {/* Divider line */}
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
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1 },

  // Search Panel Floating
  searchBarFloating: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    margin: Spacing.md,
    gap: Spacing.md,
    ...Shadow.md,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.titulo,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.xs,
  },
  formGrid: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: Spacing.md,
  },
  field: {
    flex: 1,
    gap: 4,
    position: 'relative', // for absolute dropdown list
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.subtitulo,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  },
  pickerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.accentBorder,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    height: 42,
    backgroundColor: Colors.bg,
    zIndex: 10,
  },
  textInp: {
    flex: 1,
    fontSize: 13,
    color: Colors.extra1,
    paddingLeft: Spacing.xs,
  },
  dropdownScroll: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 120,
    zIndex: 100,
    borderRadius: BorderRadius.sm,
    ...Shadow.md,
    display: Platform.OS === 'web' ? 'flex' : 'none', // dropdown scrolls are mostly suited for Web hover/clicks
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownText: {
    fontSize: 12,
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
    marginTop: Spacing.sm,
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
    flexDirection: 'row',
    alignItems: 'center',
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,177,125,0.15)',
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
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.extra1,
  },
  modelName: {
    fontSize: 11,
    color: Colors.subtitulo,
  },
  badge: {
    backgroundColor: Colors.primaryLight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.titulo,
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
  notchLeft: {
    left: -6,
  },
  notchRight: {
    right: -6,
  },

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
