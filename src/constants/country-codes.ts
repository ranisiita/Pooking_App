// Códigos telefónicos de países — portado desde Pooking_Interface
// (src/app/shared/data/country-codes.ts)

export interface CountryCode {
  name: string;
  code: string;
  flag: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { name: 'Ecuador', code: '+593', flag: '🇪🇨' },
  { name: 'Estados Unidos', code: '+1', flag: '🇺🇸' },
  { name: 'Colombia', code: '+57', flag: '🇨🇴' },
  { name: 'Perú', code: '+51', flag: '🇵🇪' },
  { name: 'México', code: '+52', flag: '🇲🇽' },
  { name: 'Argentina', code: '+54', flag: '🇦🇷' },
  { name: 'Chile', code: '+56', flag: '🇨🇱' },
  { name: 'España', code: '+34', flag: '🇪🇸' },
  { name: 'Venezuela', code: '+58', flag: '🇻🇪' },
  { name: 'Bolivia', code: '+591', flag: '🇧🇴' },
  { name: 'Brasil', code: '+55', flag: '🇧🇷' },
  { name: 'Paraguay', code: '+595', flag: '🇵🇾' },
  { name: 'Uruguay', code: '+598', flag: '🇺🇾' },
  { name: 'Panamá', code: '+507', flag: '🇵🇦' },
  { name: 'Costa Rica', code: '+506', flag: '🇨🇷' },
  { name: 'Canadá', code: '+1', flag: '🇨🇦' },
  { name: 'Reino Unido', code: '+44', flag: '🇬🇧' },
  { name: 'Alemania', code: '+49', flag: '🇩🇪' },
  { name: 'Francia', code: '+33', flag: '🇫🇷' },
  { name: 'Italia', code: '+39', flag: '🇮🇹' },
];
