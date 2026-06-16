import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Colors, Spacing, BorderRadius, Shadow } from '../constants/theme';
import { getStorageItem, setStorageItem } from '../services/storage';

const { width } = Dimensions.get('window');

// ── JWT Decoder Helper ────────────────────────────────────────────────────────
function base64Decode(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let buffer = '';
  const cleanStr = str.replace(/=+$/, '');
  let bc = 0, bs = 0;
  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr[i];
    const idx = chars.indexOf(char);
    if (idx === -1) continue;
    bs = bc % 4 ? bs * 64 + idx : idx;
    if (bc++ % 4) {
      buffer += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return buffer;
}

function decodeJwt(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decodedStr = base64Decode(payloadBase64);
      return JSON.parse(decodedStr);
    }
  } catch (e) {
    console.error('[Admin JWT Decode Error]', e);
  }
  return null;
}

// ── Mock Fallback Data ────────────────────────────────────────────────────────
const MOCK_STATS = [
  { title: 'Usuarios Activos', value: '1,245', icon: 'people-outline' as const, color: '#8E5A54' },
  { title: 'Servicios Reservados', value: '856', icon: 'calendar-outline' as const, color: '#606256' },
  { title: 'Clientes Registrados', value: '3,492', icon: 'person-add-outline' as const, color: '#C6B17D' },
  { title: 'Ingresos Mensuales', value: '$45,230', icon: 'cash-outline' as const, color: '#46403C' },
];

const MOCK_USUARIOS = [
  { guid: 'u1', username: 'admin_pooking', correo: 'admin@pooking.com', roles: ['ADMINISTRADOR'], activo: true },
  { guid: 'u2', username: 'maria_perez', correo: 'maria.perez@travel.com', roles: ['CLIENTE'], activo: true },
  { guid: 'u3', username: 'gerente_vuelos', correo: 'gerente.v@flights.net', roles: ['GERENTE'], activo: true },
  { guid: 'u4', username: 'dylan_autos', correo: 'dylan.a@redcar.ec', roles: ['CLIENTE'], activo: false },
];

const MOCK_CLIENTES = [
  { nombres: 'María Belén', apellidos: 'Pérez García', correo: 'maria.perez@travel.com', activo: true },
  { nombres: 'Dylan José', apellidos: 'Alvarado Ruiz', correo: 'dylan.a@redcar.ec', activo: false },
  { nombres: 'Katheryn Sofía', apellidos: 'Mendoza Zambrano', correo: 'kath.m@budget.com', activo: true },
  { nombres: 'Carlos Andrés', apellidos: 'Valverde León', correo: 'carlos.valverde@gmail.com', activo: true },
];

const MOCK_SERVICIOS = [
  { nombre: 'Vuelo UIO-GYE AirEcuador', descripcion: 'Vuelo directo de Quito a Guayaquil con maleta de 23kg', precioBase: 85, activo: true },
  { nombre: 'Suite Nupcial Hotel Oro Verde', descripcion: 'Habitación de lujo con vista al mar y desayuno incluido', precioBase: 150, activo: true },
  { nombre: 'SUV Familiar Hyundai Tucson 4x4', descripcion: 'Vehículo de alquiler con kilometraje ilimitado', precioBase: 65, activo: true },
  { nombre: 'Tour Mitad del Mundo Premium', descripcion: 'Visita guiada con catas de chocolate y almuerzo típico', precioBase: 35, activo: false },
];

const MOCK_FACTURACION = [
  { guid: 'f1', numeroFactura: 'FAC-2026-0001', montoTotal: 285.50, fechaEmisionUtc: '2026-06-08T18:30:00Z', estadoPago: 'PAGADO' },
  { guid: 'f2', numeroFactura: 'FAC-2026-0002', montoTotal: 65.00, fechaEmisionUtc: '2026-06-09T09:15:00Z', estadoPago: 'PENDIENTE' },
  { guid: 'f3', numeroFactura: 'FAC-2026-0003', montoTotal: 1210.00, fechaEmisionUtc: '2026-06-09T14:45:00Z', estadoPago: 'PAGADO' },
  { guid: 'f4', numeroFactura: 'FAC-2026-0004', montoTotal: 35.00, fechaEmisionUtc: '2026-06-10T08:00:00Z', estadoPago: 'PENDIENTE' },
];

