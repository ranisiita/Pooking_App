// Lodging Service — migrated from Angular LodgingService
// RxJS (forkJoin, Observable) replaced with Promise.all + async/await
// HttpClient replaced with fetch (built-in)

import {
  Lodging,
  Room,
  Review,
  ReservaPayload,
  ReservaResponse,
  SearchCriteria,
} from '../types/lodging.types';

const API_GATEWAY_URL = process.env.EXPO_PUBLIC_API_GATEWAY_URL ?? '';
const PROVIDERS = ['juan', 'jorge', 'kelvin', 'jose', 'mateo'];

// ─── Mappers (same logic as Angular service) ──────────────────────────────────

function mapTipoAlojamiento(tipo: string): Lodging['tipo'] {
  const t = (tipo || '').toLowerCase();
  if (t.includes('hostal') || t.includes('hostel')) return 'Hostal';
  if (t.includes('motel')) return 'Motel';
  if (t.includes('apartamento') || t.includes('apartment') || t.includes('suite')) return 'Apartamento';
  return 'Hotel';
}

function mapCategoria(cat: string): Lodging['calidad'] {
  const c = (cat || '').toLowerCase();
  if (c.includes('negocio')) return 'Negocios';
  if (c.includes('familia')) return 'Familia';
  if (c.includes('lujo') || c.includes('luxury')) return 'Lujo';
  if (c.includes('econ') || c.includes('cheap')) return 'Económico';
  return 'Relajación';
}

function getRatingText(score: number): string {
  if (score >= 4.8) return 'Excepcional';
  if (score >= 4.5) return 'Excelente';
  if (score >= 4.0) return 'Muy bueno';
  if (score >= 3.0) return 'Bueno';
  return 'Aceptable';
}

function formatReviewDate(dateStr: string): string {
  if (!dateStr) return 'Reciente';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });
  } catch {
    return 'Reciente';
  }
}

