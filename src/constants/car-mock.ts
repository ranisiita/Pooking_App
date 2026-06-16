export interface Extra {
  idExtra: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  valorFijo: number;
  estado: string;
  icono: string;
}

export const EXTRAS_MOCK: Extra[] = [
  {
    idExtra: 1,
    codigo: 'GPS',
    nombre: 'GPS',
    descripcion: 'Navegador GPS integrado con mapas actualizados',
    valorFijo: 5.00,
    estado: 'ACT',
    icono: 'location-outline',
  },
  {
    idExtra: 2,
    codigo: 'SILLA-BEBE',
    nombre: 'Silla de bebé',
    descripcion: 'Silla de seguridad para niños hasta 18 kg',
    valorFijo: 7.50,
    estado: 'ACT',
    icono: 'baby-carriage-outline', // Adapted for Ionicons
  },
  {
    idExtra: 3,
    codigo: 'SEG-EXTRA',
    nombre: 'Seguro complementario',
    descripcion: 'Cobertura adicional sin franquicia para colisión y robo',
    valorFijo: 12.00,
    estado: 'ACT',
    icono: 'shield-checkmark-outline', // Adapted for Ionicons
  },
  {
    idExtra: 4,
    codigo: 'CHOFER',
    nombre: 'Chofer profesional',
    descripcion: 'Conductor certificado disponible todo el día',
    valorFijo: 45.00,
    estado: 'ACT',
    icono: 'person-outline',
  },
  {
    idExtra: 5,
    codigo: 'WIFI',
    nombre: 'Wi-Fi portátil',
    descripcion: 'Router 4G LTE con datos ilimitados durante el alquiler',
    valorFijo: 8.00,
    estado: 'ACT',
    icono: 'wifi-outline',
  },
];
