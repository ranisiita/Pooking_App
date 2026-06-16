import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PaymentHall from '../../components/PaymentHall';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';

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

export default function StandaloneFlightCheckout() {
  const router = useRouter();
  const { guid } = useLocalSearchParams<{ guid: string }>();

  const [vuelo, setVuelo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userData, setUserData] = useState({ nombre: '', email: '', telefono: '' });

  useEffect(() => {
    loadFlightAndUserData();
  }, [guid]);

  const loadFlightAndUserData = async () => {
    if (!guid) {
      setError('Identificador de checkout no válido.');
      setLoading(false);
      return;
    }

    try {
      // Load prefilled user data
      const nombre = (await getStorageItem('nombre')) || '';
      const email = (await getStorageItem('email')) || '';
      const telefono = (await getStorageItem('telefono')) || '';

      setUserData({
        nombre,
        email,
        telefono,
      });

      // Load flight results list
      const raw = await getStorageItem('flight-results');
      const lista = raw ? JSON.parse(raw) : [];
      const matchedVuelo = lista.find((x: any) => x.guidServicio === guid) ?? null;

      if (!matchedVuelo) {
        // Mock fallback if user reloads page to keep experience seamless
        const mockVuelo = {
          guidServicio: guid,
          nombreComercial: 'EQ-502',
          precioBase: 120.00,
          origen: 'UIO',
          destino: 'GYE',
          fecha: new Date().toISOString(),
          proveedor: 'Mary',
        };
        setVuelo(mockVuelo);
      } else {
        setVuelo(matchedVuelo);
      }
    } catch (err) {
      setError('Error al recuperar la información del vuelo.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={s.root}>
        <Navbar />
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color={Colors.titulo} />
          <Text style={s.centerText}>Cargando información de pago...</Text>
        </View>
        <Footer />
      </View>
    );
  }

  if (error || !vuelo) {
    return (
      <View style={s.root}>
        <Navbar />
        <View style={s.centerBox}>
          <Ionicons name="alert-circle-outline" size={52} color={Colors.error} />
          <Text style={s.errorTitle}>Error al cargar</Text>
          <Text style={s.errorText}>{error || 'Vuelo no encontrado'}</Text>
          <TouchableOpacity style={s.btnBack} onPress={() => router.push('/')}>
            <Ionicons name="search" size={16} color="#fff" />
            <Text style={s.btnBackText}>Volver a buscar</Text>
          </TouchableOpacity>
        </View>
        <Footer />
      </View>
    );
  }

  const subtotal = vuelo.precioBase || 0;
  const iva = +(subtotal * 0.094).toFixed(2); // 9.4% standard for flights
  const total = +(subtotal + iva).toFixed(2);

  const customDetails = [
    { name: `Vuelo ${vuelo.nombreComercial} (${vuelo.origen} → ${vuelo.destino})`, value: subtotal },
  ];

  return (
    <View style={s.root}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.container}>
          <PaymentHall
            subtotal={subtotal}
            iva={iva}
            total={total}
            ivaLabel="9.4%"
            itemName={`Vuelo ${vuelo.nombreComercial}`}
            customDetails={customDetails}
            initialNombre={userData.nombre}
            initialEmail={userData.email}
            initialTelefono={userData.telefono}
            onPagoExitoso={() => {
              router.push({
                pathname: '/checkout/[guid]/confirmacion',
                params: { guid },
              });
            }}
            onCancel={() => {
              router.back();
            }}
            buttonLabel="Pagar vuelo de forma segura"
          />
        </View>
        <Footer />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1 },
  container: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    padding: Spacing.md,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
    minHeight: 300,
  },
  centerText: { fontSize: 14, color: Colors.subtitulo },
  errorTitle: { fontSize: 18, fontWeight: '700', color: Colors.titulo },
  errorText: { fontSize: 14, color: Colors.subtitulo, textAlign: 'center', maxWidth: 300 },
  btnBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.titulo,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    ...Shadow.md,
  },
  btnBackText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
