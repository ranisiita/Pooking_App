import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { Colors } from '../constants/theme';

// ── Pre-load Google Fonts (Playfair Display + Poppins) ──────────────────────
// On web, global.css handles this via @import.
// On native (iOS/Android), expo-font fetches them at runtime.
const FONTS = {
  'PlayfairDisplay-Regular':  'https://fonts.gstatic.com/s/playfairdisplay/v36/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtXK-F2qC0s.woff2',
  'PlayfairDisplay-SemiBold': 'https://fonts.gstatic.com/s/playfairdisplay/v36/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtXK-F2qK0w2PKd.woff2',
  'PlayfairDisplay-Bold':     'https://fonts.gstatic.com/s/playfairdisplay/v36/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtXK-F2qC0s.woff2',
  'Poppins-Light':            'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLDz8Z1xlFd2JQEl8qw.woff2',
  'Poppins-Regular':          'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecg.woff2',
  'Poppins-Medium':           'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLGT9Z1xlFd2JQEl8qw.woff2',
  'Poppins-SemiBold':         'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLEj6Z1xlFd2JQEl8qw.woff2',
  'Poppins-Bold':             'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1xlFd2JQEl8qw.woff2',
};

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      Font.loadAsync(FONTS).catch(() => {
        // Fonts may fail silently. Native falls back to system font.
      });
    }
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: Colors.background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="buscar" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="alojamiento/resultados" />
        <Stack.Screen name="alojamiento/[id]" />
        <Stack.Screen name="alojamiento/[id]/reservar" />
        <Stack.Screen name="autos/resultados" />
        <Stack.Screen name="autos/detalle/[id]" />
        <Stack.Screen name="autos/checkout/[id]" />
        <Stack.Screen name="autos/pago/[id]" />
        <Stack.Screen name="autos/confirmacion/[id]" />
        <Stack.Screen name="vuelos/resultados" />
        <Stack.Screen name="atracciones/index" />
        <Stack.Screen name="atracciones/[id]" />
        <Stack.Screen name="atracciones/[id]/reservar" />
        <Stack.Screen name="checkout/[guid]" />
        <Stack.Screen name="checkout/[guid]/confirmacion" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}
