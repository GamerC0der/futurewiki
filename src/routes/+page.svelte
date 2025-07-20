<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { searchWikipedia, searchWikimediaImages, type SearchResult, type ImageSearchResult } from '$lib/wikipedia';
  import { addToRecentSearches, loadRecentSearches } from '$lib/storage';
  
  let searchQuery = '';
  let searchResults: SearchResult[] = [];
  let imageResults: ImageSearchResult[] = [];
  let isLoading = false;
  let showResults = false;
  let searchError = '';
  let searchTimeout: ReturnType<typeof setTimeout>;
  let recentSearches: string[] = [];
  let searchInput: HTMLInputElement;
  let searchMode = 'wiki';
  let selectedImage: ImageSearchResult | null = null;
  let showImageModal = false;

  async function performSearch(query: string) {
    if (!query.trim()) {
      searchResults = [];
      imageResults = [];
      searchError = '';
      return;
    }

    isLoading = true;
    searchError = '';
    recentSearches = addToRecentSearches(query);
    
    try {
      if (searchMode === 'wiki') {
        const results = await searchWikipedia(query);
        if (results.length > 0) {
          searchResults = results;
          imageResults = [];
        } else {
          searchResults = [];
          imageResults = [];
          searchError = 'No results found.';
        }
      } else {
        const results = await searchWikimediaImages(query);
        if (results.length > 0) {
          imageResults = results;
          searchResults = [];
        } else {
          imageResults = [];
          searchResults = [];
          searchError = 'No images found.';
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      searchResults = [];
      imageResults = [];
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
        imageResults = [];
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

  function selectImageResult(result: ImageSearchResult) {
    selectedImage = result;
    showImageModal = true;
    showResults = false;
  }

  function closeImageModal() {
    showImageModal = false;
    selectedImage = null;
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
      if (showImageModal) {
        closeImageModal();
      } else {
        showResults = false;
        searchInput?.blur();
      }
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
            <div class="search-input-container">
              <div class="search-mode-toggle">
                <button
                  type="button"
                  class="mode-button {searchMode === 'wiki' ? 'active' : ''}"
                  on:click={() => searchMode = 'wiki'}
                  title="Search Wikipedia"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </button>
                <button
                  type="button"
                  class="mode-button {searchMode === 'image' ? 'active' : ''}"
                  on:click={() => searchMode = 'image'}
                  title="Search Images"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
                </button>
              </div>
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
                    imageResults = [];
                    showResults = false;
                    searchInput?.focus();
                  }}
                >
                  ×
                </button>
              {/if}
            </div>
          </div>
        </form>

        {#if showResults && ((searchResults.length > 0 || imageResults.length > 0) || searchError)}
          <div class="results">
            {#if searchError}
              <div class="error">
                <div class="error-text">{searchError}</div>
              </div>
            {:else if searchMode === 'wiki' && searchResults.length > 0}
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
            {:else if searchMode === 'image' && imageResults.length > 0}
              <div class="results-list">
                {#each imageResults as result}
                  <button
                    type="button"
                    class="result-item image-result"
                    on:click={() => selectImageResult(result)}
                  >
                    <img src={result.imageUrl} alt="" class="image-thumbnail" on:error={handleImageError} />
                    <div class="result-content">
                      <div class="result-title">{result.title}</div>
                      <div class="image-meta">
                        <span class="license">{result.license}</span>
                      </div>
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

{#if showImageModal && selectedImage}
  <div class="modal-overlay" on:click={closeImageModal}>
    <div class="modal-content">
      <img src={selectedImage.imageUrl} alt={selectedImage.title} class="modal-image" />
      <div class="modal-info">
        <div class="modal-title">{selectedImage.title}</div>
        <div class="modal-license">
          <svg class="cc-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          {selectedImage.license}
        </div>
      </div>
    </div>
    <button class="modal-close" on:click={closeImageModal}>×</button>
  </div>
{/if}

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
  
  .search-input-container {
    position: relative;
    display: flex;
    align-items: center;
    background-color: white;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .search-mode-toggle {
    display: flex;
    background-color: #f8fafc;
    border-right: 1px solid #e5e7eb;
  }
  
  .mode-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .mode-button:hover {
    background-color: #e5e7eb;
    color: #374151;
  }
  
  .mode-button.active {
    background-color: #3b82f6;
    color: white;
  }
  
  .mode-button svg {
    flex-shrink: 0;
  }
  
  .search-input {
    flex: 1;
    padding: 12px 16px;
    border: none;
    font-size: 1rem;
    background-color: transparent;
    outline: none;
  }
  
  .search-input:focus {
    outline: none;
  }
  
  .search-input-container:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
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
    scrollbar-width: thin;
    scrollbar-color: #d1d5db transparent;
  }
  
  .results::-webkit-scrollbar {
    width: 6px;
  }
  
  .results::-webkit-scrollbar-thumb {
    background-color: #d1d5db;
    border-radius: 3px;
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
  
  .image-result {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .image-thumbnail {
    width: 100%;
    height: 120px;
    object-fit: cover;
    border-radius: 6px;
  }
  
  .image-meta {
    display: flex;
    gap: 12px;
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 4px;
  }
  
  .author {
    font-weight: 500;
  }
  
  .license {
    opacity: 0.6;
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

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    position: relative;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    max-width: 90vw;
    max-height: 90vh;
  }

  .modal-image {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
    display: block;
  }

  .modal-info {
    padding: 16px;
    background: white;
  }

  .modal-title {
    font-weight: 600;
    color: #111827;
    margin-bottom: 8px;
  }

  .modal-license {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .cc-icon {
    color: #3b82f6;
  }

  .modal-close {
    position: absolute;
    top: -40px;
    right: 0;
    background: none;
    border: none;
    color: white;
    font-size: 2rem;
    cursor: pointer;
  }
</style>


