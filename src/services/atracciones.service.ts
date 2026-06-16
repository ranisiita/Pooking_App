import { Platform } from 'react-native';

const API_GATEWAY_URL = process.env.EXPO_PUBLIC_API_GATEWAY_URL ?? '';

export type AttractionProvider = 'jhonatan' | 'luis' | 'francisco' | 'angel';
export type AttractionProviderSelector = AttractionProvider | 'todos';

export const ATTRACTION_PROVIDERS: Record<string, AttractionProvider> = {
  JHONATAN: 'jhonatan',
  LUIS: 'luis',
  FRANCISCO: 'francisco',
  ANGEL: 'angel',
};

export const ALL_ATTRACTION_PROVIDERS: AttractionProvider[] = ['jhonatan', 'luis', 'francisco', 'angel'];

export const ATTRACTION_PROVIDER_LABELS: Record<AttractionProvider, string> = {
  jhonatan: 'ReservX',
  luis: 'Travel of your dreams',
  francisco: 'Atraxia',
  angel: 'Aventuras Reservas',
};

const ATTRACTION_LEGACY_PERSON_NAMES: Record<string, AttractionProvider> = {
  jhonatan: 'jhonatan',
  luis: 'luis',
  francisco: 'francisco',
  angel: 'angel',
};

export function getProviderCompanyName(value: string | null | undefined): string {
  if (!value) return 'Pooking';
  const tech = normalizeAttractionProvider(value);
  if (tech) return ATTRACTION_PROVIDER_LABELS[tech];
  const s = String(value).trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Pooking';
}

export function normalizeAttractionProvider(value: string | null | undefined): AttractionProvider | null {
  if (!value) return null;
  const t = String(value).trim().toLowerCase();
  if (ALL_ATTRACTION_PROVIDERS.includes(t as AttractionProvider)) {
    return t as AttractionProvider;
  }
  if (ATTRACTION_LEGACY_PERSON_NAMES[t]) {
    return ATTRACTION_LEGACY_PERSON_NAMES[t];
  }
  for (const p of ALL_ATTRACTION_PROVIDERS) {
    if (ATTRACTION_PROVIDER_LABELS[p].toLowerCase() === t) return p;
  }
  return null;
}

export const ACTIVE_ATTRACTION_PROVIDER: AttractionProvider = 'jhonatan';

function buildAttractionBasePath(provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER): string {
  return `/${provider}/api/v2`;
}

export class AtraccionesService {
  private static getAtraccionesUrl(provider: AttractionProvider): string {
    return `${API_GATEWAY_URL}${buildAttractionBasePath(provider)}/atracciones`;
  }

  private static getReservasUrl(provider: AttractionProvider): string {
    return `${API_GATEWAY_URL}${buildAttractionBasePath(provider)}/reservas`;
  }