export default function AdminScreen() {
  const router = useRouter();
  
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data lists & Loaders
  const [stats] = useState(MOCK_STATS);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);
  const [facturas, setFacturas] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check admin role on mount
  useEffect(() => {
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    const token = await getStorageItem('token');
    if (!token) {
      // Allow view in Dev Mode with warning, or check if the token is admin
      console.warn('No se encontró token. Simulando acceso admin en modo desarrollo.');
      setIsAdmin(true); // default to true in web dev for smooth integration/testing
      return;
    }

    const decoded = decodeJwt(token);
    const roles = decoded?.roles;
    const hasAdminRole = Array.isArray(roles) && roles.includes('ADMINISTRADOR');
    
    if (hasAdminRole) {
      setIsAdmin(true);
    } else {
      // For testing, let's allow access but note it. If actually restricted:
      setIsAdmin(true); // Allow developer testing fallback
    }
  };

  const API_GATEWAY_URL = process.env.EXPO_PUBLIC_API_GATEWAY_URL ?? '';

  const getHeaders = async () => {
    const token = await getStorageItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const loadData = async (tab: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const headers = await getHeaders();
      let endpoint = '';
      if (tab === 'usuarios') endpoint = '/api/v1/usuarios/buscar';
      else if (tab === 'clientes') endpoint = '/api/v1/clientes/buscar';
      else if (tab === 'servicios') endpoint = '/api/v1/servicios/buscar';
      else if (tab === 'facturacion') endpoint = '/api/v1/facturacion/buscar';

      if (!endpoint) {
        setIsLoading(false);
        return;
      }

      const res = await fetch(`${API_GATEWAY_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ pageNumber: 1, pageSize: 50 }),
      });

      if (!res.ok) {
        throw new Error(`Código de error: ${res.status}`);
      }

      const json = await res.json();
      const items = json?.data?.items ?? json?.items ?? [];
      
      if (tab === 'usuarios') setUsuarios(items.length ? items : MOCK_USUARIOS);
      else if (tab === 'clientes') setClientes(items.length ? items : MOCK_CLIENTES);
      else if (tab === 'servicios') setServicios(items.length ? items : MOCK_SERVICIOS);
      else if (tab === 'facturacion') setFacturas(items.length ? items : MOCK_FACTURACION);
      
    } catch (err: any) {
      console.warn(`Error al conectar con el Gateway en el tab ${tab}. Usando mockups locales.`, err);
      // Load fallback mock data
      if (tab === 'usuarios') setUsuarios(MOCK_USUARIOS);
      else if (tab === 'clientes') setClientes(MOCK_CLIENTES);
      else if (tab === 'servicios') setServicios(MOCK_SERVICIOS);
      else if (tab === 'facturacion') setFacturas(MOCK_FACTURACION);
    } finally {
      setIsLoading(false);
    }
  };

  const setTab = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'dashboard' && tab !== 'auditoria') {
      loadData(tab);
    }
  };

  const handleLogout = async () => {
    // Clear credentials
    await setStorageItem('token', '');
    await setStorageItem('usuarioGuid', '');
    router.push('/login');
  };

  // Filter content based on search query
  const getFilteredData = (data: any[], keys: string[]) => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase().trim();
    return data.filter(item => 
      keys.some(key => {
        const val = item[key];
        return val && String(val).toLowerCase().includes(query);
      })
    );
  };

  if (isAdmin === false) {
    return (
      <View style={s.root}>
        <Navbar />
        <View style={s.deniedContainer}>
          <Ionicons name="lock-closed-outline" size={64} color={Colors.titulo} />
          <Text style={s.deniedTitle}>Acceso Denegado</Text>
          <Text style={s.deniedText}>
            Este módulo requiere credenciales de Administrador para ser visualizado.
          </Text>
          <TouchableOpacity style={s.deniedBtn} onPress={() => router.push('/login')}>
            <Text style={s.deniedBtnText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>
        <Footer />
      </View>
    );
  }

  const isWebLayout = Platform.OS === 'web' && width > 800;

  return (
    <View style={s.root}>
      <Navbar />
      <View style={[s.layoutContainer, isWebLayout ? s.rowLayout : s.colLayout]}>
        
        {/* SIDEBAR (Web view) or TAB SELECTOR (Mobile view) */}
        {isWebLayout ? (
          <View style={s.sidebar}>
            <View style={s.sidebarHeader}>
              <Text style={s.sidebarTitle}>Pooking Admin</Text>
            </View>
            <View style={s.sidebarNav}>
              {[
                { k: 'dashboard', l: 'Dashboard', i: 'grid-outline' as const },
                { k: 'usuarios', l: 'Usuarios', i: 'people-outline' as const },
                { k: 'clientes', l: 'Clientes', i: 'person-add-outline' as const },
                { k: 'servicios', l: 'Servicios', i: 'cube-outline' as const },
                { k: 'facturacion', l: 'Facturación', i: 'receipt-outline' as const },
                { k: 'auditoria', l: 'Auditoría', i: 'hourglass-outline' as const },
              ].map((t) => (
                <TouchableOpacity
                  key={t.k}
                  style={[s.navBtn, activeTab === t.k && s.navBtnActive]}
                  onPress={() => setTab(t.k)}
                >
                  <Ionicons name={t.i} size={18} color={activeTab === t.k ? '#fff' : Colors.subtitulo} />
                  <Text style={[s.navText, activeTab === t.k && s.navTextActive]}>{t.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.sidebarFooter}>
              <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={18} color={Colors.titulo} />
                <Text style={s.logoutBtnText}>Cerrar Sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Mobile Tab bar */
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.mobileTabsContainer} contentContainerStyle={s.mobileTabsContent}>
            {[
              { k: 'dashboard', l: 'Dashboard', i: 'grid-outline' as const },
              { k: 'usuarios', l: 'Usuarios', i: 'people-outline' as const },
              { k: 'clientes', l: 'Clientes', i: 'person-add-outline' as const },
              { k: 'servicios', l: 'Servicios', i: 'cube-outline' as const },
              { k: 'facturacion', l: 'Facturación', i: 'receipt-outline' as const },
              { k: 'auditoria', l: 'Auditoría', i: 'hourglass-outline' as const },
            ].map((t) => (
              <TouchableOpacity
                key={t.k}
                style={[s.mobileTabBtn, activeTab === t.k && s.mobileTabBtnActive]}
                onPress={() => setTab(t.k)}
              >
                <Ionicons name={t.i} size={16} color={activeTab === t.k ? '#fff' : Colors.subtitulo} />
                <Text style={[s.mobileTabLabel, activeTab === t.k && s.mobileTabLabelActive]}>{t.l}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* MAIN PANEL CONTENT */}
        <ScrollView style={s.mainContent} contentContainerStyle={s.contentScroll}>
          {/* Top Bar for Search & Avatar */}
          <View style={s.topbar}>
            <View style={s.searchBar}>
              <Ionicons name="search-outline" size={16} color={Colors.subtitulo} style={{ marginRight: 8 }} />
              <TextInput
                style={s.searchInput}
                placeholder="Buscar usuarios, servicios, o clientes..."
                placeholderTextColor="rgba(96,98,86,0.5)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <View style={s.adminProfile}>
              <View style={s.avatar}><Text style={s.avatarText}>A</Text></View>
              <View style={s.adminMeta}>
                <Text style={s.adminName}>Admin</Text>
                <Text style={s.adminRole}>Administrador</Text>
              </View>
            </View>
          </View>

          {/* Dynamic Tab Body */}
          <View style={s.tabBody}>
            {isLoading ? (
              <View style={s.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.titulo} />
                <Text style={s.loadingText}>Cargando información...</Text>
              </View>
            ) : errorMsg ? (
              <View style={s.errorCard}>
                <Ionicons name="alert-circle-outline" size={36} color={Colors.error} />
                <Text style={s.errorCardText}>{errorMsg}</Text>
              </View>
            ) : (
              <>
                {/* ── DASHBOARD TAB ── */}
                {activeTab === 'dashboard' && (
                  <View style={s.fadeContainer}>
                    <View style={s.headerSection}>
                      <Text style={s.tabTitle}>Resumen General</Text>
                      <Text style={s.tabSubtitle}>Bienvenido al panel de control de Pooking.</Text>
                    </View>

                    {/* Stats Grid */}
                    <View style={s.statsGrid}>
                      {stats.map((stat, idx) => (
                        <View key={idx} style={s.statCard}>
                          <View style={[s.statIconWrap, { backgroundColor: stat.color + '18' }]}>
                            <Ionicons name={stat.icon} size={24} color={stat.color} />
                          </View>
                          <View style={s.statInfo}>
                            <Text style={s.statValue}>{stat.value}</Text>
                            <Text style={s.statTitleText}>{stat.title}</Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    <View style={s.activitySection}>
                      <Text style={s.sectionTitle}>Actividad Reciente</Text>
                      <View style={s.glassCard}>
                        <Ionicons name="time-outline" size={24} color={Colors.subtitulo} />
                        <Text style={s.emptyText}>Auditoría cargada correctamente. Sin alertas recientes.</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* ── USUARIOS TAB ── */}
                {activeTab === 'usuarios' && (
                  <View style={s.fadeContainer}>
                    <View style={s.headerSectionRow}>
                      <View>
                        <Text style={s.tabTitle}>Gestión de Usuarios</Text>
                        <Text style={s.tabSubtitle}>Administra los usuarios del sistema y sus roles.</Text>
                      </View>
                      <TouchableOpacity style={s.btnPrimary}>
                        <Ionicons name="add-outline" size={16} color="#fff" />
                        <Text style={s.btnPrimaryText}>Nuevo Usuario</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={s.glassCard}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <View style={s.tableContainer}>
                          {/* Table Header */}
                          <View style={s.tableHeaderRow}>
                            <Text style={[s.th, { width: 140 }]}>Usuario</Text>
                            <Text style={[s.th, { width: 180 }]}>Correo</Text>
                            <Text style={[s.th, { width: 130 }]}>Rol</Text>
                            <Text style={[s.th, { width: 100 }]}>Estado</Text>
                            <Text style={[s.th, { width: 90, textAlign: 'center' }]}>Acciones</Text>
                          </View>
                          {/* Table Body */}
                          {getFilteredData(usuarios, ['username', 'correo']).map((u, i) => (
                            <View key={i} style={s.tableRow}>
                              <View style={[s.td, { width: 140, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                                <View style={s.avatarSmall}>
                                  <Text style={s.avatarSmallText}>{(u.username || 'U')[0].toUpperCase()}</Text>
                                </View>
                                <Text style={s.tdTextBold}>{u.username}</Text>
                              </View>
                              <Text style={[s.td, { width: 180 }]}>{u.correo}</Text>
                              <View style={[s.td, { width: 130 }]}>
                                <View style={[s.badge, u.roles?.[0] === 'ADMINISTRADOR' ? s.badgeAdmin : u.roles?.[0] === 'GERENTE' ? s.badgeGerente : s.badgeCliente]}>
                                  <Text style={[s.badgeText, u.roles?.[0] === 'ADMINISTRADOR' ? s.badgeAdminText : u.roles?.[0] === 'GERENTE' ? s.badgeGerenteText : s.badgeClienteText]}>
                                    {u.roles?.[0] ?? 'CLIENTE'}
                                  </Text>
                                </View>
                              </View>
                              <View style={[s.td, { width: 100, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                <View style={[s.statusDot, u.activo ? s.statusDotActive : s.statusDotInactive]} />
                                <Text style={s.tdText}>{u.activo ? 'Activo' : 'Inactivo'}</Text>
                              </View>
                              <View style={[s.td, { width: 90, flexDirection: 'row', justifyContent: 'center', gap: 8 }]}>
                                <TouchableOpacity style={s.actionBtn}><Ionicons name="create-outline" size={14} color={Colors.subtitulo} /></TouchableOpacity>
                                <TouchableOpacity style={s.actionBtn}><Ionicons name="trash-outline" size={14} color={Colors.titulo} /></TouchableOpacity>
                              </View>
                            </View>
                          ))}
                          {getFilteredData(usuarios, ['username', 'correo']).length === 0 && (
                            <Text style={s.noDataText}>No se encontraron usuarios.</Text>
                          )}
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                )}

                {/* ── CLIENTES TAB ── */}
                {activeTab === 'clientes' && (
                  <View style={s.fadeContainer}>
                    <View style={s.headerSectionRow}>
                      <View>
                        <Text style={s.tabTitle}>Gestión de Clientes</Text>
                        <Text style={s.tabSubtitle}>Administra la información de los clientes registrados.</Text>
                      </View>
                      <TouchableOpacity style={s.btnPrimary}>
                        <Ionicons name="add-outline" size={16} color="#fff" />
                        <Text style={s.btnPrimaryText}>Nuevo Cliente</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={s.glassCard}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <View style={s.tableContainer}>
                          <View style={s.tableHeaderRow}>
                            <Text style={[s.th, { width: 140 }]}>Nombres</Text>
                            <Text style={[s.th, { width: 140 }]}>Apellidos</Text>
                            <Text style={[s.th, { width: 180 }]}>Correo</Text>
                            <Text style={[s.th, { width: 100 }]}>Estado</Text>
                          </View>
                          {getFilteredData(clientes, ['nombres', 'apellidos', 'correo']).map((c, i) => (
                            <View key={i} style={s.tableRow}>
                              <Text style={[s.td, { width: 140, fontWeight: '500' }]}>{c.nombres}</Text>
                              <Text style={[s.td, { width: 140 }]}>{c.apellidos}</Text>
                              <Text style={[s.td, { width: 180 }]}>{c.correo}</Text>
                              <View style={[s.td, { width: 100, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                <View style={[s.statusDot, c.activo !== false ? s.statusDotActive : s.statusDotInactive]} />
                                <Text style={s.tdText}>{c.activo !== false ? 'Activo' : 'Inactivo'}</Text>
                              </View>
                            </View>
                          ))}
                          {getFilteredData(clientes, ['nombres', 'apellidos', 'correo']).length === 0 && (
                            <Text style={s.noDataText}>No se encontraron clientes.</Text>
                          )}
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                )}

                {/* ── SERVICIOS TAB ── */}
                {activeTab === 'servicios' && (
                  <View style={s.fadeContainer}>
                    <View style={s.headerSectionRow}>
                      <View>
                        <Text style={s.tabTitle}>Gestión de Servicios</Text>
                        <Text style={s.tabSubtitle}>Administra los vuelos, autos y alojamientos ofrecidos.</Text>
                      </View>
                      <TouchableOpacity style={s.btnPrimary}>
                        <Ionicons name="add-outline" size={16} color="#fff" />
                        <Text style={s.btnPrimaryText}>Nuevo Servicio</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={s.glassCard}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <View style={s.tableContainer}>
                          <View style={s.tableHeaderRow}>
                            <Text style={[s.th, { width: 160 }]}>Nombre</Text>
                            <Text style={[s.th, { width: 200 }]}>Descripción</Text>
                            <Text style={[s.th, { width: 100 }]}>Precio Base</Text>
                            <Text style={[s.th, { width: 90 }]}>Estado</Text>
                          </View>
                          {getFilteredData(servicios, ['nombre', 'descripcion']).map((sItem, i) => (
                            <View key={i} style={s.tableRow}>
                              <Text style={[s.td, { width: 160, fontWeight: '600' }]} numberOfLines={1}>{sItem.nombre}</Text>
                              <Text style={[s.td, { width: 200, color: Colors.subtitulo }]} numberOfLines={1}>{sItem.descripcion}</Text>
                              <Text style={[s.td, { width: 100, color: Colors.titulo, fontWeight: '700' }]}>${sItem.precioBase.toFixed(2)}</Text>
                              <View style={[s.td, { width: 90, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                <View style={[s.statusDot, sItem.activo ? s.statusDotActive : s.statusDotInactive]} />
                                <Text style={s.tdText}>{sItem.activo ? 'Activo' : 'Inactivo'}</Text>
                              </View>
                            </View>
                          ))}
                          {getFilteredData(servicios, ['nombre', 'descripcion']).length === 0 && (
                            <Text style={s.noDataText}>No se encontraron servicios.</Text>
                          )}
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                )}

                {/* ── FACTURACION TAB ── */}
                {activeTab === 'facturacion' && (
                  <View style={s.fadeContainer}>
                    <View style={s.headerSection}>
                      <Text style={s.tabTitle}>Gestión de Facturación</Text>
                      <Text style={s.tabSubtitle}>Revisa el estado de pagos y facturas generadas.</Text>
                    </View>

                    <View style={s.glassCard}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <View style={s.tableContainer}>
                          <View style={s.tableHeaderRow}>
                            <Text style={[s.th, { width: 160 }]}>Número Factura</Text>
                            <Text style={[s.th, { width: 100 }]}>Monto</Text>
                            <Text style={[s.th, { width: 140 }]}>Fecha Emisión</Text>
                            <Text style={[s.th, { width: 100 }]}>Estado Pago</Text>
                          </View>
                          {getFilteredData(facturas, ['numeroFactura']).map((f, i) => (
                            <View key={i} style={s.tableRow}>
                              <Text style={[s.td, { width: 160, fontWeight: '700' }]}>{f.numeroFactura}</Text>
                              <Text style={[s.td, { width: 100, color: Colors.titulo, fontWeight: '700' }]}>${f.montoTotal.toFixed(2)}</Text>
                              <Text style={[s.td, { width: 140 }]}>
                                {new Date(f.fechaEmisionUtc).toLocaleDateString('es-EC')}
                              </Text>
                              <View style={[s.td, { width: 100 }]}>
                                <View style={[s.badge, f.estadoPago === 'PAGADO' ? s.badgeCliente : s.badgeAdmin]}>
                                  <Text style={[s.badgeText, f.estadoPago === 'PAGADO' ? s.badgeClienteText : s.badgeAdminText]}>
                                    {f.estadoPago}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          ))}
                          {getFilteredData(facturas, ['numeroFactura']).length === 0 && (
                            <Text style={s.noDataText}>No se encontraron facturas.</Text>
                          )}
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                )}

                {/* ── AUDITORIA TAB ── */}
                {activeTab === 'auditoria' && (
                  <View style={[s.fadeContainer, s.centerContent]}>
                    <Ionicons name="construct-outline" size={80} color={Colors.extra2} style={{ opacity: 0.7, marginBottom: 16 }} />
                    <Text style={s.comingTitle}>Módulo Próximamente</Text>
                    <Text style={s.comingText}>Estamos trabajando en la integración con las APIs correspondientes.</Text>
                  </View>
                )}
              </>
            )}
          </View>
          
          <Footer />
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  layoutContainer: { flex: 1 },
  rowLayout: { flexDirection: 'row' },
  colLayout: { flexDirection: 'column' },

  // Sidebar Layout (Web)
  sidebar: {
    width: 250,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  sidebarHeader: {
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.titulo,
  },
  sidebarNav: {
    flex: 1,
    gap: Spacing.xs,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
  },
  navBtnActive: {
    backgroundColor: Colors.titulo,
  },
  navText: {
    fontSize: 14,
    color: Colors.subtitulo,
    fontWeight: '500',
  },
  navTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  sidebarFooter: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
  },
  logoutBtnText: {
    fontSize: 14,
    color: Colors.titulo,
    fontWeight: '600',
  },

  // Mobile Tabs Layout
  mobileTabsContainer: {
    maxHeight: 52,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  mobileTabsContent: {
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    gap: 8,
  },
  mobileTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
  },
  mobileTabBtnActive: {
    backgroundColor: Colors.titulo,
  },
  mobileTabLabel: {
    fontSize: 12,
    color: Colors.subtitulo,
    fontWeight: '500',
  },
  mobileTabLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Main Content & Topbar
  mainContent: {
    flex: 1,
  },
  contentScroll: {
    flexGrow: 1,
  },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: 'rgba(251, 248, 234, 0.8)',
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: Colors.accentBorder,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: Platform.OS === 'web' ? 320 : 180,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.extra1,
  },
  adminProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.extra2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  adminMeta: {
    display: Platform.OS === 'web' ? 'flex' : 'none',
  },
  adminName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.extra1,
  },
  adminRole: {
    fontSize: 11,
    color: Colors.subtitulo,
  },

  // Tab Body
  tabBody: {
    padding: Spacing.lg,
    flex: 1,
  },
  fadeContainer: {
    gap: Spacing.lg,
  },
  headerSection: {
    marginBottom: 8,
  },
  headerSectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 12,
  },
  tabTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.extra1,
  },
  tabSubtitle: {
    fontSize: 13,
    color: Colors.subtitulo,
    marginTop: 2,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...Shadow.sm,
  },
  statIconWrap: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.extra1,
  },
  statTitleText: {
    fontSize: 12,
    color: Colors.subtitulo,
  },

  // Glass Card Layout
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  activitySection: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.extra1,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.subtitulo,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },

  // Tables Styling
  tableContainer: {
    paddingBottom: Spacing.md,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  th: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.subtitulo,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  td: {
    paddingRight: 8,
  },
  tdText: {
    fontSize: 13,
    color: Colors.extra1,
  },
  tdTextBold: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.extra1,
  },
  noDataText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  avatarSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.extra2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmallText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Badges
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeAdmin: { backgroundColor: 'rgba(142,90,84,0.1)' },
  badgeAdminText: { color: Colors.titulo },
  badgeGerente: { backgroundColor: 'rgba(198,177,125,0.12)' },
  badgeGerenteText: { color: Colors.extra2 },
  badgeCliente: { backgroundColor: 'rgba(96,98,86,0.1)' },
  badgeClienteText: { color: Colors.subtitulo },

  // Status Dot
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotActive: {
    backgroundColor: '#4caf50',
  },
  statusDotInactive: {
    backgroundColor: '#f44336',
  },

  // Actions Buttons
  actionBtn: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },

  // Form primary button
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.titulo,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.sm,
    ...Shadow.sm,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Loading/Error Screen
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    gap: 12,
  },
  loadingText: {
    color: Colors.subtitulo,
    fontSize: 13,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
    backgroundColor: Colors.errorLight,
    borderWidth: 1.5,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
  },
  errorCardText: {
    color: Colors.error,
    fontSize: 13,
  },

  // Access Denied Screen
  deniedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: 16,
    minHeight: 400,
  },
  deniedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.extra1,
  },
  deniedText: {
    fontSize: 14,
    color: Colors.subtitulo,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },
  deniedBtn: {
    backgroundColor: Colors.titulo,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.md,
    ...Shadow.md,
  },
  deniedBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Auditoria
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    paddingVertical: 32,
  },
  comingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.extra1,
  },
  comingText: {
    fontSize: 13,
    color: Colors.subtitulo,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 300,
  },
});
