// TypeScript types — migrated from Angular lodging.service.ts
// These interfaces are 100% reused from the Angular project

export interface Room {
  id: string;
  nombre: string;
  piso: string;
  cama: string;
  camas?: string;
  capacidad: string;
  capacidadAdultos: number;
  capacidadNinos: number;
  metros: number;
  precio: number;
  disponibles: number;
  imagen: string;
  imagenes: string[];
  descripcion?: string;
  servicios?: string[];
}

export interface Review {
  iniciales: string;
  nombre: string;
  tipo: string;
  fecha: string;
  score: number;
  positivo: string;
  negativo?: string;
  respuesta?: string;
  avatarColor?: string;
}

export interface Lodging {
  id: string;
  nombre: string;
  tipo: 'Hotel' | 'Hostal' | 'Motel' | 'Apartamento';
  categoria: number;
  calidad: 'Negocios' | 'Familia' | 'Lujo' | 'Económico' | 'Relajación';
  direccion: string;
  ciudad: string;
  descripcion: string;
  descripcionLarga?: string;
  imagen: string;
  imagenes: string[];
  fotosCount: number;
  precio: number;
  valoracion: number;
  ratingTexto: string;
  reviewsCount: number;
  habitacionesDisponibles: number;
  checkIn: string;
  checkOut: string;
  servicios: string[];
  amenities?: string[];
  aceptaNinos: boolean;
  aceptaMascotas: boolean;
  favorito?: boolean;
  provider: string;
  habitaciones: Room[];
  reviews: Review[];
  zona?: string;
  distanciaCentro?: string;
  transporte?: string;
  alrededores?: string;
  telefono?: string;
  email?: string;
}

export interface ReservaPayload {
  sucursalGuid: string;
  fechaInicio: string;
  fechaFin: string;
  observaciones?: string;
  esWalkin: boolean;
  origenCanalReserva: string;
  cliente: {
    tipoIdentificacion: string;
    numeroIdentificacion: string;
    nombres: string;
    apellidos: string;
    correo: string;
    telefono: string;
    direccion?: string;
  };
  habitaciones: {
    tipoHabitacionGuid: string;
    numHabitaciones: number;
    numAdultos: number;
    numNinos: number;
  }[];
}

export interface ReservaResponse {
  reservaGuid: string;
  codigoReserva: string;
  clienteGuid: string;
  sucursalGuid: string;
  fechaReservaUtc: string;
  fechaInicio: string;
  fechaFin: string;
  subtotalReserva: number;
  valorIva: number;
  totalReserva: number;
  descuentoAplicado: number;
  saldoPendiente: number;
  origenCanalReserva: string;
  estadoReserva: string;
}

export interface SearchCriteria {
  destino?: string;
  fechaInicio?: string;
  fechaFin?: string;
  adultos?: number;
  ninos?: number;
  habitaciones?: number;
}
