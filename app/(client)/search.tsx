import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, SafeAreaView, StatusBar, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useFocusEffect } from 'expo-router';
import { Colors } from '@/theme/colors';
import { searchRestaurants } from '@/services/restaurants';
import { Restaurant } from '@/types';

const TAGS = ['🍣 Sushi', '🍕 Pizza', '🍝 Pasta', '🥩 Parrilla', '🌮 Mexicano', '🍔 Burger', '🥗 Vegano', '🍜 Ramen'];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [results, setResults] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const doSearch = async (tag?: string, name?: string) => {
    setLoading(true);
    try {
      const data = await searchRestaurants(tag, name);
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    if (!activeTag && query.length === 0) doSearch();
  }, []));

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 1) doSearch(activeTag ? activeTag.replace(/^[^\s]+\s/, '') : undefined, query);
      else if (!activeTag) doSearch();
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleTag = (tag: string) => {
    const clean = tag.replace(/^[^\s]+\s/, '');
    if (activeTag === tag) {
      setActiveTag('');
      doSearch(undefined, query.length > 1 ? query : undefined);
    } else {
      setActiveTag(tag);
      doSearch(clean, query.length > 1 ? query : undefined);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.topBar}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar comida o restaurante..."
            placeholderTextColor={Colors.placeholderText}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); doSearch(activeTag ? activeTag.replace(/^[^\s]+\s/, '') : undefined); }}>
              <Ionicons name="close-circle" size={18} color={Colors.placeholderText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>¿Qué querés comer?</Text>
        <View style={styles.tagsGrid}>
          {TAGS.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, activeTag === tag && styles.tagActive]}
              onPress={() => handleTag(tag)}
            >
              <Text style={[styles.tagText, activeTag === tag && styles.tagTextActive]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 30 }} />
        ) : (
          <>
            <Text style={styles.sectionLabel}>
              {results.length > 0
                ? `${results.length} restaurante${results.length !== 1 ? 's' : ''}`
                : 'Sin resultados'}
            </Text>
            {results.map((r) => (
              <Link key={r.id} href={`/restaurant/${r.id}`} asChild>
                <TouchableOpacity style={styles.resultCard}>
                  {r.logoUrl
                    ? <Image source={{ uri: r.logoUrl }} style={styles.logo} resizeMode="cover" />
                    : (
                      <View style={styles.logoPlaceholder}>
                        <Ionicons name="storefront-outline" size={26} color={Colors.border} />
                      </View>
                    )
                  }
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{r.name}</Text>
                    <View style={styles.resultTags}>
                      {r.tags.slice(0, 2).map((t) => (
                        <View key={t} style={styles.miniTag}>
                          <Text style={styles.miniTagText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.resultMeta}>
                      <Ionicons name="star" size={13} color="#FFC107" />
                      <Text style={styles.metaText}>{r.rating}</Text>
                      <Text style={styles.metaDot}>·</Text>
                      <Ionicons name="location-outline" size={13} color={Colors.textLight} />
                      <Text style={styles.metaText}>{r.neighborhood}</Text>
                      <Text style={styles.metaDot}>·</Text>
                      <View style={[styles.openDot, { backgroundColor: r.isOpen ? Colors.success : Colors.primary }]} />
                      <Text style={[styles.metaText, { color: r.isOpen ? Colors.success : Colors.primary }]}>
                        {r.isOpen ? 'Abierto' : 'Cerrado'}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.border} />
                </TouchableOpacity>
              </Link>
            ))}
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  topBar: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: 10,
    paddingHorizontal: 12, height: 44,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },
  scroll: { backgroundColor: Colors.background },
  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: Colors.textSecondary,
    marginHorizontal: 16, marginTop: 18, marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  tag: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: Colors.white, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  tagActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tagText: { fontSize: 14, color: Colors.text },
  tagTextActive: { color: Colors.white, fontWeight: '600' },
  resultCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, marginHorizontal: 16, marginBottom: 10,
    borderRadius: 12, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  logo: { width: 72, height: 72, borderRadius: 10 },
  logoPlaceholder: {
    width: 72, height: 72, borderRadius: 10,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  resultInfo: { flex: 1, marginLeft: 12 },
  resultName: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  resultTags: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  miniTag: { backgroundColor: Colors.tag, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  miniTagText: { fontSize: 11, color: Colors.tagText },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: Colors.textSecondary },
  metaDot: { fontSize: 12, color: Colors.textLight, marginHorizontal: 2 },
  openDot: { width: 6, height: 6, borderRadius: 3 },
});
