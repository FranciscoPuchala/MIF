import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { useColors } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

export default function RestaurantLayout() {
  const Colors = useColors();
  const { user, loading, role } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/auth/login'); return; }
    if (role === 'client') router.replace('/(client)');
  }, [user, loading, role]);

  if (loading || !user || role !== 'restaurant') {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.dark, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="tables" />
      <Stack.Screen name="reservations" />
      <Stack.Screen name="new-post" />
      <Stack.Screen name="my-profile" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
