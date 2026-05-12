import { useEffect, useState, useCallback } from 'react';
import { Restaurant, Post, Table } from '@/types';
import { getRestaurant, getTables, getPosts } from '@/services/restaurants';

export function useRestaurant(id: string) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getRestaurant(id), getTables(id), getPosts(id)])
      .then(([rest, tbls, psts]) => {
        setRestaurant(rest);
        setTables(tbls);
        setPosts(psts);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { restaurant, tables, posts, loading, error, refetch };
}