function mapSearchItemToLodging(item: any, provider: string): Lodging {
  return {
    id: item.sucursalGuid,
    nombre: item.nombre || '',
    tipo: mapTipoAlojamiento(item.tipoAlojamiento),
    categoria: item.estrellas || 0,
    calidad: mapCategoria(item.categoria),
    direccion: item.direccion || `${item.ciudad || ''}, ${item.provincia || ''}`,
    ciudad: item.ciudad || '',
    descripcion: item.descripcion || '',
    imagen: item.imagenPrincipalUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=90',
    imagenes: [item.imagenPrincipalUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=90'],
    fotosCount: 0,
    precio: item.precioDesde || 0,
    valoracion: item.promedioValoracion || 0,
    ratingTexto: getRatingText(item.promedioValoracion || 0),
    reviewsCount: item.totalValoraciones || 0,
    habitacionesDisponibles: item.habitacionesDisponibles || 0,
    checkIn: item.horaCheckIn || '15:00',
    checkOut: item.horaCheckOut || '12:00',
    servicios: item.serviciosDestacados || [],
    amenities: [],
    aceptaNinos: item.aceptaNinos ?? true,
    aceptaMascotas: item.permiteMascotas ?? false,
    provider,
    habitaciones: [],
    reviews: [],
  };
}

// ─── API Functions (replacing Observable methods with Promise) ─────────────────

export async function buscarLodgings(criterios: SearchCriteria): Promise<Lodging[]> {
  const params = new URLSearchParams();
  if (criterios.destino) params.set('Destino', criterios.destino);
  if (criterios.fechaInicio) {
    const val = criterios.fechaInicio.includes('T')
      ? criterios.fechaInicio
      : criterios.fechaInicio + 'T14:00:00.000Z';
    params.set('fechaInicio', val);
  }
  if (criterios.fechaFin) {
    const val = criterios.fechaFin.includes('T')
      ? criterios.fechaFin
      : criterios.fechaFin + 'T12:00:00.000Z';
    params.set('fechaFin', val);
  }
  if (criterios.adultos) params.set('NumAdultos', criterios.adultos.toString());
  if (criterios.ninos) params.set('NumNinos', criterios.ninos.toString());
  if (criterios.habitaciones) params.set('NumHabitaciones', criterios.habitaciones.toString());

  const queryString = params.toString() ? `?${params.toString()}` : '';

  // Promise.all replaces forkJoin
  const results = await Promise.all(
    PROVIDERS.map(async (provider) => {
      try {
        const url = `${API_GATEWAY_URL}/${provider}/api/v1/accommodations/search${queryString}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
        if (!res.ok) return [];
        const data = await res.json();
        const items = data?.items || [];
        const active = items.filter(
          (item: any) =>
            item.habitacionesDisponibles === undefined ||
            item.habitacionesDisponibles === null ||
            item.habitacionesDisponibles > 0
        );
        return active.map((item: any) => mapSearchItemToLodging(item, provider));
      } catch (err) {
        console.warn(`[WARNING] Error searching provider ${provider}:`, err);
        return [];
      }
    })
  );

  return results.flat();
}

export async function getLodgingById(
  sucursalGuid: string,
  provider: string,
  fechaInicio?: string,
  fechaFin?: string
): Promise<Lodging | null> {
  try {
    const params = new URLSearchParams();
    if (fechaInicio) params.set('fechaInicio', fechaInicio + 'T14:00:00.000Z');
    if (fechaFin) params.set('fechaFin', fechaFin + 'T12:00:00.000Z');
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const url = `${API_GATEWAY_URL}/${provider}/api/v1/accommodations/${sucursalGuid}${queryString}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return null;

    const habitaciones: Room[] = (data.tiposHabitacion || [])
      .filter((h: any) => h.disponiblesEnRango === undefined || h.disponiblesEnRango === null || h.disponiblesEnRango > 0)
      .map((h: any, index: number): Room => ({
        id: h.tipoHabitacionGuid,
        nombre: h.nombre || '',
        piso: `Piso ${index + 1}`,
        cama: h.tipoCama || 'Cama matrimonial',
        capacidad: `${h.capacidadAdultos || 2} adultos · ${h.capacidadNinos || 0} niños`,
        capacidadAdultos: h.capacidadAdultos || 2,
        capacidadNinos: h.capacidadNinos || 0,
        metros: h.areaM2 || 20,
        precio: h.precioBase || 0,
        disponibles: h.disponiblesEnRango ?? data.habitacionesDisponibles ?? 1,
        imagen: h.imagenes?.length > 0 ? h.imagenes[0] : 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=90',
        imagenes: h.imagenes?.length > 0 ? h.imagenes : ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=90'],
      }));

    return {
      id: data.sucursalGuid,
      nombre: data.nombre || '',
      tipo: mapTipoAlojamiento(data.tipoAlojamiento),
      categoria: data.estrellas || 0,
      calidad: mapCategoria(data.categoria),
      direccion: data.direccion || `${data.ciudad || ''}, ${data.provincia || ''}`,
      ciudad: data.ciudad || '',
      descripcion: data.descripcion || '',
      descripcionLarga: data.descripcionCompleta || data.descripcion || '',
      imagen: data.imagenPrincipalUrl || (data.imagenes?.[0] ?? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=90'),
      imagenes: data.imagenes?.length > 0 ? data.imagenes : [data.imagenPrincipalUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=90'],
      fotosCount: data.imagenes?.length ?? 0,
      precio: data.precioDesde || 0,
      valoracion: data.promedioValoracion || 0,
      ratingTexto: getRatingText(data.promedioValoracion || 0),
      reviewsCount: data.totalValoraciones || 0,
      habitacionesDisponibles: data.habitacionesDisponibles || 0,
      checkIn: data.horaCheckIn || '14:00',
      checkOut: data.horaCheckOut || '12:00',
      servicios: data.serviciosDestacados || [],
      amenities: data.amenities || [],
      aceptaNinos: data.aceptaNinos ?? true,
      aceptaMascotas: data.permiteMascotas ?? false,
      provider,
      habitaciones,
      reviews: [],
      zona: data.provincia || 'Norte de la ciudad',
      distanciaCentro: 'A pocos minutos del centro',
      transporte: 'Fácil acceso a transporte público',
      alrededores: 'Centros comerciales y parques cercanos',
      telefono: '+593 2 255-6789',
      email: 'contacto@hotel.pooking.ec',
    };
  } catch (err) {
    console.error(`Error fetching lodging ${sucursalGuid}:`, err);
    return null;
  }
}

export async function getRooms(
  sucursalGuid: string,
  provider: string,
  criterios?: { llegada?: string; salida?: string; adultos?: number; ninos?: number }
): Promise<Room[]> {
  const lodging = await getLodgingById(sucursalGuid, provider, criterios?.llegada, criterios?.salida);
  return lodging?.habitaciones || [];
}

export async function getReviews(
  sucursalGuid: string,
  provider: string,
  pagina = 1,
  limite = 10
): Promise<Review[]> {
  try {
    const params = new URLSearchParams({ pagina: pagina.toString(), limite: limite.toString() });
    const url = `${API_GATEWAY_URL}/${provider}/api/v1/accommodations/${sucursalGuid}/reviews?${params}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const items = data?.items || [];
    return items.map((rv: any): Review => {
      const name = rv.nombreVisibleCliente || 'Huésped Anónimo';
      const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
      return {
        iniciales: initials || 'HU',
        nombre: name,
        tipo: rv.tipoViaje || 'Viajero',
        fecha: formatReviewDate(rv.fecha),
        score: rv.puntuacion || 10,
        positivo: rv.comentarioPositivo || '',
        negativo: rv.comentarioNegativo || '',
        respuesta: rv.respuestaPropiedad || '',
        avatarColor: '#8E5A54',
      };
    });
  } catch (err) {
    console.warn(`Error fetching reviews for ${sucursalGuid}:`, err);
    return [];
  }
}

export async function crearReserva(
  provider: string,
  payload: ReservaPayload
): Promise<ReservaResponse | null> {
  try {
    const url = `${API_GATEWAY_URL}/${provider}/api/v1/accommodations/reservas`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`Error creating reservation with provider ${provider}:`, err);
    return null;
  }
}

export async function getReservaByGuid(
  provider: string,
  reservaGuid: string
): Promise<any | null> {
  try {
    const url = `${API_GATEWAY_URL}/${provider}/api/v1/accommodations/reservas/${reservaGuid}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`Error fetching reservation ${reservaGuid}:`, err);
    return null;
  }
}

// Helper: get service icon name (Ionicons compatible)
export function getServiceIcon(serv: string): string {
  const s = (serv || '').toLowerCase();
  if (s.includes('wifi') || s.includes('internet')) return 'wifi';
  if (s.includes('desayuno') || s.includes('breakfast') || s.includes('comida') || s.includes('cafe')) return 'cafe';
  if (s.includes('piscina') || s.includes('alberca') || s.includes('pool')) return 'water';
  if (s.includes('restaurante') || s.includes('comedor') || s.includes('restaurant')) return 'restaurant';
  if (s.includes('estacionamiento') || s.includes('parque') || s.includes('parking')) return 'car';
  if (s.includes('spa')) return 'flower';
  if (s.includes('gym') || s.includes('gimnasio') || s.includes('fitness')) return 'barbell';
  if (s.includes('reuniones') || s.includes('conferencias') || s.includes('meeting')) return 'people';
  return 'checkmark-circle';
}
