import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import { Colors, Spacing, BorderRadius, Shadow } from '../../../constants/theme';

// ── Storage Helper ──────────────────────────────────────────────────────────
async function getStorageItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return null;
}

async function removeStorageItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}

export default function StandaloneFlightConfirmation() {
  const router = useRouter();
  const { guid } = useLocalSearchParams<{ guid: string }>();

  const [vuelo, setVuelo] = useState<any>(null);
  const [asiento, setAsiento] = useState<any>(null);

  useEffect(() => {
    loadConfirmationDetails();
  }, [guid]);

  const loadConfirmationDetails = async () => {
    try {
      const rawVuelos = await getStorageItem('flight-results');
      const lista = rawVuelos ? JSON.parse(rawVuelos) : [];
      const matchedVuelo = lista.find((x: any) => x.guidServicio === guid) ?? null;

      const rawAsiento = await getStorageItem('flight-seat');
      const matchedAsiento = rawAsiento ? JSON.parse(rawAsiento) : null;

      if (matchedVuelo) {
        setVuelo(matchedVuelo);
      } else {
        // Fallback mock
        setVuelo({
          nombreComercial: 'EQ-502',
          origen: 'UIO',
          destino: 'GYE',
          fecha: new Date().toISOString(),
          proveedor: 'Mary',
          precioBase: 120,
        });
      }

      if (matchedAsiento) {
        setAsiento(matchedAsiento);
      }

      // Clear purchasing session
      await removeStorageItem('flight-seat');
    } catch (e) {
      console.warn('Error loading confirmation details', e);
    }
  };

  return (
    <View style={s.root}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.card}>
          <View style={s.successHeader}>
            <View style={s.successCircle}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
            </View>
            <Text style={s.title}>¡Reserva confirmada!</Text>
            <Text style={s.subtitle}>
              Tu pago fue procesado exitosamente. Recibirás los detalles de tu vuelo por correo electrónico.
            </Text>
          </View>

          {vuelo && (
            <View style={s.detailsBox}>
              <Text style={s.sectionTitle}>Detalles del Vuelo</Text>
              <View style={s.flightSummary}>
                <View style={s.flightRoute}>
                  <Text style={s.iataCode}>{vuelo.origen}</Text>
                  <Ionicons name="airplane" size={20} color={Colors.titulo} />
                  <Text style={s.iataCode}>{vuelo.destino}</Text>
                </View>
                <View style={s.flightMeta}>
                  <Text style={s.metaLabel}>NÚMERO DE VUELO</Text>
                  <Text style={s.metaValue}>{vuelo.nombreComercial}</Text>
                </View>
                <View style={s.flightMeta}>
                  <Text style={s.metaLabel}>PROVEEDOR</Text>
                  <Text style={s.metaValue}>{vuelo.proveedor}</Text>
                </View>
                {asiento && (
                  <View style={s.flightMeta}>
                    <Text style={s.metaLabel}>ASIENTO ASIGNADO</Text>
                    <Text style={s.metaValue}>
                      {asiento.numero_asiento} ({asiento.clase === 'business' ? 'Clase Ejecutiva' : 'Clase Turista'})
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={s.actions}>
            <TouchableOpacity style={s.btnSecondary} onPress={() => router.push({ pathname: '/profile', params: { tab: 'vuelos' } })}>
              <Ionicons name="person-outline" size={16} color={Colors.titulo} />
              <Text style={s.btnSecondaryText}>Ver mis reservas</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.btnPrimary} onPress={() => router.push('/')}>
              <Ionicons name="home-outline" size={16} color="#fff" />
              <Text style={s.btnPrimaryText}>Ir al inicio</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Footer />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.md },
  card: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    gap: Spacing.lg,
    ...Shadow.lg,
    marginVertical: Spacing.xl,
  },
  successHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eaf7ee',
  },
  title: { fontSize: 24, fontWeight: '700', color: Colors.extra1, textAlign: 'center' },
  subtitle: { fontSize: 13, color: Colors.subtitulo, textAlign: 'center', lineHeight: 18 },

  detailsBox: {
    backgroundColor: Colors.bg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.titulo, textTransform: 'uppercase', letterSpacing: 0.5 },
  flightSummary: { gap: Spacing.xs },
  flightRoute: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginVertical: Spacing.xs },
  iataCode: { fontSize: 20, fontWeight: '800', color: Colors.extra1 },
  flightMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  metaLabel: { fontSize: 10, fontWeight: '700', color: Colors.subtitulo },
  metaValue: { fontSize: 13, fontWeight: '600', color: Colors.extra1 },

  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  btnSecondaryText: { color: Colors.titulo, fontWeight: '600', fontSize: 14 },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.titulo,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    ...Shadow.md,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
