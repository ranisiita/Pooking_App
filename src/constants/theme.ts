// ================================================
// POOKING.COM — DESIGN TOKENS (React Native)
// Replicados exactamente desde el proyecto Angular
// ================================================

export const Colors = {
  // Paleta original del proyecto Angular
  bg: '#fbf8ea',          // --color-bg (fondo crema)
  titulo: '#8E5A54',       // --color-titulo (terracota — color primario)
  subtitulo: '#606256',    // --color-subtitulo
  extra1: '#46403C',       // --color-extra1 (texto oscuro)
  extra2: '#C6B17D',       // --color-extra2 (dorado)

  // Derivados / aliases semánticos
  primary: '#8E5A54',
  primaryDark: '#7a4a44',
  primaryLight: 'rgba(142, 90, 84, 0.12)',
  accent: '#C6B17D',
  accentLight: 'rgba(198, 177, 125, 0.25)',
  accentBorder: 'rgba(198, 177, 125, 0.5)',

  // Superficies
  background: '#fbf8ea',
  surface: '#ffffff',
  surfaceElevated: 'rgba(251, 248, 234, 0.92)',
  border: 'rgba(198, 177, 125, 0.3)',
  borderFocus: '#8E5A54',

  // Texto
  text: '#46403C',
  textSecondary: '#606256',
  textMuted: 'rgba(96, 98, 86, 0.6)',
  textLight: '#ffffff',

  // Feedback
  error: '#c0392b',
  errorLight: 'rgba(192, 57, 43, 0.1)',
  success: '#27ae60',
  star: '#F5C518',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.45)',
  overlayBlur: 'rgba(70, 64, 60, 0.6)',

  // Boilerplate layout aliases
  backgroundElement: '#ffffff',
  backgroundSelected: 'rgba(198, 177, 125, 0.12)',
};

export type ThemeColor = keyof typeof Colors;

export const Fonts = {
  titulo:       'PlayfairDisplay-Bold',    // --font-titulo: Playfair Display (headings)
  body:         'Poppins-Regular',         // --font-body:   Poppins (body text)
  bodySemiBold: 'Poppins-SemiBold',
  bodyMedium:   'Poppins-Medium',
  mono: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
};

export const MaxContentWidth = 1200;

import { Platform } from 'react-native';

export const Typography = {
  // Títulos — Playfair Display (--font-titulo)
  h1: { fontSize: 32, fontWeight: '700' as const, color: Colors.titulo, fontFamily: 'PlayfairDisplay-Bold' },
  h2: { fontSize: 24, fontWeight: '700' as const, color: Colors.titulo, fontFamily: 'PlayfairDisplay-Bold' },
  h3: { fontSize: 20, fontWeight: '600' as const, color: Colors.titulo, fontFamily: 'PlayfairDisplay-SemiBold' },
  h4: { fontSize: 18, fontWeight: '600' as const, color: Colors.extra1, fontFamily: 'PlayfairDisplay-SemiBold' },

  // Cuerpo — Poppins (--font-body)
  body:      { fontSize: 16, fontWeight: '400' as const, color: Colors.extra1,    fontFamily: 'Poppins-Regular'   },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, color: Colors.subtitulo, fontFamily: 'Poppins-Regular'   },
  label:     { fontSize: 12, fontWeight: '600' as const, color: Colors.extra1,    fontFamily: 'Poppins-SemiBold', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  caption:   { fontSize: 12, fontWeight: '400' as const, color: Colors.subtitulo, fontFamily: 'Poppins-Regular'   },

  // Logo
  logo: { fontSize: 26, fontWeight: '700' as const, color: Colors.titulo, fontFamily: 'PlayfairDisplay-Bold', letterSpacing: 0.5 },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,

  // Boilerplate numeric aliases
  half: 4,
  one: 8,
  two: 16,
  three: 24,
  four: 32,
  five: 40,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#46403C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: '#46403C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
};