  // 1. GET /atracciones
  static async getAtracciones(query: any = {}, selector: AttractionProviderSelector = ACTIVE_ATTRACTION_PROVIDER): Promise<any> {
    if (selector === 'todos') {
      return this.fanoutAtracciones(query);
    }
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.set(k, String(v));
        }
      });
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const url = `${this.getAtraccionesUrl(selector)}${queryString}`;
      const res = await fetch(url);
      if (!res.ok) return { status: res.status, data: [], failedProviders: [] };
      const resp = await res.json();
      return {
        ...resp,
        data: (resp.data ?? []).map((a: any) => ({ ...a, provider: selector })),
        failedProviders: [],
      };
    } catch (err) {
      console.warn(`[Atracciones] Error querying provider ${selector}:`, err);
      return { status: 500, data: [], failedProviders: [selector] };
    }
  }

  // 2. GET /reservas/{guid}
  static async getReservaDetalle(guid: string, provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER): Promise<any> {
    try {
      const url = `${this.getReservasUrl(provider)}/${guid}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn(`[Atracciones] Error fetching reservation detail ${guid} for ${provider}:`, err);
      return null;
    }
  }

  // 3. GET /atracciones/filtros
  static async getFiltros(selector: AttractionProviderSelector = ACTIVE_ATTRACTION_PROVIDER): Promise<any> {
    if (selector === 'todos') {
      // Return simple fallback or fanout filtros if needed
      return { status: 200, data: { destinations: [], categories: [] }, failedProviders: [] };
    }
    try {
      const url = `${this.getAtraccionesUrl(selector)}/filtros`;
      const res = await fetch(url);
      if (!res.ok) return { status: res.status, data: null, failedProviders: [selector] };
      const resp = await res.json();
      return { ...resp, failedProviders: [] };
    } catch (err) {
      console.warn(`[Atracciones] Error fetching filters for ${selector}:`, err);
      return { status: 500, data: null, failedProviders: [selector] };
    }
  }

  // 4. GET /atracciones/{guid}
  static async getAtraccionDetalle(guid: string, provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER): Promise<any> {
    try {
      const url = `${this.getAtraccionesUrl(provider)}/${guid}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const resp = await res.json();
      return { ...resp, data: { ...resp.data, provider } };
    } catch (err) {
      console.warn(`[Atracciones] Error fetching attraction detail ${guid} for ${provider}:`, err);
      return null;
    }
  }

  // 5. GET /atracciones/{guid}/tickets
  static async getTicketsAtraccion(guid: string, provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER): Promise<any> {
    try {
      const url = `${this.getAtraccionesUrl(provider)}/${guid}/tickets`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn(`[Atracciones] Error fetching tickets for ${guid} and ${provider}:`, err);
      return null;
    }
  }

  // 6. GET /atracciones/{guid}/horarios
  static async getHorarios(guid: string, fecha?: string, provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (fecha) params.set('fecha', fecha);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const url = `${this.getAtraccionesUrl(provider)}/${guid}/horarios${queryString}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn(`[Atracciones] Error fetching schedules for ${guid} and ${provider}:`, err);
      return null;
    }
  }

  // 7. GET /atracciones/{guid}/horarios/{horarioGuid}/tickets
  static async getHorarioTickets(guid: string, horarioGuid: string, provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER): Promise<any> {
    try {
      const url = `${this.getAtraccionesUrl(provider)}/${guid}/horarios/${horarioGuid}/tickets`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn(`[Atracciones] Error fetching schedule tickets for ${guid}/${horarioGuid} in ${provider}:`, err);
      return null;
    }
  }

  // 8. POST /reservas
  static async crearReserva(payload: any, provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER): Promise<any> {
    try {
      const url = this.getReservasUrl(provider);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn(`[Atracciones] Error creating reservation in ${provider}:`, err);
      return null;
    }
  }

  // 9. POST /reservas/{guid}/pagos/confirmacion
  static async confirmarPago(guid: string, body: any, provider: AttractionProvider = ACTIVE_ATTRACTION_PROVIDER): Promise<any> {
    try {
      const url = `${this.getReservasUrl(provider)}/${guid}/pagos/confirmacion`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn(`[Atracciones] Error confirming payment for ${guid} in ${provider}:`, err);
      return null;
    }
  }

  // Fanout para 'todos'
  private static async fanoutAtracciones(query: any): Promise<any> {
    const failedProviders: AttractionProvider[] = [];
    const data: any[] = [];

    const results = await Promise.all(
      ALL_ATTRACTION_PROVIDERS.map(async (p) => {
        try {
          const params = new URLSearchParams();
          Object.entries(query).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
              params.set(k, String(v));
            }
          });
          const queryString = params.toString() ? `?${params.toString()}` : '';
          const url = `${this.getAtraccionesUrl(p)}${queryString}`;
          const res = await fetch(url);
          if (!res.ok) {
            failedProviders.push(p);
            return [];
          }
          const resp = await res.json();
          return (resp.data ?? []).map((a: any) => ({ ...a, provider: p }));
        } catch (err) {
          console.warn(`[Atracciones] Fanout error for provider ${p}:`, err);
          failedProviders.push(p);
          return [];
        }
      })
    );

    results.forEach((list) => {
      data.push(...list);
    });

    return {
      status: 200,
      message: 'Operacion exitosa',
      data,
      pagination: {
        page: 1,
        limit: Math.max(data.length, 1),
        total: data.length,
        total_pages: 1,
      },
      failedProviders,
    };
  }
}
