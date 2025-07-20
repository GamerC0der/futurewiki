const RECENT_SEARCHES_KEY = 'recentSearches';
const MAX_RECENT_SEARCHES = 5;

export function addToRecentSearches(query: string): string[] {
  if (!query.trim()) return [];
  
  try {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    const recentSearches = saved ? JSON.parse(saved) : [];
    const filtered = recentSearches.filter((s: string) => s !== query);
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to save recent searches:', e);
    return [];
  }
}

export function loadRecentSearches(): string[] {
  try {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.warn('Failed to load recent searches:', e);
    return [];
  }
} 