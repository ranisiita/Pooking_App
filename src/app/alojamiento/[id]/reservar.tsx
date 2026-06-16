import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import PaymentHall from '../../../components/PaymentHall';
import { Colors, Spacing } from '../../../constants/theme';

export default function LodgingBookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string; provider?: string; roomId?: string; roomName?: string;
    precio?: string; llegada?: string; salida?: string; adultos?: string; ninos?: string;
  }>();

  const precioNoche = parseFloat(params.precio ?? '0');
  const nights = (() => {
    if (!params.llegada || !params.salida) return 1;
    return Math.max(1, Math.round((new Date(params.salida).getTime() - new Date(params.llegada).getTime()) / 86400000));
  })();
  const subtotal = precioNoche * nights;
  const iva = +(subtotal * 0.15).toFixed(2);
  const total = +(subtotal + iva).toFixed(2);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <Navbar />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: 12 }}>
        {/* Booking summary header */}
        <View style={s.bookingHeader}>
          <Text style={s.bookingTitle}>Reservar habitación</Text>
          <Text style={s.bookingRoom}>{params.roomName}</Text>
          <Text style={s.bookingDates}>
            {params.llegada} → {params.salida} · {nights} noche{nights > 1 ? 's' : ''} · {params.adultos} adultos
          </Text>
        </View>

        <PaymentHall
          subtotal={subtotal}
          iva={iva}
          total={total}
          ivaLabel="15%"
          itemName={params.roomName ?? 'Habitación'}
          customDetails={[{ name: `${params.roomName ?? 'Habitación'} × ${nights} noches`, value: subtotal }]}
          onPagoExitoso={() => router.push({ pathname: '/alojamiento/confirmacion', params: { roomName: params.roomName, llegada: params.llegada, salida: params.salida, total: String(total) } })}
          onCancel={() => router.back()}
          buttonLabel="Confirmar reserva"
        />
        <Footer />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  bookingHeader: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: 4,
  },
  bookingTitle: { fontSize: 22, fontWeight: '700', color: Colors.titulo },
  bookingRoom: { fontSize: 16, color: Colors.extra2, fontWeight: '600' },
  bookingDates: { fontSize: 13, color: Colors.subtitulo },
});
