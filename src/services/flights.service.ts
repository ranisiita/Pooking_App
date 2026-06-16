const API_GATEWAY_URL = process.env.EXPO_PUBLIC_API_GATEWAY_URL ?? '';
const PROVEEDORES = [
  { key: 'nacho', label: 'Nacho' },
  { key: 'mary', label: 'Mary' },
  { key: 'marcillo', label: 'Marcillo' },
];

export interface FlightSearchParams {
  origen?: string;
  destino?: string;
  fechaSalida?: string;
  adultos?: number;
  ninos?: number;
  maletas?: number;
  CodigoIataOrigen?: string;
  CodigoIataDestino?: string;
  FechaSalida?: string;
}

export class FlightService {
  static async buscarVuelos(params: FlightSearchParams): Promise<any[]> {
    const urlParams = new URLSearchParams();
    
    const apiParams: Record<string, string> = {};
    if (params.origen) apiParams.CodigoIataOrigen = params.origen;
    if (params.destino) apiParams.CodigoIataDestino = params.destino;
    if (params.fechaSalida) {
      apiParams.FechaSalida = params.fechaSalida.includes('T') ? params.fechaSalida : `${params.fechaSalida}T00:00:00`;
    }
    
    if (params.CodigoIataOrigen) apiParams.CodigoIataOrigen = params.CodigoIataOrigen;
    if (params.CodigoIataDestino) apiParams.CodigoIataDestino = params.CodigoIataDestino;
    if (params.FechaSalida) apiParams.FechaSalida = params.FechaSalida;

    Object.entries(apiParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        urlParams.set(k, String(v));
      }
    });

    const results = await Promise.all(
      PROVEEDORES.map(async (p) => {
        try {
          const url = `${API_GATEWAY_URL}/${p.key}/api/v1/booking/vuelos/buscar?${urlParams.toString()}`;
          const res = await fetch(url);
          if (!res.ok) return [];
          const json = await res.json();
          let rawList: any[] = [];
          if (Array.isArray(json)) rawList = json;
          else if (json.success && Array.isArray(json.data)) rawList = json.data;
          else if (json.data && Array.isArray(json.data.items)) rawList = json.data.items;
          else if (Array.isArray(json.data)) rawList = json.data;
          else if (Array.isArray(json.items)) rawList = json.items;

          return rawList
            .filter((v: any) => v.asientosDisponibles !== null && v.asientosDisponibles !== undefined && v.asientosDisponibles > 0)
            .map((v: any) => {
              const salida = v.fechaHoraSalida ? (v.fechaHoraSalida.split('T')[1] ?? '').substring(0, 5) : '';
              const llegada = v.fechaHoraLlegada ? (v.fechaHoraLlegada.split('T')[1] ?? '').substring(0, 5) : '';
              const duracionMin = v.duracionMin ?? 0;
              const h = Math.floor(duracionMin / 60);
              const m = duracionMin % 60;
              const duracion = m > 0 ? `${h}h ${m}m` : `${h}h`;

              return {
                guidServicio: `${p.key}-${v.idVuelo}`,
                nombreComercial: v.numeroVuelo ?? '',
                tipoServicioNombre: 'Vuelos',
                salida,
                llegada,
                duracion,
                escalas: Array.isArray(v.escalas) ? v.escalas.length : 0,
                precioBase: v.precioBase ?? 0,
                origen: v.codigoIataOrigen ?? '',
                destino: v.codigoIataDestino ?? '',
                fecha: v.fechaHoraSalida ?? '',
                proveedor: p.label,
                idVuelo: v.idVuelo,
                nombreOrigen: v.nombreAeropuertoOrigen ?? '',
                nombreDestino: v.nombreAeropuertoDestino ?? '',
                estadoVuelo: v.estadoVuelo,
                asientosDisponibles: v.asientosDisponibles,
                capacidadTotal: v.capacidadTotal,
                fechaHoraSalida: v.fechaHoraSalida,
                fechaHoraLlegada: v.fechaHoraLlegada,
              };
            });
        } catch (err) {
          console.warn(`Error buscando vuelos del proveedor ${p.key}:`, err);
          return [];
        }
      })
    );

    const flatResults = results.flat();
    return flatResults.sort((a, b) => a.precioBase - b.precioBase);
  }

  static async iniciarReservaVuelo(proveedor: string, idVuelo: number, urlRetorno: string, token: string): Promise<any> {
    const proveedorLower = proveedor.toLowerCase();
    const url = `${API_GATEWAY_URL}/${proveedorLower}/api/v1/booking/vuelos/sesion-redirect`;
    if (!token) {
      throw { status: 401, message: 'No hay token de autenticación.' };
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ idVuelo, urlRetorno }),
    });
    if (!res.ok) {
      throw { status: res.status, message: `Error ${res.status} al iniciar reserva.` };
    }
    return res.json();
  }

  static async cargarTodosAeropuertos(): Promise<any[]> {
    const requests = PROVEEDORES.map(async (p) => {
      try {
        const url = `${API_GATEWAY_URL}/${p.key}/api/v1/booking/aeropuertos?Limit=100`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const json = await res.json();
        return FlightService.extractAeropuertoList(json);
      } catch (err) {
        return [];
      }
    });

    const results = await Promise.all(requests);
    return FlightService.deduplicarAeropuertos(results);
  }

  static async buscarAeropuertos(texto: string): Promise<any[]> {
    if (texto.length < 2) return [];

    const requests = PROVEEDORES.map(async (p) => {
      try {
        const url = `${API_GATEWAY_URL}/${p.key}/api/v1/booking/aeropuertos?Nombre=${encodeURIComponent(texto)}&Limit=10`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const json = await res.json();
        return FlightService.extractAeropuertoList(json);
      } catch (err) {
        return [];
      }
    });

    const results = await Promise.all(requests);
    return FlightService.deduplicarAeropuertos(results).slice(0, 8);
  }

  private static extractAeropuertoList(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.items)) return res.items;
    if (res && res.data) {
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data.items)) return res.data.items;
    }
    return [];
  }

  private static deduplicarAeropuertos(results: any[][]): any[] {
    const seen = new Set<string>();
    const sugerencias: any[] = [];
    for (const list of results) {
      for (const raw of list) {
        const iata = (
          (raw.codigoIata ?? raw.CodigoIata ?? raw.codigo_iata ?? raw.iata ?? raw.IATA ?? '') as string
        ).toUpperCase().trim();

        const nombre = (
          raw.nombre ?? raw.Nombre ?? raw.name ?? raw.Name ??
          raw.nombreAeropuerto ?? raw.NombreAeropuerto ??
          raw.aeropuerto ?? raw.Aeropuerto ?? ''
        ) as string;

        if (!iata || !nombre || seen.has(iata)) continue;
        seen.add(iata);
        sugerencias.push({ nombre, codigoIata: iata, display: `${nombre} (${iata})` });
      }
    }
    return sugerencias;
  }
}
