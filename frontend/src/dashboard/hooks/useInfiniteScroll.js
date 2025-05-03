import { useState, useEffect, useCallback } from 'react';

export const useInfiniteScroll = (callback, initialPage = 1) => {
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    const { data, hasMorePages } = await callback(page);
    setHasMore(hasMorePages);
    setPage(prevPage => prevPage + 1);
    setLoading(false);
    
    return data;
  }, [callback, loading, hasMore, page]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >= 
        document.documentElement.offsetHeight - 200 &&
        !loading && 
        hasMore
      ) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore, loading, hasMore]);

  return { loadMore, loading, hasMore, resetPage: () => setPage(initialPage) };
}; 