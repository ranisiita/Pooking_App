// ─────────────────────────────────────────────────────────────────────────────
// ProcessingOverlay — flotante de "cargando" para acciones importantes (pago/reserva).
//
// Replica el mismo estilo del toast de carga de Alojamiento (toast oscuro con spinner
// + título + subtítulo), y además añade un backdrop a pantalla completa que CAPTURA los
// toques: mientras está visible, bloquea la interacción debajo (incluido el botón de pagar),
// evitando doble tap / doble clic y solicitudes/reservas duplicadas.
//
// - Respeta el safe area (el toast queda debajo de la barra de estado, nunca encima).
// - Funciona en móvil (Expo Go) y en web.
// ─────────────────────────────────────────────────────────────────────────────

import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, Shadow } from '../constants/theme';

interface ProcessingOverlayProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
}

export default function ProcessingOverlay({
  visible,
  title = 'Procesando pago...',
  subtitle = 'Esto puede demorar unos segundos.',
}: ProcessingOverlayProps) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    // pointerEvents="auto" → el backdrop intercepta TODOS los toques mientras carga.
    <View style={styles.backdrop} pointerEvents="auto">
      <View style={[styles.toast, { top: insets.top + 12 }]}>
        <ActivityIndicator size="small" color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
    zIndex: 9999,
  },
  toast: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    alignSelf: 'center',
    maxWidth: 460,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.extra1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadow.lg,
  },
  title: { fontSize: 13, fontWeight: '700', color: '#fff' },
  sub: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
});
