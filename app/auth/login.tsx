import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/context/ThemeContext';
import { AppColors } from '@/theme/colors';
import { MifLogo } from '@/components/MifLogo';
import { login, getUserRole } from '@/services/auth';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginScreen() {
  const Colors = useColors();
  const styles = makeStyles(Colors);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [gLoading, setGLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Completá email y contraseña'); return; }
    setLoading(true);
    try {
      const u = await login(email.trim(), password);
      const role = await getUserRole(u.uid);
      router.replace(role === 'restaurant' ? '/(restaurant)/dashboard' : '/(client)');
    } catch (e: any) {
      const msg =
        e.code === 'auth/invalid-credential' ? 'Email o contraseña incorrectos' :
        e.code === 'auth/too-many-requests'  ? 'Demasiados intentos. Intentá más tarde' :
        'Error al iniciar sesión';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Ingresá tu email', 'Escribí tu email en el campo de arriba y tocá "¿Olvidaste tu contraseña?".');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Email enviado', `Te mandamos un link para restablecer la contraseña a ${email.trim()}.`);
    } catch (e: any) {
      const msg = e.code === 'auth/user-not-found'
        ? 'No hay ninguna cuenta con ese email.'
        : 'No se pudo enviar el email. Intentá de nuevo.';
      Alert.alert('Error', msg);
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert(
      'Próximamente',
      'El inicio de sesión con Google estará disponible en la versión publicada de la app. Por ahora usá email y contraseña.',
      [{ text: 'Entendido' }],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>

        <View style={styles.top}>
          <MifLogo size="large" light />
          <Text style={styles.tagline}>Encontrá tu próxima experiencia</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Iniciar sesión</Text>

          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
              placeholderTextColor={Colors.placeholderText}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </View>

          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.placeholderText}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textLight} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnLogin, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading || gLoading}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.btnLoginText}>Entrar</Text>
            }
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.btnGoogle, gLoading && { opacity: 0.7 }]}
            onPress={handleGoogleLogin}
            disabled={loading || gLoading}
          >
            {gLoading
              ? <ActivityIndicator color={Colors.text} style={{ marginRight: 10 }} />
              : <Ionicons name="logo-google" size={20} color={Colors.text} style={{ marginRight: 10 }} />
            }
            <Text style={styles.btnGoogleText}>Continuar con Google</Text>
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>¿No tenés cuenta? </Text>
            <Link href="/auth/register" asChild>
              <TouchableOpacity>
                <Text style={styles.registerLink}>Registrate</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.dark },
    kav: { flex: 1 },
    top: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 10 },
    tagline: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 8, letterSpacing: 0.5 },
    card: {
      backgroundColor: C.white,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: 28, paddingBottom: 40,
    },
    title: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '600', color: C.textSecondary, marginBottom: 6 },
    inputWrapper: {
      flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border,
      borderRadius: 10, paddingHorizontal: 12, height: 48,
      backgroundColor: C.background, marginBottom: 14,
    },
    inputIcon: { marginRight: 8 },
    input: { flex: 1, fontSize: 14, color: C.text },
    forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
    forgotText: { fontSize: 13, color: C.primary, fontWeight: '500' },
    btnLogin: {
      backgroundColor: C.primary, paddingVertical: 15,
      borderRadius: 12, alignItems: 'center', marginBottom: 20,
    },
    btnLoginText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
    dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
    dividerText: { marginHorizontal: 12, color: C.textLight, fontSize: 13 },
    btnGoogle: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: C.border, borderRadius: 12,
      paddingVertical: 13, marginBottom: 24, backgroundColor: C.background,
    },
    btnGoogleText: { fontSize: 15, fontWeight: '500', color: C.text },
    registerRow: { flexDirection: 'row', justifyContent: 'center' },
    registerText: { fontSize: 14, color: C.textSecondary },
    registerLink: { fontSize: 14, color: C.primary, fontWeight: '700' },
  });
}
