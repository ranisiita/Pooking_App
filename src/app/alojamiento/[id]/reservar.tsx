import React, { useMemo } from 'react';
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
    seleccion?: string;
  }>();

  const selectedRooms = useMemo(() => {
    try {
      return params.seleccion ? JSON.parse(params.seleccion) : [];
    } catch {
      return [];
    }
  }, [params.seleccion]);

  const nights = useMemo(() => {
    if (!params.llegada || !params.salida) return 1;
    return Math.max(1, Math.round((new Date(params.salida).getTime() - new Date(params.llegada).getTime()) / 86400000));
  }, [params.llegada, params.salida]);

  const subtotal = useMemo(() => {
    if (selectedRooms.length > 0) {
      return selectedRooms.reduce((sum: number, sel: any) => sum + (sel.precio * sel.habitaciones), 0) * nights;
    }
    const precioNoche = parseFloat(params.precio ?? '0');
    return precioNoche * nights;
  }, [selectedRooms, params.precio, nights]);

  const iva = +(subtotal * 0.15).toFixed(2);
  const total = +(subtotal + iva).toFixed(2);

  const roomDescription = useMemo(() => {
    if (selectedRooms.length > 0) {
      return selectedRooms.map((sel: any) => `${sel.roomName} (x${sel.habitaciones})`).join(', ');
    }
    return params.roomName ?? 'Habitación';
  }, [selectedRooms, params.roomName]);

  const itemDetails = useMemo(() => {
    if (selectedRooms.length > 0) {
      return selectedRooms.map((sel: any) => ({
        name: `${sel.roomName} (x${sel.habitaciones}) × ${nights} noches`,
        value: sel.precio * sel.habitaciones * nights
      }));
    }
    return [{ name: `${roomDescription} × ${nights} noches`, value: subtotal }];
  }, [selectedRooms, roomDescription, nights, subtotal]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <Navbar />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: 12 }}>
        
        {/* Booking summary header */}
        <View style={s.bookingHeader}>
          <Text style={s.bookingTitle}>Reservar alojamiento</Text>
          <Text style={s.bookingRoom} numberOfLines={2}>{roomDescription}</Text>
          <Text style={s.bookingDates}>
            {params.llegada} → {params.salida} · {nights} noche{nights > 1 ? 's' : ''} · {params.adultos} adultos{params.ninos && params.ninos !== '0' ? ` y ${params.ninos} niños` : ''}
          </Text>
        </View>

        <PaymentHall
          subtotal={subtotal}
          iva={iva}
          total={total}
          ivaLabel="15%"
          itemName={roomDescription}
          customDetails={itemDetails}
          onPagoExitoso={() => router.push({
            pathname: '/alojamiento/confirmacion',
            params: {
              roomName: roomDescription,
              llegada: params.llegada ?? '',
              salida: params.salida ?? '',
              total: String(total),
            }
          })}
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
  bookingTitle: { fontSize: 22, fontWeight: '700', color: Colors.titulo, fontFamily: 'PlayfairDisplay-Bold' },
  bookingRoom: { fontSize: 15, color: Colors.extra2, fontWeight: '600' },
  bookingDates: { fontSize: 13, color: Colors.subtitulo },
});
