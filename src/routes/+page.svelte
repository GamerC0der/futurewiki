<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { searchWikipedia, type SearchResult } from '$lib/wikipedia';
  import { addToRecentSearches, loadRecentSearches } from '$lib/storage';
  
  let searchQuery = '';
  let searchResults: SearchResult[] = [];
  let isLoading = false;
  let showResults = false;
  let searchError = '';
  let searchTimeout: ReturnType<typeof setTimeout>;
  let recentSearches: string[] = [];
  let searchInput: HTMLInputElement;

  async function performSearch(query: string) {
    if (!query.trim()) {
      searchResults = [];
      searchError = '';
      return;
    }

    isLoading = true;
    searchError = '';
    recentSearches = addToRecentSearches(query);
    
    try {
      const results = await searchWikipedia(query);
      if (results.length > 0) {
        searchResults = results;
      } else {
        searchResults = [];
        searchError = 'No results found.';
      }
    } catch (error) {
      console.error('Search error:', error);
      searchResults = [];
      searchError = 'Search failed.';
    } finally {
      isLoading = false;
    }
  }

  function handleSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
        showResults = true;
      } else {
        searchResults = [];
        showResults = false;
      }
    }, 400);
  }

  function handleSearch() {
    if (searchQuery.trim()) {
      performSearch(searchQuery);
      showResults = true;
    }
  }

  function selectResult(result: SearchResult) {
    searchQuery = result.title;
    showResults = false;
    goto(`/page/${result.id}/${encodeURIComponent(result.title)}`);
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.search-container')) {
      showResults = false;
    }
  }

  function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      showResults = false;
      searchInput?.blur();
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
    recentSearches = loadRecentSearches();
    searchInput?.focus();
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<svelte:head>
  <title>FutureWiki</title>
</svelte:head>

