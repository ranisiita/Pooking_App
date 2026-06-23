import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Colors, Spacing, BorderRadius, Shadow, Typography } from '../constants/theme';
import * as LodgingService from '../services/lodging.service';
import { AtraccionesService, getProviderCompanyName, normalizeAttractionProvider, AttractionProvider } from '../services/atracciones.service';
import { getStorageItem, setStorageItem } from '../services/storage';

const { width } = Dimensions.get('window');

// ── JWT Decoder Helper for React Native ──────────────────────────────────────
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
    console.error('[JWT Decode Error]', e);
  }
  return null;
}

// ── Storage ─────────────────────────────────────────────────────────────────
// getStorageItem / setStorageItem se importan de ../services/storage:
// funcionan en web (localStorage) y en nativo/Expo Go (AsyncStorage).

// ── Formatting helpers ──────────────────────────────────────────────────────
function fmtDateShort(val: string): string {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function fmtDateTime(val: string): string {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-EC', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function fmtTime(val: string): string {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}

export default function ProfileScreen() {
  const router = useRouter();
  const isWeb = Platform.OS === 'web';

  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'alojamiento' | 'atracciones' | 'automoviles'>('alojamiento');

  const [reservations, setReservations] = useState<any[]>([]);
  const [attractionReservations, setAttractionReservations] = useState<any[]>([]);
  const [carReservations, setCarReservations] = useState<any[]>([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(true);

  // Visor Modal
  const [selectedReserva, setSelectedReserva] = useState<any>(null);
  const [tipoServicioActual, setTipoServicioActual] = useState<string>('unknown');
  const [detalleApiCaida, setDetallesApiCaida] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // GUIDs fijos
  const TIPO_ATRACCIONES_GUID = '5bbd422f-6ddb-48c3-86c3-28046ff263ee';
  const TIPO_ALOJAMIENTO_GUID = '7649eca9-0480-44b0-aaf0-2dcf4ebc45bc';
  const TIPO_AUTOS_GUID = '1c6219ac-9154-4fa7-9c4d-91b3a5d1e673';
  const TIPO_VUELOS_GUID = '55efed9f-f9f0-4376-acec-fa8c76954cc6';

  useEffect(() => {
    loadProfileAndReservations();
  }, []);

  const getServiceType = (reserva: any): 'lodging' | 'attractions' | 'cars' | 'flights' | 'unknown' => {
    if (!reserva) return 'unknown';

    const guidRef = reserva.guidServicioRef;
    if (guidRef === TIPO_ATRACCIONES_GUID) return 'attractions';
    if (guidRef === TIPO_ALOJAMIENTO_GUID) return 'lodging';
    if (guidRef === TIPO_AUTOS_GUID) return 'cars';
    if (guidRef === TIPO_VUELOS_GUID) return 'flights';

    const tipoInterno = String(reserva.tipoServicio ?? '').toLowerCase().trim();
    if (tipoInterno === 'atraccion' || tipoInterno === 'atracciones' || tipoInterno === 'attractions') return 'attractions';
    if (
      tipoInterno === 'auto' || tipoInterno === 'autos' ||
      tipoInterno === 'cars' || tipoInterno === 'vehiculo' || tipoInterno === 'vehículo'
    ) return 'cars';
    if (tipoInterno === 'alojamiento' || tipoInterno === 'lodging' || tipoInterno === 'hotel') return 'lodging';
    if (tipoInterno === 'vuelo' || tipoInterno === 'vuelos' || tipoInterno === 'flights') return 'flights';

    const tipo = String(reserva.tipoServicioSnap ?? '').toLowerCase().trim();
    if (tipo === '3' || tipo === 'atraccion' || tipo === 'atracciones' || tipo === 'atracción') return 'attractions';
    if (tipo === '1' || tipo === 'alojamiento' || tipo === 'hotel' || tipo === 'hospedaje') return 'lodging';
    if (
      tipo === '5' || tipo === '2' ||
      tipo === 'auto' || tipo === 'autos' ||
      tipo === 'automovil' || tipo === 'automoviles' || tipo === 'automóviles' ||
      tipo === 'vehiculo' || tipo === 'vehículo' || tipo === 'vehiculos' || tipo === 'vehículos'
    ) return 'cars';
    if (tipo === 'vuelo' || tipo === 'vuelos' || tipo === 'flight') return 'flights';

    const nombre = String(reserva.nombreServicioSnap ?? '').toLowerCase().trim();
    if (nombre === 'alojamiento') return 'lodging';
    if (Array.isArray(reserva.habitaciones) && reserva.habitaciones.length > 0) return 'lodging';

    return 'unknown';
  };

  const getReservationGradient = (res: any) => {
    const seed = res?.codigoReserva || res?.reservaGuid || '';
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % 5;
    const gradients = [
      ['#8E5A54', '#C6B17D'],
      ['#606256', '#C6B17D'],
      ['#8E5A54', '#46403C'],
      ['#606256', '#8E5A54'],
      ['#46403C', '#C6B17D'],
    ];
    return gradients[index] as [string, string];
  };

  const loadProfileAndReservations = async () => {
    setIsLoading(true);
    setIsLoadingReservations(true);

    const token = await getStorageItem('token');
    const guid = await getStorageItem('usuarioGuid');

    let clientGuid = guid;

    // Decode clientGuid from JWT token if available
    if (token) {
      const parsed = decodeJwt(token);
      if (parsed) {
        const resolved = parsed.clienteGuid || parsed.guidCliente || parsed.guid || parsed.sub || '';
        if (resolved) {
          clientGuid = resolved;
          await setStorageItem('clienteGuid', resolved);
        }
      }
    }

    if (!token || !guid) {
      // Setup Guest Profile
      const guestUser = {
        name: 'Huésped Invitado',
        email: 'invitado@pooking.ec',
        memberSince: new Date().toLocaleDateString('es-EC'),
        level: 'Explorador',
        avatarUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        coverUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
        stats: { trips: 0, lodgingCount: 0, attractionsCount: 0, carsCount: 0 },
      };
      setUser(guestUser);
      setIsLoading(false);
      await loadLocalReservations(guestUser);
      return;
    }

    // Fetch Profile from Gateway
    try {
      const url = `${process.env.EXPO_PUBLIC_API_GATEWAY_URL}/api/v2/booking/clientes/usuario-guid/${guid}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const responseData = await res.json();
        if (responseData && responseData.data) {
          const data = responseData.data;
          const actualGuidCliente = data.guidCliente || data.clienteGuid || data.guid;
          if (actualGuidCliente) {
            await setStorageItem('guidCliente', actualGuidCliente);
            await setStorageItem('clienteGuid', actualGuidCliente);
            clientGuid = actualGuidCliente;
          }

          const profileUser = {
            name: `${data.nombres} ${data.apellidos}`,
            email: data.correo,
            memberSince: data.fechaRegistroUtc ? new Date(data.fechaRegistroUtc).toLocaleDateString('es-EC') : 'N/A',
            level: 'Viajero Frecuente',
            avatarUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
            coverUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
            stats: { trips: 0, lodgingCount: 0, attractionsCount: 0, carsCount: 0 },
            ...data,
          };
          setUser(profileUser);
          setIsLoading(false);
          await loadReservationsFromMiddleware(clientGuid!, token!, profileUser);
          return;
        }
      }
    } catch (err) {
      console.warn('Error fetching profile from API, fallback to Guest', err);
    }

    // Fail safe profile
    const fallbackUser = {
      name: 'Huésped Invitado',
      email: 'invitado@pooking.ec',
      memberSince: new Date().toLocaleDateString('es-EC'),
      level: 'Explorador',
      avatarUrl: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
      coverUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80',
      stats: { trips: 0, lodgingCount: 0, attractionsCount: 0, carsCount: 0 },
    };
    setUser(fallbackUser);
    setIsLoading(false);
    await loadLocalReservations(fallbackUser);
  };

  const loadReservationsFromMiddleware = async (guidCliente: string, token: string, activeUser: any) => {
    try {
      const url = `${process.env.EXPO_PUBLIC_API_GATEWAY_URL}/api/v2/booking/reservas/cliente/${guidCliente}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        await loadLocalReservations(activeUser);
        return;
      }

      const response = await res.json();
      let items: any[] = [];
      if (response) {
        if (response.data?.items && Array.isArray(response.data.items)) {
          items = response.data.items;
        } else if (response.data && Array.isArray(response.data)) {
          items = response.data;
        } else if (Array.isArray(response)) {
          items = response;
        } else if (response.items && Array.isArray(response.items)) {
          items = response.items;
        }
      }

      const lodgingItems = items.filter((it: any) => getServiceType(it) === 'lodging');
      const attractionItems = items.filter((it: any) => getServiceType(it) === 'attractions');
      const carItems = items.filter((it: any) => getServiceType(it) === 'cars');

      // 1. LODGING RESERVATIONS
      const lodgings = await Promise.all(
        lodgingItems.map(async (bk: any) => {
          const providerName = bk.nombreProveedor || 'juan';
          const externalId = bk.idReservaExterna || bk.reservaGuid;

          try {
            const details = await LodgingService.getReservaByGuid(providerName, externalId);
            const sucursalGuid = details?.sucursalGuid || bk.guidServicioRef;
            let lodgingInfo = null;
            if (sucursalGuid) {
              lodgingInfo = await LodgingService.getLodgingById(sucursalGuid, providerName);
            }

            const total = bk.montoTotal || 0;
            const subtotal = total / 1.15;
            const iva = total - subtotal;

            return {
              ...(details || {}),
              reservaGuid: bk.guidReserva || externalId,
              codigoReserva: bk.idReservaExterna || bk.guidReserva || externalId,
              clienteGuid: bk.guidClienteRef || guidCliente,
              sucursalGuid,
              fechaReservaUtc: bk.fechaReservaUtc || '',
              fechaInicio: bk.fechaInicio,
              fechaFin: bk.fechaFin,
              subtotalReserva: details?.subtotalReserva || subtotal,
              valorIva: details?.valorIva || iva,
              totalReserva: total,
              descuentoAplicado: 0,
              saldoPendiente: total,
              origenCanalReserva: bk.canalOrigen || 'Pooking',
              estadoReserva: mapEstado(bk.estado),
              provider: providerName,
              lodgingName: lodgingInfo?.nombre || bk.nombreServicioSnap || bk.nombreHotel || 'Alojamiento',
              lodgingImage: lodgingInfo?.imagen || '',
              cliente: {
                nombres: `${activeUser.nombres || ''} ${activeUser.apellidos || ''}`.trim() || activeUser.name,
                correo: activeUser.correo || activeUser.email,
                telefono: activeUser.telefono || '—',
                direccion: activeUser.direccion || '—',
              },
              habitaciones: details?.habitaciones || [],
            };
          } catch {
            const total = bk.montoTotal || 0;
            const subtotal = total / 1.15;
            const iva = total - subtotal;
            return {
              reservaGuid: bk.guidReserva,
              codigoReserva: bk.idReservaExterna || bk.guidReserva,
              clienteGuid: bk.guidClienteRef || guidCliente,
              sucursalGuid: bk.guidServicioRef || '',
              fechaReservaUtc: bk.fechaReservaUtc || '',
              fechaInicio: bk.fechaInicio,
              fechaFin: bk.fechaFin,
              subtotalReserva: subtotal,
              valorIva: iva,
              totalReserva: total,
              descuentoAplicado: 0,
              saldoPendiente: total,
              origenCanalReserva: bk.canalOrigen || 'Pooking',
              estadoReserva: mapEstado(bk.estado),
              provider: providerName,
              lodgingName: bk.nombreServicioSnap || bk.nombreHotel || 'Alojamiento',
              lodgingImage: '',
              cliente: {
                nombres: `${activeUser.nombres || ''} ${activeUser.apellidos || ''}`.trim() || activeUser.name,
                correo: activeUser.correo || activeUser.email,
                telefono: activeUser.telefono || '—',
                direccion: activeUser.direccion || '—',
              },
              habitaciones: [],
            };
          }
        })
      );

      // 2. ATTRACTION RESERVATIONS
      const attractions = await Promise.all(
        attractionItems.map(async (bk: any) => {
          const rawProvider = bk.nombreProveedor || 'jhonatan';
          const providerName = (normalizeAttractionProvider(rawProvider) || 'jhonatan') as AttractionProvider;
          const externalId = bk.idReservaExterna || bk.reservaGuid;

          try {
            const details = await AtraccionesService.getReservaDetalle(externalId, providerName);
            const total = bk.montoTotal || 0;
            const subtotal = total / 1.15;
            const iva = total - subtotal;

            return {
              reservaGuid: details?.rev_guid || externalId,
              idReservaExterna: externalId,
              codigoReserva: details?.rev_codigo || `RES-${externalId.substring(0, 8).toUpperCase()}`,
              clienteGuid: bk.guidClienteRef || guidCliente,
              sucursalGuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
              fechaReservaUtc: bk.fechaReservaUtc || details?.rev_fecha_reserva_utc || new Date().toISOString(),
              fechaInicio: bk.fechaInicio || details?.hor_fecha || new Date().toISOString(),
              fechaFin: bk.fechaFin || details?.hor_fecha || new Date().toISOString(),
              subtotalReserva: details?.rev_subtotal || subtotal,
              valorIva: details?.rev_valor_iva || iva,
              totalReserva: details?.rev_total || total,
              descuentoAplicado: 0,
              saldoPendiente: details?.rev_total || total,
              origenCanalReserva: bk.canalOrigen || 'MARKETPLACE',
              estadoReserva: mapEstado(bk.estado),
              provider: providerName,
              tipoServicio: 'atraccion',
              lodgingName: details?.atraccion_nombre || bk.nombreServicioSnap || 'Atracción Turística',
              lodgingImage: '',
              cliente: {
                nombres: `${activeUser.nombres || ''} ${activeUser.apellidos || ''}`.trim() || activeUser.name,
                correo: activeUser.correo || activeUser.email,
                telefono: activeUser.telefono || '—',
                direccion: activeUser.direccion || '—',
              },
              detalleAtraccion: details?.detalle || [],
            };
          } catch {
            const total = bk.montoTotal || 0;
            const subtotal = total / 1.15;
            const iva = total - subtotal;
            return {
              reservaGuid: bk.guidReserva,
              idReservaExterna: externalId,
              codigoReserva: bk.idReservaExterna || bk.guidReserva,
              clienteGuid: bk.guidClienteRef || guidCliente,
              sucursalGuid: bk.guidServicioRef || '',
              fechaReservaUtc: bk.fechaReservaUtc || '',
              fechaInicio: bk.fechaInicio,
              fechaFin: bk.fechaFin || bk.fechaInicio,
              subtotalReserva: subtotal,
              valorIva: iva,
              totalReserva: total,
              descuentoAplicado: 0,
              saldoPendiente: total,
              origenCanalReserva: bk.canalOrigen || 'Pooking',
              estadoReserva: mapEstado(bk.estado),
              provider: providerName,
              tipoServicio: 'atraccion',
              lodgingName: bk.nombreServicioSnap || 'Atracción Turística',
              lodgingImage: '',
              cliente: {
                nombres: `${activeUser.nombres || ''} ${activeUser.apellidos || ''}`.trim() || activeUser.name,
                correo: activeUser.correo || activeUser.email,
                telefono: activeUser.telefono || '—',
                direccion: activeUser.direccion || '—',
              },
              detalleAtraccion: [],
            };
          }
        })
      );

      // 3. CAR RESERVATIONS
      const cars = carItems.map((bk: any) => {
        const providerName = bk.nombreProveedor || 'kelvin';
        const externalId = bk.idReservaExterna || bk.reservaGuid || bk.guidReserva;
        const cod = externalId.startsWith('guid-') ? externalId.substring(5) : `RES-${externalId.substring(0, 8).toUpperCase()}`;

        const total = bk.montoTotal || 0;
        const subtotal = total / 1.15;
        const iva = total - subtotal;

        return {
          reservaGuid: bk.guidReserva || externalId,
          codigoReserva: bk.idReservaExterna || cod,
          clienteGuid: bk.guidClienteRef || guidCliente,
          sucursalGuid: bk.guidServicioRef || '',
          fechaReservaUtc: bk.fechaReservaUtc || '',
          fechaInicio: bk.fechaInicio,
          fechaFin: bk.fechaFin || bk.fechaInicio,
          subtotalReserva: subtotal,
          valorIva: iva,
          totalReserva: total,
          descuentoAplicado: 0,
          saldoPendiente: total,
          origenCanalReserva: bk.canalOrigen || 'Pooking',
          estadoReserva: mapEstado(bk.estado),
          provider: providerName,
          tipoServicio: 'auto',
          lodgingName: bk.nombreServicioSnap || 'Vehículo Sedán Familiar',
          lodgingImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500&q=80',
          cliente: {
            nombres: `${activeUser.nombres || ''} ${activeUser.apellidos || ''}`.trim() || activeUser.name,
            correo: activeUser.correo || activeUser.email,
            telefono: activeUser.telefono || '—',
            direccion: activeUser.direccion || '—',
          },
          habitaciones: [],
        };
      });

      setReservations(lodgings);
      setAttractionReservations(attractions);
      setCarReservations(cars);

      setUser((prev: any) => ({
        ...prev,
        stats: {
          lodgingCount: lodgings.length,
          attractionsCount: attractions.length,
          carsCount: cars.length,
          trips: lodgings.length + attractions.length + cars.length,
        },
      }));

      setIsLoadingReservations(false);
    } catch (err) {
      console.warn('Error fetching reservations, fallback to local', err);
      await loadLocalReservations(activeUser);
    }
  };

  const loadLocalReservations = async (activeUser: any) => {
    setIsLoadingReservations(true);
    let localBookings: any[] = [];
    try {
      const bookingsStr = (await getStorageItem('pooking_lodging_reservations')) || '[]';
      localBookings = JSON.parse(bookingsStr);
    } catch (e) {
      console.error('Error parsing local lodging reservations:', e);
    }

    const guid = await getStorageItem('usuarioGuid');
    const userEmail = activeUser?.email;

    const filteredBookings = localBookings.filter((bk: any) => {
      if (bk.usuarioGuid && guid) {
        return bk.usuarioGuid === guid;
      }
      if (bk.clienteEmail && userEmail) {
        return bk.clienteEmail.toLowerCase() === userEmail.toLowerCase();
      }
      return false;
    });

    const lodgings = await Promise.all(
      filteredBookings.map(async (bk: any) => {
        try {
          const res = await LodgingService.getReservaByGuid(bk.provider, bk.reservaGuid);
          if (res) {
            return {
              ...res,
              provider: bk.provider,
              lodgingName: bk.lodgingName || 'Alojamiento',
              lodgingImage: bk.lodgingImage || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80',
              cliente: {
                nombres: bk.clienteNombre || activeUser?.name || 'Invitado',
                correo: bk.clienteEmail || activeUser?.email || 'invitado@example.com',
                telefono: bk.clienteTelefono || '—',
                direccion: bk.clienteDireccion || '—',
              },
            };
          }
        } catch {}

        const cod = bk.reservaGuid.startsWith('guid-') ? bk.reservaGuid.substring(5) : `RES-${bk.reservaGuid.substring(0, 8).toUpperCase()}`;
        return {
          reservaGuid: bk.reservaGuid,
          codigoReserva: cod,
          clienteGuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          sucursalGuid: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          fechaReservaUtc: new Date().toISOString(),
          fechaInicio: bk.fechaInicio + 'T14:00:00.000Z',
          fechaFin: new Date(new Date(bk.fechaInicio).getTime() + 172800000).toISOString().substring(0, 10) + 'T12:00:00.000Z',
          subtotalReserva: 180.00,
          valorIva: 27.00,
          totalReserva: 207.00,
          descuentoAplicado: 0,
          saldoPendiente: 207.00,
          origenCanalReserva: 'MARKETPLACE',
          estadoReserva: 'PEN',
          provider: bk.provider,
          lodgingName: bk.lodgingName,
          lodgingImage: bk.lodgingImage || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80',
          cliente: {
            nombres: bk.clienteNombre || activeUser?.name || 'Invitado',
            correo: bk.clienteEmail || activeUser?.email || 'invitado@example.com',
            telefono: bk.clienteTelefono || '—',
            direccion: bk.clienteDireccion || '—',
          },
          habitaciones: [
            {
              reservaHabitacionGuid: 'res-hab-guid-mock',
              habitacionGuid: 'hab-guid-mock',
              fechaInicio: bk.fechaInicio + 'T14:00:00.000Z',
              fechaFin: new Date(new Date(bk.fechaInicio).getTime() + 172800000).toISOString().substring(0, 10) + 'T12:00:00.000Z',
              numAdultos: 2,
              numNinos: 0,
              precioNocheAplicado: 90.00,
              subtotalLinea: 180.00,
              valorIvaLinea: 27.00,
              descuentoLinea: 0,
              totalLinea: 207.00,
              estadoDetalle: 'PEN',
              tipoHabitacion: 'Suite Ejecutiva',
            },
          ],
        };
      })
    );

    setReservations(lodgings);
    setAttractionReservations([]);
    setCarReservations([]);

    setUser((prev: any) => ({
      ...prev,
      stats: {
        lodgingCount: lodgings.length,
        attractionsCount: 0,
        carsCount: 0,
        trips: lodgings.length,
      },
    }));

    setIsLoadingReservations(false);
  };

  const mapEstado = (estado: string): string => {
    const e = (estado || '').toUpperCase();
    if (e === 'PEND' || e === 'PENDIENTE' || e === 'PEN') return 'PEN';
    if (e === 'CONF' || e === 'CONFIRMADA' || e === 'CON' || e === 'CON-PAGO') return 'CON';
    if (e === 'CANC' || e === 'CANCELADA' || e === 'CAN') return 'CAN';
    return 'PEN';
  };

  const openReservaDetails = async (reserva: any) => {
    setSelectedReserva(reserva);
    setDetallesApiCaida(null);
    const serviceType = getServiceType(reserva);
    setTipoServicioActual(serviceType);
    setIsLoadingDetail(true);

    if (serviceType === 'lodging') {
      if (reserva.sucursalGuid && reserva.provider) {
        try {
          const lodging = await LodgingService.getLodgingById(reserva.sucursalGuid, reserva.provider);
          if (lodging && lodging.habitaciones && reserva.habitaciones) {
            const updatedRooms = reserva.habitaciones.map((rm: any) => {
              const roomMatch = lodging.habitaciones.find((r: any) => r.id === rm.habitacionGuid);
              return {
                ...rm,
                tipoHabitacion: roomMatch ? roomMatch.nombre : (rm.tipoHabitacion || 'Habitación Premium'),
              };
            });
            setSelectedReserva((prev: any) => ({ ...prev, habitaciones: updatedRooms }));
          }
        } catch {
          setDetallesApiCaida(
            'No se pudo obtener el detalle actualizado del proveedor. Se muestra la información guardada en tu historial.'
          );
        }
      }
    } else if (serviceType === 'attractions') {
      const raw = reserva.provider || reserva.nombreProveedor || 'jhonatan';
      const providerTecnico = (normalizeAttractionProvider(raw) || 'jhonatan') as AttractionProvider;
      const revGuid = reserva.idReservaExterna || reserva.codigoReserva || reserva.reservaGuid;

      if (providerTecnico && revGuid) {
        try {
          const details = await AtraccionesService.getReservaDetalle(revGuid, providerTecnico);
          if (details) {
            const revEstado = String(details.rev_estado ?? '').toUpperCase();
            let estadoCorto = reserva.estadoReserva;
            if (revEstado === 'PAGADA' || revEstado === 'PAG' || revEstado === 'CONFIRMADA') {
              estadoCorto = 'CON';
            } else if (revEstado === 'PENDIENTE' || revEstado === 'PEND' || revEstado === 'PEN') {
              estadoCorto = 'PEN';
            } else if (revEstado === 'CANCELADA' || revEstado === 'CANC' || revEstado === 'CAN') {
              estadoCorto = 'CAN';
            }

            const totalReal = details.rev_total ?? reserva.totalReserva;
            const yaPagada = revEstado === 'PAGADA' || revEstado === 'PAG' || revEstado === 'CONFIRMADA';

            setSelectedReserva((prev: any) => ({
              ...prev,
              codigoReserva: details.rev_codigo ?? prev.codigoReserva,
              lodgingName: details.atraccion_nombre ?? prev.lodgingName,
              fechaInicio: details.hor_fecha ? `${details.hor_fecha}T${details.hor_hora_inicio || '00:00'}:00` : prev.fechaInicio,
              fechaFin: details.hor_fecha ? `${details.hor_fecha}T${details.hor_hora_fin || '23:59'}:00` : prev.fechaFin,
              moneda: details.moneda ?? prev.moneda ?? 'USD',
              estadoReserva: estadoCorto,
              estadoReservaProveedor: details.rev_estado ?? '',
              subtotalReserva: details.rev_subtotal ?? prev.subtotalReserva,
              valorIva: details.rev_valor_iva ?? prev.valorIva,
              totalReserva: totalReal,
              saldoPendiente: yaPagada ? 0 : totalReal,
              fechaReservaUtc: details.rev_fecha_reserva_utc ?? prev.fechaReservaUtc,
              detalleAtraccion: details.detalle ?? [],
            }));
          }
        } catch (err: any) {
          const providerLbl = getProviderCompanyName(providerTecnico);
          setDetallesApiCaida(`El proveedor ${providerLbl} no está disponible en este momento. Se muestra la información guardada en tu historial.`);
        }
      }
    }

    setIsLoadingDetail(false);
  };

  const closeReservaDetails = () => {
    setSelectedReserva(null);
    setTipoServicioActual('unknown');
    setDetallesApiCaida(null);
  };

  const isReservaPagada = (reserva: any): boolean => {
    const e = String(reserva?.estadoReserva ?? reserva?.estadoReservaProveedor ?? '').toUpperCase().trim();
    return e === 'PAG' || e === 'PAGADA' || e === 'CONFIRMADA' || e === 'CON';
  };

  const getStatusStyle = (estado: string) => {
    const e = mapEstado(estado);
    if (e === 'CON') return styles.statusConfirmed;
    if (e === 'CAN') return styles.statusCancelled;
    return styles.statusPending;
  };

  const getStatusText = (estado: string) => {
    const e = mapEstado(estado);
    if (e === 'CON') return 'Confirmada';
    if (e === 'CAN') return 'Cancelada';
    return 'Pendiente';
  };

  // Get active lists based on tab
  const getActiveList = () => {
    if (activeTab === 'alojamiento') return reservations;
    if (activeTab === 'atracciones') return attractionReservations;
    return carReservations;
  };

  const activeReservationsCount = getActiveList().length;

  return (
    <View style={styles.root}>
      <Navbar />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.titulo} />
            <Text style={styles.loadingText}>Cargando perfil...</Text>
          </View>
        ) : (
          user && (
            <View style={styles.mainContainer}>
              {/* Cover Banner */}
              <View style={styles.profileHeader}>
                <Image source={{ uri: user.coverUrl }} style={styles.coverImage} resizeMode="cover" />
                <View style={styles.coverOverlay} />

                <View style={styles.profileInfoWrapper}>
                  <View style={styles.avatarContainer}>
                    <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
                    <View style={styles.levelBadge}>
                      <Ionicons name="star" size={16} color="#fff" />
                    </View>
                  </View>

                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <View style={styles.userMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons name="card-outline" size={15} color={Colors.titulo} />
                        <Text style={styles.metaText}>{user.level}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={15} color={Colors.titulo} />
                        <Text style={styles.metaText}>Miembro desde {user.memberSince}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Grid content */}
              <View style={[styles.contentLayout, isWeb && styles.contentLayoutWeb]}>
                {/* Stats Sidebar */}
                <View style={[styles.sidebar, isWeb ? { width: 300 } : { width: '100%' }]}>
                  <View style={styles.statsCard}>
                    <Text style={styles.sidebarTitle}>Estadísticas de Viajes</Text>
                    <View style={styles.statItem}>
                      <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(142, 90, 84, 0.1)' }]}>
                        <Ionicons name="bed-outline" size={22} color={Colors.titulo} />
                      </View>
                      <View style={styles.statInfo}>
                        <Text style={styles.statValue}>{user.stats?.lodgingCount || 0}</Text>
                        <Text style={styles.statLabel}>Alojamientos</Text>
                      </View>
                    </View>

                    <View style={styles.statItem}>
                      <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(198, 177, 125, 0.2)' }]}>
                        <Ionicons name="ticket-outline" size={22} color={Colors.extra2} />
                      </View>
                      <View style={styles.statInfo}>
                        <Text style={styles.statValue}>{user.stats?.attractionsCount || 0}</Text>
                        <Text style={styles.statLabel}>Atracciones</Text>
                      </View>
                    </View>

                    <View style={styles.statItem}>
                      <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(96, 98, 86, 0.1)' }]}>
                        <Ionicons name="car-outline" size={22} color={Colors.subtitulo} />
                      </View>
                      <View style={styles.statInfo}>
                        <Text style={styles.statValue}>{user.stats?.carsCount || 0}</Text>
                        <Text style={styles.statLabel}>Automóviles</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Main panel */}
                <View style={styles.mainPanel}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Tus Reservas Activas</Text>
                    <View style={styles.badgeWrapper}>
                      <Text style={styles.reservationsBadge}>{activeReservationsCount} activa(s)</Text>
                    </View>
                  </View>

                  {/* Tabs */}
                  <View style={styles.profileTabs}>
                    <TouchableOpacity style={[styles.tabButton, activeTab === 'alojamiento' && styles.tabButtonActive]} onPress={() => setActiveTab('alojamiento')}>
                      <Ionicons name="bed-outline" size={17} color={activeTab === 'alojamiento' ? Colors.titulo : Colors.subtitulo} />
                      <Text style={[styles.tabButtonText, activeTab === 'alojamiento' && styles.tabButtonTextActive]}>Alojamientos</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.tabButton, activeTab === 'atracciones' && styles.tabButtonActive]} onPress={() => setActiveTab('atracciones')}>
                      <Ionicons name="ticket-outline" size={17} color={activeTab === 'atracciones' ? Colors.titulo : Colors.subtitulo} />
                      <Text style={[styles.tabButtonText, activeTab === 'atracciones' && styles.tabButtonTextActive]}>Atracciones</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.tabButton, activeTab === 'automoviles' && styles.tabButtonActive]} onPress={() => setActiveTab('automoviles')}>
                      <Ionicons name="car-outline" size={17} color={activeTab === 'automoviles' ? Colors.titulo : Colors.subtitulo} />
                      <Text style={[styles.tabButtonText, activeTab === 'automoviles' && styles.tabButtonTextActive]}>Automóviles</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Reservations display */}
                  {isLoadingReservations ? (
                    <View style={styles.loaderBox}>
                      <ActivityIndicator size="large" color={Colors.titulo} />
                      <Text style={styles.loaderBoxText}>Consultando tus reservas con los proveedores...</Text>
                    </View>
                  ) : (
                    <View style={[styles.tripsGrid, isWeb && styles.tripsGridWeb]}>
                      {getActiveList().map((res, index) => {
                        const gradient = getReservationGradient(res);
                        return (
                          <View key={res.reservaGuid || index} style={[styles.tripCard, isWeb && styles.tripCardWeb]}>
                            {res.lodgingImage ? (
                              <Image source={{ uri: res.lodgingImage }} style={styles.tripImage} />
                            ) : (
                              <LinearGradient colors={gradient} style={styles.tripImage} />
                            )}
                            <View style={styles.statusBadgeWrapper}>
                              <View style={[styles.statusTag, getStatusStyle(res.estadoReserva)]}>
                                <Text style={[styles.statusTagText, getStatusStyle(res.estadoReserva)]}>{getStatusText(res.estadoReserva)}</Text>
                              </View>
                            </View>

                            <View style={styles.tripDetails}>
                              <Text style={styles.providerTag}>{res.lodgingName.toUpperCase()}</Text>
                              <Text style={styles.tripDestination} numberOfLines={2}>{res.lodgingName}</Text>
                              <View style={styles.tripRow}>
                                <Ionicons name="calendar-outline" size={14} color={Colors.extra2} />
                                <Text style={styles.tripRowText}>
                                  {fmtDateShort(res.fechaInicio)}
                                  {activeTab !== 'atracciones' && ` → ${fmtDateShort(res.fechaFin)}`}
                                </Text>
                              </View>
                              <View style={styles.tripRow}>
                                <Ionicons name="barcode-outline" size={14} color={Colors.extra2} />
                                <Text style={styles.tripRowText}>Código: {res.codigoReserva}</Text>
                              </View>
                              <View style={styles.tripRow}>
                                <Ionicons name="wallet-outline" size={14} color={Colors.extra2} />
                                <Text style={styles.tripRowText}>Total: ${Number(res.totalReserva || 0).toFixed(2)} USD</Text>
                              </View>

                              <TouchableOpacity style={styles.btnManage} onPress={() => openReservaDetails(res)}>
                                <Text style={styles.btnManageText}>Ver detalles del contrato →</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}

                      {/* Add New Booking Card */}
                      <TouchableOpacity style={[styles.tripCard, styles.addNewTrip, isWeb && styles.tripCardWeb]} onPress={() => router.push('/')}>
                        <View style={styles.addIconWrapper}>
                          <Ionicons name="add" size={28} color="#fff" />
                        </View>
                        <Text style={styles.addTripTitle}>
                          {activeTab === 'alojamiento' ? 'Reservar otro hotel' : activeTab === 'atracciones' ? 'Reservar Atracciones' : 'Alquilar Automóvil'}
                        </Text>
                        <Text style={styles.addTripDesc}>
                          {activeTab === 'alojamiento' ? 'Explora hospedajes en Pooking' : activeTab === 'atracciones' ? 'Explora actividades en Pooking' : 'Explora vehículos en Pooking'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )
        )}
        <Footer />
      </ScrollView>

      {/* PREMIUM CONTRACT VISOR MODAL */}
      <Modal visible={!!selectedReserva} transparent animationType="slide" onRequestClose={closeReservaDetails}>
        <View style={styles.modalOverlay}>
          {selectedReserva && (
            <View style={styles.modalCardContract}>
              {/* Header */}
              <View style={styles.contractHeader}>
                <View>
                  <Text style={styles.contractBadgeProvider}>{selectedReserva.lodgingName.toUpperCase()}</Text>
                  <Text style={styles.contractTitle}>Resumen de Contrato de Reserva</Text>
                </View>
                <TouchableOpacity style={styles.contractCloseBtn} onPress={closeReservaDetails}>
                  <Ionicons name="close" size={24} color={Colors.subtitulo} />
                </TouchableOpacity>
              </View>

              {isLoadingDetail ? (
                <View style={styles.detailLoader}>
                  <ActivityIndicator size="large" color={Colors.titulo} />
                  <Text style={styles.detailLoaderText}>Cargando detalles adicionales...</Text>
                </View>
              ) : (
                <ScrollView contentContainerStyle={styles.contractBody} showsVerticalScrollIndicator={false}>
                  {/* Banner */}
                  <View style={styles.hotelBanner}>
                    {selectedReserva.lodgingImage ? (
                      <Image source={{ uri: selectedReserva.lodgingImage }} style={StyleSheet.absoluteFill} />
                    ) : (
                      <LinearGradient colors={getReservationGradient(selectedReserva)} style={StyleSheet.absoluteFill} />
                    )}
                    <View style={styles.hotelBannerOverlay} />
                    <View style={styles.bannerInfo}>
                      <Text style={styles.bannerHotelName}>{selectedReserva.lodgingName}</Text>
                      <View style={styles.bannerLoc}>
                        <Ionicons name="pin" size={14} color={Colors.extra2} />
                        <Text style={styles.bannerLocText}>Ecuador</Text>
                      </View>
                    </View>
                    <View style={[styles.bannerStatus, getStatusStyle(selectedReserva.estadoReserva)]}>
                      <Text style={[styles.bannerStatusText, getStatusStyle(selectedReserva.estadoReserva)]}>{getStatusText(selectedReserva.estadoReserva)}</Text>
                    </View>
                  </View>

                  {/* Warning banner */}
                  {detalleApiCaida && (
                    <View style={styles.warningBanner}>
                      <Ionicons name="information-circle" size={18} color="#b25a00" style={{ marginTop: 2 }} />
                      <Text style={styles.warningText}>{detalleApiCaida}</Text>
                    </View>
                  )}

                  {/* Content Grid */}
                  <View style={[styles.contractLayoutGrid, isWeb && styles.contractLayoutGridWeb]}>
                    {/* Left Column */}
                    <View style={styles.contractCol}>
                      {/* Booking IDs */}
                      <View style={styles.contractSection}>
                        <Text style={styles.sectionSubtitle}>
                          <Ionicons name="information-circle-outline" size={16} color={Colors.titulo} /> Identificación de Reserva
                        </Text>
                        <View style={styles.fieldsGrid}>
                          <View style={styles.fieldItem}>
                            <Text style={styles.fieldLabel}>CÓDIGO DE RESERVA</Text>
                            <Text style={styles.fieldValueHighlight}>{selectedReserva.codigoReserva}</Text>
                          </View>
                          <View style={styles.fieldItem}>
                            <Text style={styles.fieldLabel}>
                              {tipoServicioActual === 'attractions' ? 'NOMBRE DE LA ATRACCIÓN' : tipoServicioActual === 'cars' ? 'VEHÍCULO RESERVADO' : 'NOMBRE DE LA SUCURSAL'}
                            </Text>
                            <Text style={styles.fieldValueBold}>{selectedReserva.lodgingName}</Text>
                          </View>
                          {selectedReserva.provider && (
                            <View style={styles.fieldItem}>
                              <Text style={styles.fieldLabel}>PROVEEDOR</Text>
                              <Text style={styles.fieldValueBold}>{getProviderCompanyName(selectedReserva.provider)}</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Guest and Stay Details */}
                      <View style={styles.contractSection}>
                        <Text style={styles.sectionSubtitle}>
                          <Ionicons name="person-outline" size={16} color={Colors.titulo} />{' '}
                          {tipoServicioActual === 'attractions' ? 'Datos del Cliente & Visita' : tipoServicioActual === 'cars' ? 'Datos del Conductor & Alquiler' : 'Datos del Huésped & Estancia'}
                        </Text>
                        <View style={styles.fieldsGrid}>
                          <View style={styles.fieldItem}>
                            <Text style={styles.fieldLabel}>
                              {tipoServicioActual === 'attractions' ? 'CLIENTE' : tipoServicioActual === 'cars' ? 'CONDUCTOR' : 'HUÉSPED'}
                            </Text>
                            <Text style={styles.fieldValueBold}>{selectedReserva.cliente?.nombres || 'Invitado'}</Text>
                          </View>
                          {selectedReserva.cliente?.correo && (
                            <View style={styles.fieldItem}>
                              <Text style={styles.fieldLabel}>CORREO</Text>
                              <Text style={styles.fieldValue}>{selectedReserva.cliente.correo}</Text>
                            </View>
                          )}
                          {selectedReserva.cliente?.telefono && (
                            <View style={styles.fieldItem}>
                              <Text style={styles.fieldLabel}>TELÉFONO</Text>
                              <Text style={styles.fieldValue}>{selectedReserva.cliente.telefono}</Text>
                            </View>
                          )}
                          {selectedReserva.cliente?.direccion && (
                            <View style={styles.fieldItem}>
                              <Text style={styles.fieldLabel}>DIRECCIÓN</Text>
                              <Text style={styles.fieldValue}>{selectedReserva.cliente.direccion}</Text>
                            </View>
                          )}

                          {tipoServicioActual === 'attractions' ? (
                            <>
                              <View style={styles.fieldItem}>
                                <Text style={styles.fieldLabel}>FECHA DE VISITA</Text>
                                <Text style={styles.fieldValue}>{fmtDateShort(selectedReserva.fechaInicio)}</Text>
                              </View>
                              {fmtTime(selectedReserva.fechaInicio) !== '' && (
                                <View style={styles.fieldItem}>
                                  <Text style={styles.fieldLabel}>HORARIO</Text>
                                  <Text style={styles.fieldValue}>
                                    {fmtTime(selectedReserva.fechaInicio)}
                                    {fmtTime(selectedReserva.fechaFin) && fmtTime(selectedReserva.fechaFin) !== fmtTime(selectedReserva.fechaInicio) ? ` – ${fmtTime(selectedReserva.fechaFin)}` : ''}
                                  </Text>
                                </View>
                              )}
                            </>
                          ) : (
                            <>
                              <View style={styles.fieldItem}>
                                <Text style={styles.fieldLabel}>{tipoServicioActual === 'cars' ? 'RECOGIDA' : 'CHECK-IN'}</Text>
                                <Text style={styles.fieldValue}>{fmtDateTime(selectedReserva.fechaInicio)}</Text>
                              </View>
                              <View style={styles.fieldItem}>
                                <Text style={styles.fieldLabel}>{tipoServicioActual === 'cars' ? 'DEVOLUCIÓN' : 'CHECK-OUT'}</Text>
                                <Text style={styles.fieldValue}>{fmtDateTime(selectedReserva.fechaFin)}</Text>
                              </View>
                            </>
                          )}
                        </View>
                      </View>

                      {/* Observations */}
                      <View style={styles.contractSection}>
                        <Text style={styles.sectionSubtitle}>
                          <Ionicons name="document-text-outline" size={16} color={Colors.titulo} /> Información de Origen
                        </Text>
                        <View style={styles.fieldsGrid}>
                          <View style={styles.fieldItem}>
                            <Text style={styles.fieldLabel}>FECHA DE RESERVA</Text>
                            <Text style={styles.fieldValue}>{fmtDateTime(selectedReserva.fechaReservaUtc)}</Text>
                          </View>
                          <View style={styles.fieldItem}>
                            <Text style={styles.fieldLabel}>OBSERVACIONES</Text>
                            <Text style={[styles.fieldValue, { fontStyle: 'italic' }]}>
                              "{selectedReserva.observaciones || 'Sin observaciones adicionales'}"
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Right Column */}
                    <View style={styles.contractCol}>
                      {/* Financial breakdown */}
                      <View style={[styles.contractSection, styles.financeCard]}>
                        <Text style={styles.sectionSubtitle}>
                          <Ionicons name="receipt-outline" size={16} color={Colors.titulo} /> Desglose Financiero
                        </Text>
                        <View style={styles.financeRows}>
                          {/* Room costs for Lodgings */}
                          {(tipoServicioActual === 'lodging' || tipoServicioActual === 'unknown') &&
                            selectedReserva.habitaciones?.map((rm: any, idx: number) => (
                              <View key={rm.reservaHabitacionGuid || idx} style={styles.financeRow}>
                                <Text style={styles.financeLabel}>COSTO {rm.tipoHabitacion?.toUpperCase() || 'HABITACIÓN'}</Text>
                                <Text style={styles.financeValue}>${Number(rm.totalLinea || 0).toFixed(2)} USD</Text>
                              </View>
                            ))}

                          {/* Ticket costs for Attractions */}
                          {tipoServicioActual === 'attractions' &&
                            selectedReserva.detalleAtraccion?.map((tk: any, idx: number) => (
                              <View key={tk.rev_det_guid || idx} style={styles.financeRow}>
                                <Text style={styles.financeLabel}>
                                  {tk.cantidad} × {tk.tck_tipo_participante?.toUpperCase() || 'TICKET'}
                                </Text>
                                <Text style={styles.financeValue}>${Number(tk.subtotal || 0).toFixed(2)} USD</Text>
                              </View>
                            ))}

                          <View style={styles.financeDivider} />
                          <View style={styles.financeRow}>
                            <Text style={styles.financeLabel}>SUBTOTAL RESERVA</Text>
                            <Text style={styles.financeValue}>${Number(selectedReserva.subtotalReserva || 0).toFixed(2)} USD</Text>
                          </View>
                          <View style={styles.financeRow}>
                            <Text style={styles.financeLabel}>VALOR IVA (15%)</Text>
                            <Text style={styles.financeValue}>${Number(selectedReserva.valorIva || 0).toFixed(2)} USD</Text>
                          </View>
                          <View style={styles.financeDivider} />
                          <View style={[styles.financeRow, { marginTop: 4 }]}>
                            <Text style={styles.financeLabelTotal}>TOTAL RESERVA</Text>
                            <Text style={styles.financeValueTotal}>${Number(selectedReserva.totalReserva || 0).toFixed(2)} USD</Text>
                          </View>

                          <View style={styles.pendingBalanceRow}>
                            <Text style={styles.pendingBalanceLabel}>SALDO PENDIENTE</Text>
                            <Text style={styles.pendingBalanceValue}>
                              ${isReservaPagada(selectedReserva) ? '0.00' : Number(selectedReserva.saldoPendiente || selectedReserva.totalReserva || 0).toFixed(2)} USD
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Rooms Acquired details (Lodging) */}
                      {(tipoServicioActual === 'lodging' || tipoServicioActual === 'unknown') &&
                        selectedReserva.habitaciones && selectedReserva.habitaciones.length > 0 && (
                          <View style={styles.contractSection}>
                            <Text style={styles.sectionSubtitle}>
                              <Ionicons name="key-outline" size={16} color={Colors.titulo} /> Habitaciones Adquiridas
                            </Text>
                            {selectedReserva.habitaciones.map((rm: any, idx: number) => (
                              <View key={rm.reservaHabitacionGuid || idx} style={styles.roomItem}>
                                <View style={styles.roomItemHeader}>
                                  <Text style={styles.roomItemTitle}>{rm.tipoHabitacion || 'Habitación Premium'}</Text>
                                  {(rm.estadoDetalle === 'CAN' || selectedReserva.estadoReserva === 'CAN') && (
                                    <View style={[styles.statusTag, styles.statusCancelled, { paddingVertical: 2, paddingHorizontal: 6 }]}>
                                      <Text style={[styles.statusTagText, styles.statusCancelled, { fontSize: 10 }]}>Cancelada</Text>
                                    </View>
                                  )}
                                </View>
                                <View style={styles.roomItemBody}>
                                  <View style={styles.roomMetaGrid}>
                                    <View style={styles.roomMetaCol}>
                                      <Text style={styles.roomMetaLabel}>ADULTOS</Text>
                                      <Text style={styles.roomMetaVal}>{rm.numAdultos || 1}</Text>
                                    </View>
                                    <View style={styles.roomMetaCol}>
                                      <Text style={styles.roomMetaLabel}>NIÑOS</Text>
                                      <Text style={styles.roomMetaVal}>{rm.numNinos || 0}</Text>
                                    </View>
                                  </View>
                                  <View style={styles.roomPriceBreakdown}>
                                    <View style={styles.roomPriceRow}>
                                      <Text style={styles.roomPriceLabel}>Precio por noche</Text>
                                      <Text style={styles.roomPriceVal}>${Number(rm.precioNocheAplicado || 0).toFixed(2)} USD</Text>
                                    </View>
                                    {rm.subtotalLinea && (
                                      <View style={styles.roomPriceRow}>
                                        <Text style={styles.roomPriceLabel}>Subtotal</Text>
                                        <Text style={styles.roomPriceVal}>${Number(rm.subtotalLinea).toFixed(2)} USD</Text>
                                      </View>
                                    )}
                                    <View style={[styles.roomPriceRow, { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 4 }]}>
                                      <Text style={[styles.roomPriceLabel, { fontWeight: '700' }]}>Total línea</Text>
                                      <Text style={[styles.roomPriceVal, { fontWeight: '700', color: Colors.titulo }]}>
                                        ${Number(rm.totalLinea || 0).toFixed(2)} USD
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}

                      {/* Tickets Acquired details (Attractions) */}
                      {tipoServicioActual === 'attractions' &&
                        selectedReserva.detalleAtraccion && selectedReserva.detalleAtraccion.length > 0 && (
                          <View style={styles.contractSection}>
                            <Text style={styles.sectionSubtitle}>
                              <Ionicons name="ticket-outline" size={16} color={Colors.titulo} /> Tickets Adquiridos
                            </Text>
                            {selectedReserva.detalleAtraccion.map((tk: any, idx: number) => (
                              <View key={tk.rev_det_guid || idx} style={styles.roomItem}>
                                <View style={styles.roomItemHeader}>
                                  <Text style={styles.roomItemTitle}>{tk.tck_tipo_participante || 'Ticket'}</Text>
                                </View>
                                <View style={styles.roomItemBody}>
                                  <View style={styles.roomMetaGrid}>
                                    <View style={styles.roomMetaCol}>
                                      <Text style={styles.roomMetaLabel}>CANTIDAD</Text>
                                      <Text style={styles.roomMetaVal}>{tk.cantidad || 1}</Text>
                                    </View>
                                    <View style={styles.roomMetaCol}>
                                      <Text style={styles.roomMetaLabel}>PRECIO UNITARIO</Text>
                                      <Text style={styles.roomMetaVal}>
                                        ${Number(tk.precio_unit || 0).toFixed(2)} {selectedReserva.moneda || 'USD'}
                                      </Text>
                                    </View>
                                  </View>
                                  <View style={styles.roomPriceBreakdown}>
                                    <View style={[styles.roomPriceRow, { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 4 }]}>
                                      <Text style={[styles.roomPriceLabel, { fontWeight: '700' }]}>Subtotal</Text>
                                      <Text style={[styles.roomPriceVal, { fontWeight: '700', color: Colors.titulo }]}>
                                        ${Number(tk.subtotal || 0).toFixed(2)} {selectedReserva.moneda || 'USD'}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                    </View>
                  </View>
                </ScrollView>
              )}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
import { LinearGradient } from 'expo-linear-gradient';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 400, gap: Spacing.md },
  loadingText: { fontSize: 15, color: Colors.subtitulo },

  mainContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },

  profileHeader: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadow.md,
    marginBottom: Spacing.xl,
  },
  coverImage: { height: 200, width: '100%' },
  coverOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    height: 200,
    backgroundColor: 'rgba(70, 64, 60, 0.45)',
  },

  profileInfoWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    marginTop: -50,
    gap: Spacing.md,
  },
  avatarContainer: { position: 'relative' },
  avatarImg: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: Colors.bg,
    backgroundColor: Colors.extra2,
  },
  levelBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.titulo,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.bg,
    ...Shadow.sm,
  },

  userDetails: { flex: 1, minWidth: 200 },
  userName: { fontSize: 24, fontWeight: '700', color: Colors.extra1, marginBottom: Spacing.xs },
  userEmail: { fontSize: 14, color: Colors.subtitulo, marginBottom: Spacing.sm },

  userMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(198, 177, 125, 0.18)',
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  metaText: { fontSize: 11, fontWeight: '600', color: Colors.extra1 },

  // Content Layout
  contentLayout: { gap: Spacing.xl },
  contentLayoutWeb: { flexDirection: 'row', alignItems: 'flex-start' },

  sidebar: {},
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  sidebarTitle: { fontSize: 16, fontWeight: '700', color: Colors.extra1, marginBottom: Spacing.md },

  statItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  statIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statInfo: { flexDirection: 'column' },
  statValue: { fontSize: 18, fontWeight: '700', color: Colors.extra1 },
  statLabel: { fontSize: 12, color: Colors.subtitulo },

  mainPanel: { flex: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.extra1 },
  badgeWrapper: {},
  reservationsBadge: {
    backgroundColor: Colors.titulo,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    ...Shadow.sm,
  },

  profileTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: { borderBottomColor: Colors.titulo },
  tabButtonText: { fontSize: 13, fontWeight: '600', color: Colors.subtitulo },
  tabButtonTextActive: { color: Colors.titulo },

  loaderBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderBoxText: { fontSize: 14, color: Colors.subtitulo, marginTop: Spacing.sm, textAlign: 'center' },

  tripsGrid: { gap: Spacing.md },
  tripsGridWeb: { flexDirection: 'row', flexWrap: 'wrap' },

  tripCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
    width: '100%',
  },
  tripCardWeb: { width: '48%', minWidth: 280 },
  tripImage: { height: 140, width: '100%' },

  statusBadgeWrapper: { position: 'absolute', top: 12, right: 12 },
  statusTag: { paddingVertical: 4, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1 },
  statusConfirmed: { backgroundColor: '#eaf7ee', borderColor: 'rgba(42, 125, 79, 0.3)', color: '#2a7d4f' },
  statusCancelled: { backgroundColor: '#fdecea', borderColor: 'rgba(192, 57, 43, 0.3)', color: '#c0392b' },
  statusPending: { backgroundColor: 'rgba(198, 177, 125, 0.15)', borderColor: 'rgba(198, 177, 125, 0.3)', color: Colors.extra2 },

  statusTagText: { fontSize: 11, fontWeight: '700' },

  tripDetails: { padding: Spacing.md, gap: 6 },
  providerTag: { fontSize: 9, fontWeight: '700', color: Colors.extra2, letterSpacing: 0.5, backgroundColor: 'rgba(198, 177, 125, 0.15)', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4, alignSelf: 'flex-start' },
  tripDestination: { fontSize: 16, fontWeight: '700', color: Colors.extra1, marginBottom: 2 },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tripRowText: { fontSize: 12, color: Colors.subtitulo },

  btnManage: { backgroundColor: 'rgba(142, 90, 84, 0.05)', borderRadius: BorderRadius.md, paddingVertical: 10, alignItems: 'center', marginTop: Spacing.sm },
  btnManageText: { fontSize: 13, fontWeight: '600', color: Colors.titulo },

  addNewTrip: {
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: Colors.extra2,
    backgroundColor: 'transparent',
    padding: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 220,
  },
  addIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.extra2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  addTripTitle: { fontSize: 16, fontWeight: '700', color: Colors.extra1, marginBottom: 2 },
  addTripDesc: { fontSize: 12, color: Colors.subtitulo, textAlign: 'center' },

  // VISOR MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 12, 10, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCardContract: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.xl,
    borderLeftWidth: 6,
    borderLeftColor: Colors.titulo,
    width: '100%',
    maxWidth: 900,
    maxHeight: '85%',
    overflow: 'hidden',
    ...Shadow.lg,
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#fff',
  },
  contractBadgeProvider: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.titulo,
    backgroundColor: 'rgba(142, 90, 84, 0.1)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  contractTitle: { fontSize: 18, fontWeight: '700', color: Colors.extra1 },
  contractCloseBtn: { padding: 4 },

  detailLoader: { padding: Spacing.xxl, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  detailLoaderText: { fontSize: 14, color: Colors.subtitulo },

  contractBody: { padding: Spacing.lg, backgroundColor: Colors.bg },

  hotelBanner: {
    height: 120,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  hotelBannerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 12, 10, 0.45)',
  },
  bannerInfo: { gap: 2 },
  bannerHotelName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  bannerLoc: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bannerLocText: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  bannerStatus: { position: 'absolute', top: 12, right: 12, paddingVertical: 4, paddingHorizontal: 12, borderRadius: BorderRadius.full },
  bannerStatusText: { fontSize: 12, fontWeight: '700' },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fff4e0',
    borderWidth: 1,
    borderColor: '#ffcc80',
    borderRadius: BorderRadius.md,
    padding: 10,
    marginBottom: Spacing.lg,
  },
  warningText: { fontSize: 12.5, fontWeight: '600', color: '#b25a00', flex: 1, lineHeight: 17 },

  contractLayoutGrid: { gap: Spacing.lg },
  contractLayoutGridWeb: { flexDirection: 'row', alignItems: 'flex-start' },
  contractCol: { flex: 1, gap: Spacing.md, width: '100%' },

  contractSection: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(198, 177, 125, 0.2)',
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.titulo,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(198, 177, 125, 0.2)',
    paddingBottom: 6,
    marginBottom: Spacing.md,
  },

  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  fieldItem: {
    width: '45%',
    minWidth: 120,
    gap: 2,
  },
  fieldLabel: { fontSize: 9, fontWeight: '700', color: Colors.subtitulo, letterSpacing: 0.5 },
  fieldValue: { fontSize: 13, color: Colors.extra1 },
  fieldValueBold: { fontSize: 13, color: Colors.extra1, fontWeight: '600' },
  fieldValueHighlight: { fontSize: 15, color: Colors.titulo, fontWeight: '700' },

  financeCard: {
    backgroundColor: 'rgba(198,177,125,0.06)',
    borderColor: 'rgba(142, 90, 84, 0.15)',
  },
  financeRows: { gap: 6 },
  financeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  financeLabel: { fontSize: 12, fontWeight: '500', color: Colors.extra1 },
  financeValue: { fontSize: 12, fontWeight: '600', color: Colors.extra1 },
  financeDivider: { height: 1.5, backgroundColor: 'rgba(198, 177, 125, 0.3)', marginVertical: 4 },
  financeLabelTotal: { fontSize: 14, fontWeight: '700', color: Colors.titulo },
  financeValueTotal: { fontSize: 16, fontWeight: '700', color: Colors.titulo },

  pendingBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(198, 177, 125, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.extra2,
    marginTop: Spacing.xs,
  },
  pendingBalanceLabel: { fontSize: 11, fontWeight: '700', color: Colors.extra1 },
  pendingBalanceValue: { fontSize: 13, fontWeight: '700', color: Colors.titulo },

  roomItem: {
    borderWidth: 1,
    borderColor: 'rgba(198, 177, 125, 0.25)',
    borderRadius: BorderRadius.sm,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  roomItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(198, 177, 125, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198, 177, 125, 0.15)',
  },
  roomItemTitle: { fontSize: 12, fontWeight: '600', color: Colors.titulo },
  roomItemBody: { padding: Spacing.sm },
  roomMetaGrid: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
  roomMetaCol: { gap: 1 },
  roomMetaLabel: { fontSize: 9, fontWeight: '600', color: Colors.subtitulo },
  roomMetaVal: { fontSize: 12, fontWeight: '700', color: Colors.extra1 },
  roomPriceBreakdown: { gap: 4 },
  roomPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roomPriceLabel: { fontSize: 11, color: Colors.subtitulo },
  roomPriceVal: { fontSize: 11, color: Colors.extra1 },
});
