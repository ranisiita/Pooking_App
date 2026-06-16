import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Colors, Spacing, BorderRadius, Shadow } from '../constants/theme';

function IconInput({ icon, value, onChangeText, placeholder, keyboardType = 'default', secureTextEntry = false, hasError = false }: any) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={[inp.wrap, focus && inp.wrapFocus, hasError && inp.wrapError]}>
      <Ionicons name={icon} size={18} color={Colors.extra2} />
      <TextInput
        style={inp.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(96,98,86,0.5)"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
      />
    </View>
  );
}

const inp = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: Colors.accentBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: Colors.bg },
  wrapFocus: { borderColor: Colors.titulo, shadowColor: Colors.titulo, shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
  wrapError: { borderColor: Colors.error, backgroundColor: Colors.errorLight },
  input: { flex: 1, fontSize: 15, color: Colors.extra1 },
});

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Correo electrónico inválido.';
    if (password.length < 6) e.password = 'La contraseña debe tener al menos 6 caracteres.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const login = () => {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push('/');
    }, 1200);
  };

  return (
    <View style={s.root}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Background decorativo */}
        <View style={s.bgDeco}>
          <LinearGradient colors={['rgba(142,90,84,0.12)', 'rgba(198,177,125,0.08)']} style={StyleSheet.absoluteFill} />
        </View>

        <View style={s.card}>
          {/* Logo */}
          <View style={s.logoWrap}>
            <Text style={s.logo}>Pooking.com</Text>
            <Text style={s.logoSub}>Bienvenido de nuevo</Text>
          </View>

          <View style={s.form}>
            <View>
              <Text style={s.fieldLabel}>Email <Text style={{ color: Colors.titulo }}>*</Text></Text>
              <IconInput icon="mail-outline" value={email} onChangeText={setEmail} placeholder="correo@ejemplo.com" keyboardType="email-address" hasError={!!errors.email} />
              {!!errors.email && <Text style={s.fieldError}>{errors.email}</Text>}
            </View>

            <View>
              <Text style={s.fieldLabel}>Contraseña <Text style={{ color: Colors.titulo }}>*</Text></Text>
              <IconInput icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry hasError={!!errors.password} />
              {!!errors.password && <Text style={s.fieldError}>{errors.password}</Text>}
            </View>

            <TouchableOpacity style={{ alignSelf: 'flex-end' }}>
              <Text style={s.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.btnPrimary, loading && { opacity: 0.6 }]} onPress={login} disabled={loading} activeOpacity={0.85}>
              {loading ? <Text style={s.btnText}>Iniciando sesión...</Text> : <><Ionicons name="log-in-outline" size={18} color="#fff" /><Text style={s.btnText}>Iniciar sesión</Text></>}
            </TouchableOpacity>

            <View style={s.divider}><View style={s.divLine} /><Text style={s.divText}>o</Text><View style={s.divLine} /></View>

            <View style={s.signupRow}>
              <Text style={s.signupText}>¿No tienes cuenta?</Text>
              <TouchableOpacity onPress={() => router.push('/signup')}>
                <Text style={s.signupLink}>Regístrate aquí</Text>
              </TouchableOpacity>
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
  bgDeco: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },

  card: {
    margin: Spacing.xl, marginTop: Spacing.xxl,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 5, borderLeftColor: Colors.titulo,
    padding: Spacing.xl, gap: Spacing.xl,
    maxWidth: 480, alignSelf: 'center', width: '100%',
    ...Shadow.lg,
  },
  logoWrap: { alignItems: 'center', gap: 4 },
  logo: { fontSize: 28, fontWeight: '700', color: Colors.titulo, letterSpacing: 0.5 },
  logoSub: { fontSize: 15, color: Colors.subtitulo },

  form: { gap: Spacing.md },
  fieldLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', color: Colors.extra1, letterSpacing: 0.5, marginBottom: 6 },
  fieldError: { fontSize: 12, color: Colors.error, marginTop: 3 },
  forgotText: { fontSize: 13, color: Colors.titulo, textDecorationLine: 'underline' },

  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.titulo, borderRadius: BorderRadius.md, paddingVertical: 15, marginTop: 4, ...Shadow.md },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  divText: { fontSize: 13, color: Colors.textMuted },

  signupRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  signupText: { fontSize: 14, color: Colors.subtitulo },
  signupLink: { fontSize: 14, color: Colors.titulo, fontWeight: '600', textDecorationLine: 'underline' },
});
