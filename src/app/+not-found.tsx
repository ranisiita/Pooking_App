import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Página no encontrada', headerShown: false }} />
      <View style={styles.container}>
        <Ionicons name="compass-outline" size={64} color={Colors.titulo} />
        <Text style={styles.code}>404</Text>
        <Text style={styles.title}>Página no encontrada</Text>
        <Text style={styles.subtitle}>
          La pantalla que buscas no existe o fue movida.
        </Text>

        <Link href="/" style={styles.button}>
          <Text style={styles.buttonText}>Volver al inicio</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.background,
  },
  code: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.titulo,
    marginTop: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.titulo,
    marginTop: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.subtitulo,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    maxWidth: 320,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