<div class="page">
  <main class="main">
    <div class="container">
      <div class="header">
        <h1 class="title">FutureWiki</h1>
        <p class="subtitle">Discover unbiased information</p>
      </div>
      
      <div class="search-container">
        <form on:submit|preventDefault={handleSearch}>
          <div class="search-input-wrapper">
            <input
              bind:this={searchInput}
              bind:value={searchQuery}
              on:input={handleSearchInput}
              type="text"
              placeholder="Search for anything..."
              class="search-input"
              autocomplete="off"
            />
            {#if isLoading}
              <div class="loading">
                <div class="loading-dots">
                  <div class="dot"></div>
                  <div class="dot"></div>
                  <div class="dot"></div>
                </div>
              </div>
            {:else if searchQuery.trim()}
              <button
                type="button"
                class="clear-button"
                on:click={() => {
                  searchQuery = '';
                  searchResults = [];
                  showResults = false;
                  searchInput?.focus();
                }}
              >
                ×
              </button>
            {/if}
          </div>
        </form>

        {#if showResults && (searchResults.length > 0 || searchError)}
          <div class="results">
            {#if searchError}
              <div class="error">
                <div class="error-text">{searchError}</div>
              </div>
            {:else if searchResults.length > 0}
              <div class="results-list">
                {#each searchResults as result}
                  <button
                    type="button"
                    class="result-item"
                    on:click={() => selectResult(result)}
                  >
                    {#if result.thumbnail}
                      <img src={result.thumbnail} alt="" class="thumbnail" on:error={handleImageError} />
                    {:else}
                      <div class="thumbnail-placeholder"></div>
                    {/if}
                    <div class="result-content">
                      <div class="result-title">{result.title}</div>
                      {#if result.description}
                        <div class="result-description">{result.description}</div>
                      {/if}
                    </div>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      {#if !showResults && !searchQuery.trim()}
        <div class="sections">
          <div class="section">
            <h3 class="section-title">Recent Searches</h3>
            {#if recentSearches.length > 0}
              <div class="tags">
                {#each recentSearches as search}
                  <button
                    type="button"
                    class="tag"
                    on:click={() => {
                      searchQuery = search;
                      handleSearch();
                    }}
                  >
                    {search}
                  </button>
                {/each}
              </div>
            {:else}
              <p class="empty-text">No recent searches.</p>
            {/if}
          </div>

          <div class="section">
            <h3 class="section-title">Popular Topics</h3>
            <div class="tags">
              {#each ['AI', 'Climate', 'Space', 'Quantum', 'Energy', 'Bio', 'Security', 'VR'] as suggestion}
                <button
                  type="button"
                  class="tag tag-blue"
                  on:click={() => {
                    searchQuery = suggestion;
                    handleSearch();
                  }}
                >
                  {suggestion}
                </button>
              {/each}
            </div>
          </div>
        </div>
      {/if}
    </div>
  </main>
</div>

<style>
  .page {
    min-height: 100vh;
    background-color: #f9fafb;
    display: flex;
    flex-direction: column;
  }
  
  .main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
  }
  
  .container {
    max-width: 512px;
    width: 100%;
  }
  
  .header {
    text-align: center;
    margin-bottom: 24px;
  }
  
  .title {
    font-size: 1.875rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 8px;
  }
  
  .subtitle {
    color: #4b5563;
  }
  
  .search-container {
    position: relative;
    margin-bottom: 16px;
  }
  
  .search-input-wrapper {
    position: relative;
  }
  
  .search-input {
    display: block;
    width: 100%;
    padding: 12px 48px 12px 16px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    background-color: white;
  }
  
  .search-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 12px;
  }
  
  .loading-dots {
    display: flex;
    gap: 4px;
  }
  
  .dot {
    width: 4px;
    height: 4px;
    background-color: #3b82f6;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;
  }
  
  .dot:nth-child(1) { animation-delay: -0.32s; }
  .dot:nth-child(2) { animation-delay: -0.16s; }
  
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }
  
  .clear-button {
    position: absolute;
    inset: 0;
    left: auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 12px;
    color: #9ca3af;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.25rem;
  }
  
  .clear-button:hover {
    color: #ef4444;
  }
  
  .results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    background-color: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 20;
    max-height: 320px;
    overflow-y: auto;
  }
  
  .error {
    padding: 16px;
    text-align: center;
  }
  
  .error-text {
    color: #ef4444;
    font-weight: 500;
  }
  
  .results-list {
    padding: 4px;
  }
  
  .result-item {
    width: 100%;
    padding: 12px;
    text-align: left;
    background: none;
    border: none;
    border-bottom: 1px solid #f3f4f6;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .result-item:last-child {
    border-bottom: none;
  }
  
  .result-item:hover {
    background-color: #f9fafb;
  }
  
  .thumbnail {
    width: 32px;
    height: 32px;
    object-fit: cover;
    border-radius: 4px;
  }
  
  .thumbnail-placeholder {
    width: 32px;
    height: 32px;
    background-color: #e5e7eb;
    border-radius: 4px;
  }
  
  .result-content {
    flex: 1;
    min-width: 0;
  }
  
  .result-title {
    font-weight: 700;
    color: #111827;
    font-size: 0.875rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .result-description {
    font-size: 0.75rem;
    color: #6b7280;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .sections {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  @media (min-width: 768px) {
    .sections {
      grid-template-columns: 1fr 1fr;
    }
  }
  
  .section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .section-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #111827;
  }
  
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .tag {
    padding: 4px 8px;
    background-color: white;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #374151;
    cursor: pointer;
    background: none;
  }
  
  .tag:hover {
    background-color: #f9fafb;
  }
  
  .tag-blue {
    background-color: #eff6ff;
    border-color: #bfdbfe;
    color: #1d4ed8;
  }
  
  .tag-blue:hover {
    background-color: #dbeafe;
  }
  
  .empty-text {
    color: #6b7280;
    font-size: 0.75rem;
  }
</style>


