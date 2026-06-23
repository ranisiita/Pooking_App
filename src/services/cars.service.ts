import { ApiError } from './error-messages';

const API_GATEWAY_URL = process.env.EXPO_PUBLIC_API_GATEWAY_URL ?? '';
const PROVIDERS = ['martin', 'dylan', 'ana', 'kath'];

export interface CriteriosBusquedaAutos {
  idLocalizacionRecogida?: number | null;
  idLocalizacionDevolucion?: number | null;
  fechaRecogida?: string;
  fechaDevolucion?: string;
  nombreCategoria?: string;
  transmision?: string;
  nombreMarca?: string;
  sort?: string;
  page?: number;
  limit?: number;
  proveedor?: string;
}

export class CarService {
  static async buscarVehiculos(criterios: CriteriosBusquedaAutos, page = 1, limit = 20): Promise<any[]> {
    const params = new URLSearchParams();
    params.set('page', String(criterios.page ?? page));
    params.set('limit', String(criterios.limit ?? limit));

    if (criterios.idLocalizacionRecogida) params.set('idLocalizacion', String(criterios.idLocalizacionRecogida));
    if (criterios.fechaRecogida) params.set('fechaRecogida', criterios.fechaRecogida);
    if (criterios.fechaDevolucion) params.set('fechaDevolucion', criterios.fechaDevolucion);
    if (criterios.nombreCategoria) params.set('nombreCategoria', criterios.nombreCategoria);
    if (criterios.transmision) params.set('transmision', criterios.transmision);
    if (criterios.nombreMarca) params.set('nombreMarca', criterios.nombreMarca);
    if (criterios.sort) params.set('sort', criterios.sort);

    const providersToQuery = (criterios.proveedor && criterios.proveedor !== 'todos')
      ? [criterios.proveedor]
      : PROVIDERS;

    const results = await Promise.all(
      providersToQuery.map(async (provider) => {
        try {
          const url = `${API_GATEWAY_URL}/${provider}/api/v2/booking/vehiculos?${params.toString()}`;
          const res = await fetch(url);
          if (!res.ok) return [];
          const json = await res.json();
          const vehiculos = json.data?.vehiculos || [];
          return vehiculos.map((v: any) => ({ ...v, provider }));
        } catch (err) {
          console.warn(`Error obteniendo vehículos del proveedor ${provider}:`, err);
          return [];
        }
      })
    );

    return results.flat();
  }

  static async getVehiculoById(idVehiculo: number, provider: string): Promise<any | null> {
    if (!provider) {
      console.error('El proveedor es necesario para obtener el detalle');
      return null;
    }
    try {
      const url = `${API_GATEWAY_URL}/${provider}/api/v2/booking/vehiculos/${idVehiculo}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      if (json.data?.vehiculo) {
        return { ...json.data.vehiculo, provider };
      }
      return null;
    } catch (err) {
      console.error(`Error obtaining vehicle detail ${idVehiculo} from ${provider}`, err);
      return null;
    }
  }

  static async verificarDisponibilidad(idVehiculo: number, provider: string, fechaRecogida: string, fechaDevolucion: string, idLocalizacion: number): Promise<boolean> {
    try {
      const params = new URLSearchParams();
      params.set('fechaRecogida', fechaRecogida);
      params.set('fechaDevolucion', fechaDevolucion);
      params.set('idLocalizacion', String(idLocalizacion));

      const url = `${API_GATEWAY_URL}/${provider}/api/v2/booking/reservas/${idVehiculo}/disponibilidad?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) return false;
      const json = await res.json();
      return json.data?.disponibilidad?.disponible ?? false;
    } catch (err) {
      console.error(`Error verifying availability for vehicle ${idVehiculo} in ${provider}`, err);
      return false;
    }
  }

  static async getLocalizaciones(proveedor?: string): Promise<any[]> {
    const providersToQuery = proveedor && proveedor !== 'todos' ? [proveedor] : PROVIDERS;

    const requests = providersToQuery.map(async (provider) => {
      try {
        const url = `${API_GATEWAY_URL}/${provider}/api/v2/booking/localizaciones`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const json = await res.json();
        return json.data?.localizaciones || [];
      } catch (err) {
        console.warn(`Error obtaining locations from provider ${provider}:`, err);
        return [];
      }
    });

    const results = await Promise.all(requests);
    const localizacionesUnicas = new Map<string, any>();
    results.flat().forEach(loc => {
      if (!localizacionesUnicas.has(loc.nombre)) {
        localizacionesUnicas.set(loc.nombre, loc);
      }
    });
    return Array.from(localizacionesUnicas.values());
  }

  static async getCategorias(proveedor?: string): Promise<any[]> {
    const providersToQuery = proveedor && proveedor !== 'todos' ? [proveedor] : PROVIDERS;

    const requests = providersToQuery.map(async (provider) => {
      try {
        const url = `${API_GATEWAY_URL}/${provider}/api/v2/booking/categorias`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const json = await res.json();
        return json.data?.categorias || [];
      } catch (err) {
        console.warn(`Error obtaining categories from provider ${provider}:`, err);
        return [];
      }
    });

    const results = await Promise.all(requests);
    const categoriasUnicas = new Map<string, any>();
    results.flat().forEach(cat => {
      if (!categoriasUnicas.has(cat.nombre)) {
        categoriasUnicas.set(cat.nombre, cat);
      }
    });
    return Array.from(categoriasUnicas.values());
  }

  static async getExtras(provider: string): Promise<any[]> {
    if (!provider) return [];
    try {
      const url = `${API_GATEWAY_URL}/${provider}/api/v2/booking/extras`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      if (Array.isArray(json.data)) return json.data;
      if (json.data && Array.isArray(json.data.extras)) return json.data.extras;
      return [];
    } catch (err) {
      console.error(`Error obtaining extras from provider ${provider}:`, err);
      return [];
    }
  }

  static async crearReserva(provider: string, payload: any): Promise<any | null> {
    const url = `${API_GATEWAY_URL}/${provider}/api/v2/booking/reservas`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('Error creating car reservation:', err);
      throw new ApiError(0); // error de red / conexión
    }
    if (!res.ok) {
      let body: any = null;
      try { body = await res.json(); } catch { /* sin cuerpo */ }
      // 409 = el vehículo ya no está disponible → la pantalla lo mapea con context 'booking'.
      throw new ApiError(res.status, body);
    }
    const json = await res.json();
    return json.data ?? null;
  }

  static async registrarReservaCliente(payload: any, token: string): Promise<any> {
    try {
      const url = `${API_GATEWAY_URL}/api/v2/booking/clientes/reservas`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error('Error registering client car reservation:', err);
      return null;
    }
  }

  static async getClientePorUsuarioGuid(guid: string, token: string): Promise<any> {
    try {
      const url = `${API_GATEWAY_URL}/api/v2/booking/clientes/usuario-guid/${guid}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data ?? null;
    } catch (err) {
      console.error('Error obtaining client detail:', err);
      return null;
    }
  }
}
