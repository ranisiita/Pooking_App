import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Colors, Spacing, BorderRadius, Shadow } from '../constants/theme';

function IconInput({ icon, value, onChangeText, placeholder, keyboardType = 'default', secureTextEntry = false, hasError = false }: any) {
  return (
    <View style={[inp.wrap, hasError && inp.wrapError]}>
      <Ionicons name={icon} size={18} color={Colors.extra2} />
      <TextInput style={inp.input} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="rgba(96,98,86,0.5)" keyboardType={keyboardType} secureTextEntry={secureTextEntry} />
    </View>
  );
}
const inp = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: Colors.accentBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: Colors.bg },
  wrapError: { borderColor: Colors.error, backgroundColor: Colors.errorLight },
  input: { flex: 1, fontSize: 15, color: Colors.extra1 },
});

export default function SignupScreen() {
  const router = useRouter();
  const [form, setForm] = useState({ nombre: '', apellidos: '', email: '', password: '', confirmar: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nombre.trim() || form.nombre.length < 2) e.nombre = 'Mínimo 2 caracteres.';
    if (!form.apellidos.trim()) e.apellidos = 'Requerido.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Correo inválido.';
    if (form.password.length < 8) e.password = 'Mínimo 8 caracteres.';
    if (form.confirmar !== form.password) e.confirmar = 'Las contraseñas no coinciden.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const register = () => {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); router.push('/'); }, 1200);
  };

  const F = (key: keyof typeof form) => (v: string) => setForm({ ...form, [key]: v });

  return (
    <View style={s.root}>
      <Navbar />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.card}>
          <View style={s.logoWrap}>
            <Text style={s.logo}>Pooking.com</Text>
            <Text style={s.logoSub}>Crea tu cuenta</Text>
          </View>

          <View style={s.form}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Nombre <Text style={{ color: Colors.titulo }}>*</Text></Text>
                <IconInput icon="person-outline" value={form.nombre} onChangeText={F('nombre')} placeholder="Tu nombre" hasError={!!errors.nombre} />
                {!!errors.nombre && <Text style={s.err}>{errors.nombre}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Apellidos <Text style={{ color: Colors.titulo }}>*</Text></Text>
                <IconInput icon="id-card-outline" value={form.apellidos} onChangeText={F('apellidos')} placeholder="Tus apellidos" hasError={!!errors.apellidos} />
                {!!errors.apellidos && <Text style={s.err}>{errors.apellidos}</Text>}
              </View>
            </View>

            <View>
              <Text style={s.label}>Email <Text style={{ color: Colors.titulo }}>*</Text></Text>
              <IconInput icon="mail-outline" value={form.email} onChangeText={F('email')} placeholder="correo@ejemplo.com" keyboardType="email-address" hasError={!!errors.email} />
              {!!errors.email && <Text style={s.err}>{errors.email}</Text>}
            </View>

            <View>
              <Text style={s.label}>Contraseña <Text style={{ color: Colors.titulo }}>*</Text></Text>
              <IconInput icon="lock-closed-outline" value={form.password} onChangeText={F('password')} placeholder="Mínimo 8 caracteres" secureTextEntry hasError={!!errors.password} />
              {!!errors.password && <Text style={s.err}>{errors.password}</Text>}
            </View>

            <View>
              <Text style={s.label}>Confirmar contraseña <Text style={{ color: Colors.titulo }}>*</Text></Text>
              <IconInput icon="lock-closed-outline" value={form.confirmar} onChangeText={F('confirmar')} placeholder="Repite tu contraseña" secureTextEntry hasError={!!errors.confirmar} />
              {!!errors.confirmar && <Text style={s.err}>{errors.confirmar}</Text>}
            </View>

            <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={register} disabled={loading} activeOpacity={0.85}>
              <Ionicons name="person-add-outline" size={18} color="#fff" />
              <Text style={s.btnText}>{loading ? 'Registrando...' : 'Crear cuenta'}</Text>
            </TouchableOpacity>

            <View style={s.loginRow}>
              <Text style={s.loginText}>¿Ya tienes cuenta?</Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={s.loginLink}>Inicia sesión</Text>
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
  card: {
    margin: Spacing.xl, marginTop: Spacing.xxl,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 5, borderLeftColor: Colors.titulo,
    padding: Spacing.xl, gap: Spacing.xl,
    maxWidth: 580, alignSelf: 'center', width: '100%', ...Shadow.lg,
  },
  logoWrap: { alignItems: 'center', gap: 4 },
  logo: { fontSize: 28, fontWeight: '700', color: Colors.titulo, letterSpacing: 0.5 },
  logoSub: { fontSize: 15, color: Colors.subtitulo },
  form: { gap: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.md },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', color: Colors.extra1, letterSpacing: 0.5, marginBottom: 6 },
  err: { fontSize: 12, color: Colors.error, marginTop: 3 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.titulo, borderRadius: BorderRadius.md, paddingVertical: 15, marginTop: 4, ...Shadow.md },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  loginText: { fontSize: 14, color: Colors.subtitulo },
  loginLink: { fontSize: 14, color: Colors.titulo, fontWeight: '600', textDecorationLine: 'underline' },
});
