/**
 * Modelos del microservicio de Atracciones (Booking público).
 * Tipos derivados directamente del contrato:
 *   - GET /api/v2/atracciones
 *   - GET /api/v2/atracciones/filtros
 *
 * No se agregan campos fuera del contrato. Las anotaciones cliente
 * (provider, failedProviders) están marcadas como opcionales y derivadas.
 */

/** Catálogo de integrantes del bus que sirven el microservicio. */
export type AttractionProvider = 'jhonatan' | 'luis' | 'francisco' | 'angel';
export type AttractionProviderSelector = AttractionProvider | 'todos';

// ── Item de listado / detalle compartidos ─────────────────────────
export interface Disponibilidad {
  disponible: boolean;
  disponible_hoy: boolean;
  proxima_fecha_disponible: string | null;
  cupos_disponibles: number | null;
}

export interface AtraccionLinks {
  self: string;
}

export interface Atraccion {
  id: string;
  nombre: string;
  ciudad: string;
  pais: string;
  tipo_tagname: string;
  tipo_nombre: string;
  subtipo_tagname: string | null;
  subtipo_nombre: string | null;
  etiquetas: string[];
  descripcion_corta: string;
  imagen_principal: string;
  duracion_minutos: number;
  precio_desde: number;
  moneda: string;
  calificacion: number;
  total_resenas: number;
  idiomas_disponibles: string[];
  disponibilidad: Disponibilidad;
  _links: AtraccionLinks;
  /** Anotación cliente: integrante del bus que sirvió esta atracción. */
  provider?: AttractionProvider;
}

// ── Metadatos del listado ─────────────────────────────────────────
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface FilterStats {
  filteredProductCount: number;
  unfilteredProductCount: number;
}

export interface Sorter {
  name: string;
  value: string;
}

export interface AtraccionesListLinks {
  self: string;
}

export interface AtraccionesListResponse {
  status: number;
  message: string;
  data: Atraccion[];
  pagination: Pagination;
  filterStats: FilterStats;
  sorters: Sorter[];
  defaultSorter: Sorter;
  _links: AtraccionesListLinks;
  /** Anotación cliente: proveedores que no respondieron en modo 'todos'. */
  failedProviders?: AttractionProvider[];
}

// ── Filtros disponibles ───────────────────────────────────────────
export interface FilterImage {
  url: string;
}

export interface FilterOption {
  name: string;
  tagname: string;
  productCount: number;
  image?: FilterImage | null;
  childFilterOptions?: FilterOption[] | null;
}

export interface FiltrosData {
  destinationFilters: FilterOption[];
  typeFilters: FilterOption[];
  labelFilters: FilterOption[];
  minRatingFilter: FilterOption[];
  timeOfDayFilters: FilterOption[];
  supportedLanguageFilters: FilterOption[];
}

export interface FiltrosResponse {
  status: number;
  message: string;
  data: FiltrosData;
  /** Anotación cliente: proveedores que no respondieron en modo 'todos'. */
  failedProviders?: AttractionProvider[];
}

// ── Detalle (GET /api/v2/atracciones/{guid}) ──────────────────────
export interface Ticket {
  tck_guid: string;
  tipo: string;
  precio: number;
  moneda: string;
}

export interface AtraccionDetalle extends Atraccion {
  descripcion: string;
  imagenes: string[];
  incluye: string[];
  no_incluye: string[];
  punto_encuentro: string;
  incluye_transporte: boolean;
  incluye_acompaniante: boolean;
  tickets: Ticket[];
  /** Anotación cliente — heredada de `Atraccion.provider`. */
  provider?: AttractionProvider;
}

export interface AtraccionDetalleResponse {
  status: number;
  message: string;
  data: AtraccionDetalle;
}

// ── Horarios (GET /api/v2/atracciones/{guid}/horarios) ────────────
export interface Horario {
  hor_guid: string;
  fecha: string;       // YYYY-MM-DD
  hora_inicio: string; // HH:mm
  hora_fin: string;    // HH:mm
  cupos: number;
}

export interface HorariosResponse {
  status: number;
  message: string;
  data: Horario[];
}

// ── Tickets por horario (GET .../horarios/{horarioGuid}/tickets) ──
export interface HorarioTicketsResponse {
  status: number;
  message: string;
  data: { items: Ticket[] };
}

// ── Reserva (POST /api/v2/reservas) ───────────────────────────────
export interface ClienteInvitado {
  tipo_identificacion: string; // CEDULA | PASAPORTE
  numero_identificacion: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  direccion?: string;
}

export interface LineaReserva {
  tck_guid: string;
  cantidad: number;
}

export interface ReservaPayload {
  at_guid: string;
  hor_guid: string;
  fecha_visita: string; // YYYY-MM-DD
  lineas: LineaReserva[];
  origen_canal: string; // siempre 'BOOKING'
  cliente_invitado: ClienteInvitado;
}

export interface ReservaCreadaDetalle {
  tck_tipo_participante: string;
  cantidad: number;
  precio_unit: number;
  subtotal: number;
}

export interface ReservaCreada {
  rev_guid: string;
  rev_codigo: string;
  hor_fecha: string;
  hor_hora_inicio: string;
  hor_hora_fin: string;
  atraccion_nombre: string;
  rev_subtotal: number;
  rev_valor_iva: number;
  rev_total: number;
  moneda: string;
  rev_estado: string;
  rev_fecha_reserva_utc: string;
  detalle: ReservaCreadaDetalle[];
  _links: { self: string; confirmar_pago: string };
}

export interface ReservaResponse {
  status: number;
  message: string;
  data: ReservaCreada;
}

// ── Listado de reservas (GET /api/v2/reservas) ────────────────────
export interface ReservaResumida {
  rev_guid: string;
  rev_codigo: string;
  hor_fecha: string;
  hor_hora_inicio: string;
  atraccion_nombre: string;
  rev_total: number;
  moneda: string;
  rev_estado: string;
  _links: { self: string; confirmar_pago?: string };
}

export interface ReservasListResponse {
  status: number;
  message: string;
  data: ReservaResumida[];
  pagination: Pagination;
  _links: { self: string };
}

// ── Confirmación de pago (POST /reservas/{guid}/pagos/confirmacion)
export interface PagoConfirmacionBody {
  nombre_receptor: string;
  apellido_receptor: string;
  correo_receptor: string;
  telefono_receptor?: string;
  observacion?: string;
}

export interface FacturaCreada {
  fac_guid: string;
  fac_numero: string;
  rev_codigo: string;
  total: number;
  moneda: string;
  fecha_emision: string;
  estado: string;
  nombre_receptor: string;
  correo_receptor: string;
}

export interface PagoConfirmacionResponse {
  status: number;
  message: string;
  data: FacturaCreada;
}

// ── Query params del listado ──────────────────────────────────────
export interface AtraccionesQuery {
  ciudad?: string;
  tipo?: string;
  subtipo?: string;
  idioma?: string;
  etiqueta?: string;
  calificacion_min?: number;
  hora_inicio?: string;
  disponible?: boolean;
  ordenar_por?: string;
  page?: number;
  limit?: number;
}
