import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { Colors, Spacing, BorderRadius, Shadow } from '../../constants/theme';

export default function LodgingConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ roomName?: string; llegada?: string; salida?: string; total?: string }>();
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
  }, []);

  return (
    <View style={s.root}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.container}>
          <Animated.View style={[s.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
            <Ionicons name="checkmark" size={52} color="#fff" />
          </Animated.View>

          <Text style={s.title}>¡Reserva confirmada!</Text>
          <Text style={s.subtitle}>Tu habitación ha sido reservada exitosamente. Recibirás los detalles en tu correo electrónico.</Text>

          <View style={s.detailCard}>
            {params.roomName && <DetailRow label="Habitación" value={params.roomName} />}
            {params.llegada && <DetailRow label="Llegada" value={params.llegada} />}
            {params.salida && <DetailRow label="Salida" value={params.salida} />}
            {params.total && <DetailRow label="Total pagado" value={`$${params.total} USD`} highlight />}
          </View>

          <View style={s.actions}>
            <TouchableOpacity style={s.btnPrimary} onPress={() => router.push('/')} activeOpacity={0.85}>
              <Ionicons name="home-outline" size={18} color="#fff" />
              <Text style={s.btnPrimaryText}>Volver al inicio</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnSecondary} onPress={() => router.push({ pathname: '/buscar', params: { tab: 'alojamiento' } })} activeOpacity={0.8}>
              <Ionicons name="search-outline" size={18} color={Colors.titulo} />
              <Text style={s.btnSecondaryText}>Nueva búsqueda</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Footer />
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailValue, highlight && { color: Colors.titulo, fontWeight: '700', fontSize: 17 }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1 },
  container: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl, gap: Spacing.xl, maxWidth: 580, alignSelf: 'center', width: '100%' },

  checkCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#27ae60', alignItems: 'center', justifyContent: 'center', ...Shadow.lg },
  title: { fontSize: 28, fontWeight: '700', color: Colors.titulo, textAlign: 'center' },
  subtitle: { fontSize: 15, color: Colors.subtitulo, textAlign: 'center', lineHeight: 22 },

  detailCard: {
    width: '100%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.xl,
    borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 5, borderLeftColor: Colors.titulo,
    gap: Spacing.md, ...Shadow.sm,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', color: Colors.subtitulo, letterSpacing: 0.5 },
  detailValue: { fontSize: 15, color: Colors.extra1 },

  actions: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap', justifyContent: 'center', width: '100%' },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.titulo, borderRadius: BorderRadius.md, paddingVertical: 14, paddingHorizontal: Spacing.xl, ...Shadow.md },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnSecondary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, paddingVertical: 14, paddingHorizontal: Spacing.xl },
  btnSecondaryText: { color: Colors.titulo, fontWeight: '600', fontSize: 15 },
});
