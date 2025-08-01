const RECENT_SEARCHES_KEY = 'recentSearches';
const MAX_RECENT_SEARCHES = 5;

export function addToRecentSearches(query: string): string[] {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return [];
  }
  
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    let recentSearches: string[] = [];
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          recentSearches = parsed.filter((item): item is string => typeof item === 'string');
        }
      } catch (parseError) {
        console.warn('Failed to parse recent searches:', parseError);
        recentSearches = [];
      }
    }
    
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
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!saved) {
      return [];
    }
    
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
    
    return [];
  } catch (e) {
    console.warn('Failed to load recent searches:', e);
    return [];
  }
} 