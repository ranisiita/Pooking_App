import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import { Colors, Spacing, BorderRadius, Shadow } from '../../../constants/theme';
import { getStorageItem, removeStorageItem } from '../../../services/storage';

export default function CarConfirmationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [reserva, setReserva] = useState<any>(null);

  useEffect(() => {
    async function loadConfirmation() {
      const raw = await getStorageItem('car-reserva');
      if (raw) {
        try {
          setReserva(JSON.parse(raw));
        } catch (err) {
          console.error(err);
        }
      }
      // Clean up confirmation SNAP to prevent duplicates on reload
      await removeStorageItem('car-reserva');
    }
    loadConfirmation();
  }, []);

  const irAlInicio = () => router.push('/');
  const buscarOtro = () => router.push('/autos/resultados');
  const irAlPerfil = () => router.push('/profile');

  return (
    <View style={s.root}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.container}>
          <View style={s.card}>
            {/* Header Success Icon */}
            <View style={s.successHeader}>
              <View style={s.iconCircle}>
                <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
              </View>
              <Text style={s.successTitle}>¡Reserva Confirmada!</Text>
              <Text style={s.successSub}>Tu pago ha sido procesado de forma exitosa y el vehículo está bloqueado para tu viaje.</Text>
            </View>

            {/* Reservation code snap */}
            <View style={s.codeBox}>
              <Text style={s.codeLabel}>Código de Reserva</Text>
              <Text style={s.codeValue}>{reserva?.codigoReserva || `RES-CAR-${id || '000'}`}</Text>
              <Text style={s.codeStatus}>{reserva?.estado === 'ACT' ? 'ACTIVA / PAGADA' : 'CONFIRMADA'}</Text>
            </View>

            {reserva && (
              <View style={s.details}>
                {/* Vehicle details */}
                <Text style={s.sectionTitle}>Vehículo Alquilado</Text>
                <View style={s.vehicleRow}>
                  <Image
                    source={{ uri: reserva.vehiculo?.imagenUrl || 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80' }}
                    style={s.vehicleImg}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.vehicleName}>{reserva.vehiculo?.marca} {reserva.vehiculo?.modelo}</Text>
                    <Text style={s.vehicleSub}>Año {reserva.vehiculo?.anio} · {reserva.vehiculo?.combustible || 'Gasolina'}</Text>
                  </View>
                </View>

                {/* Driver details */}
                <Text style={[s.sectionTitle, { marginTop: Spacing.md }]}>Conductor Principal</Text>
                <View style={s.driverBox}>
                  <View style={s.driverField}>
                    <Text style={s.driverLabel}>Nombres</Text>
                    <Text style={s.driverVal}>{reserva.conductor?.nombres} {reserva.conductor?.apellidos}</Text>
                  </View>
                  <View style={s.driverField}>
                    <Text style={s.driverLabel}>Correo</Text>
                    <Text style={s.driverVal}>{reserva.conductor?.correo}</Text>
                  </View>
                  {reserva.conductor?.telefono ? (
                    <View style={s.driverField}>
                      <Text style={s.driverLabel}>Teléfono</Text>
                      <Text style={s.driverVal}>{reserva.conductor?.telefono}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            )}

            {/* Actions list */}
            <View style={s.actions}>
              <TouchableOpacity style={s.btnPrimary} onPress={irAlPerfil}>
                <Ionicons name="person-outline" size={16} color="#fff" />
                <Text style={s.btnPrimaryText}>Ir a mis reservas</Text>
              </TouchableOpacity>

              <View style={s.rowActions}>
                <TouchableOpacity style={s.btnSecondary} onPress={buscarOtro}>
                  <Text style={s.btnSecondaryText}>Alquilar otro auto</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnSecondary} onPress={irAlInicio}>
                  <Text style={s.btnSecondaryText}>Ir al inicio</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    padding: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderTopWidth: 5,
    borderTopColor: Colors.success,
    padding: Spacing.xl,
    gap: Spacing.lg,
    ...Shadow.md,
  },
  successHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.success,
  },
  successSub: {
    fontSize: 13,
    color: Colors.subtitulo,
    textAlign: 'center',
    lineHeight: 18,
  },
  codeBox: {
    backgroundColor: 'rgba(39, 174, 96, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(39, 174, 96, 0.2)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.subtitulo,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.titulo,
  },
  codeStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success,
    marginTop: 2,
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.titulo,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  vehicleImg: {
    width: 70,
    height: 50,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#eaeaea',
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.extra1,
  },
  vehicleSub: {
    fontSize: 11,
    color: Colors.subtitulo,
  },
  driverBox: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  driverField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  driverLabel: {
    fontSize: 12,
    color: Colors.subtitulo,
  },
  driverVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.extra1,
  },
  actions: {
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.titulo,
    borderRadius: BorderRadius.sm,
    paddingVertical: 12,
    ...Shadow.sm,
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  rowActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.titulo,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  btnSecondaryText: {
    color: Colors.titulo,
    fontWeight: '700',
    fontSize: 13,
  },
});
