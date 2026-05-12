import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, ScrollView, Alert,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { MifLogo } from '@/components/MifLogo';
import { register } from '@/services/auth';

export default function RegisterScreen() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = () => {
    Alert.alert(
      'Próximamente',
      'El inicio de sesión con Google estará disponible en la versión publicada de la app. Por ahora usá email y contraseña.',
      [{ text: 'Entendido' }],
    );
  };

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) {
      Alert.alert('Completá nombre, email y contraseña'); return;
    }
    if (form.password !== form.confirm) {
      Alert.alert('Las contraseñas no coinciden'); return;
    }
    if (form.password.length < 6) {
      Alert.alert('La contraseña debe tener al menos 6 caracteres'); return;
    }
    setLoading(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      router.replace('/(client)');
    } catch (e: any) {
      const msg =
        e.code === 'auth/email-already-in-use' ? 'Ese email ya está registrado' :
        e.code === 'auth/invalid-email'         ? 'El email no es válido' :
        'Error al crear la cuenta';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <MifLogo light />
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Es rápido, te lo prometemos</Text>

          {[
            { label: 'Nombre completo', key: 'name', icon: 'person-outline', placeholder: 'Juan García', type: 'default' },
            { label: 'Email', key: 'email', icon: 'mail-outline', placeholder: 'juan@email.com', type: 'email-address' },
            { label: 'Teléfono', key: 'phone', icon: 'call-outline', placeholder: '+54 11 1234-5678', type: 'phone-pad' },
          ].map(({ label, key, icon, placeholder, type }) => (
            <View key={key}>
              <Text style={styles.label}>{label}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name={icon as any} size={18} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={placeholder}
                  placeholderTextColor={Colors.placeholderText}
                  keyboardType={type as any}
                  autoCapitalize={type === 'default' ? 'words' : 'none'}
                  value={(form as any)[key]}
                  onChangeText={(v) => setForm({ ...form, [key]: v })}
                />
              </View>
            </View>
          ))}

          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor={Colors.placeholderText}
              secureTextEntry={!showPass}
              value={form.password}
              onChangeText={(v) => setForm({ ...form, password: v })}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textLight} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirmar contraseña</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Repetí tu contraseña"
              placeholderTextColor={Colors.placeholderText}
              secureTextEntry
              value={form.confirm}
              onChangeText={(v) => setForm({ ...form, confirm: v })}
            />
          </View>

          <TouchableOpacity
            style={styles.btnGoogle}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color={Colors.text} style={{ marginRight: 10 }} />
            <Text style={styles.btnGoogleText}>Registrarse con Google</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o con email</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.terms}>
            Al registrarte aceptás los{' '}
            <Text style={styles.termsLink}>Términos y condiciones</Text>
            {' '}y la{' '}
            <Text style={styles.termsLink}>Política de privacidad</Text>
          </Text>

          <TouchableOpacity
            style={[styles.btnRegister, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.btnRegisterText}>{loading ? 'Creando cuenta...' : 'Crear cuenta'}</Text>
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>¿Ya tenés cuenta? </Text>
            <Link href="/auth/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Iniciá sesión</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scroll: { flex: 1 },
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    flex: 1,
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 22 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: Colors.background,
    marginBottom: 14,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: Colors.text },
  btnGoogle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
    paddingVertical: 13, marginBottom: 16,
  },
  btnGoogleText: { fontSize: 15, fontWeight: '500', color: Colors.text },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { marginHorizontal: 10, color: Colors.textLight, fontSize: 12 },
  terms: { fontSize: 12, color: Colors.textSecondary, marginBottom: 20, lineHeight: 18 },
  termsLink: { color: Colors.primary, fontWeight: '500' },
  btnRegister: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  btnRegisterText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { fontSize: 14, color: Colors.textSecondary },
  loginLink: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
});
