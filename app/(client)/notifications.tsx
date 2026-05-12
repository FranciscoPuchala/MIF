import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/hooks/useAuth';
import { subscribeNotifications, markAsRead, markAllAsRead } from '@/services/notifications';
import { AppNotification } from '@/types';

const TYPE_CONFIG: Record<AppNotification['type'], { icon: string; color: string; bg: string }> = {
  reservation_confirmed: { icon: 'checkmark-circle',  color: Colors.success,  bg: '#E8F5E9' },
  reservation_cancelled: { icon: 'close-circle',       color: Colors.primary,  bg: '#FFEBEE' },
  new_reservation:       { icon: 'calendar',           color: '#5B8DEF',       bg: '#EEF2FF' },
  new_follower:          { icon: 'person-add',         color: '#AB47BC',       bg: '#F3E5F5' },
  new_post:              { icon: 'image',               color: '#FF7043',       bg: '#FBE9E7' },
};

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Ahora';
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeNotifications(user.uid, (data) => {
      setNotifications(data);
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  const handlePress = async (n: AppNotification) => {
    if (!n.read) await markAsRead(n.id);
  };

  const handleMarkAll = async () => {
    if (!user?.uid) return;
    await markAllAsRead(user.uid);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAll}>
            <Text style={styles.markAll}>Marcar todas como leídas</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={52} color={Colors.border} />
          <Text style={styles.emptyTitle}>Sin notificaciones</Text>
          <Text style={styles.emptyText}>Acá vas a ver confirmaciones de reservas y novedades</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {notifications.map((n) => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.reservation_confirmed;
            const date = (() => {
              if (!n.createdAt) return new Date();
              const ts = (n.createdAt as any)?.seconds;
              return ts ? new Date(ts * 1000) : new Date(n.createdAt as any);
            })();
            return (
              <TouchableOpacity
                key={n.id}
                style={[styles.card, !n.read && styles.cardUnread]}
                onPress={() => handlePress(n)}
                activeOpacity={0.85}
              >
                {!n.read && <View style={styles.unreadDot} />}
                <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
                  {n.restaurantLogoUrl
                    ? <Image source={{ uri: n.restaurantLogoUrl }} style={styles.logo} />
                    : <Ionicons name={cfg.icon as any} size={24} color={cfg.color} />
                  }
                </View>
                <View style={styles.content}>
                  <Text style={[styles.title, !n.read && styles.titleUnread]}>{n.title}</Text>
                  <Text style={styles.body} numberOfLines={2}>{n.body}</Text>
                  <Text style={styles.time}>{timeAgo(date)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  markAll: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    position: 'relative',
  },
  cardUnread: { backgroundColor: '#FAFBFF' },
  unreadDot: {
    position: 'absolute', left: 4, top: '50%',
    width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary,
  },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 48, height: 48, borderRadius: 24 },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 3 },
  titleUnread: { fontWeight: '800' },
  body: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 4 },
  time: { fontSize: 11, color: Colors.textLight },
});
