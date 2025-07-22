<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { searchWikipedia, searchWikimediaImages, type SearchResult, type ImageSearchResult } from '$lib/wikipedia';
  import { addToRecentSearches, loadRecentSearches } from '$lib/storage';
  import { CheckCircle, Globe, Sun, Newspaper, Wind, Thermometer, ArrowUpRight, Cloud, CloudSun, CloudRain, CloudLightning, CloudFog, CloudSnow, Book, MessageCircle } from 'lucide-svelte';
  import Markdown from 'svelte-markdown';

  
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
  let selectedResultIndex = -1;
  let currentView = 'search';
  let selectedSource = 'auto';
  let exploreInput = '';
  let exploreResponse = '';
  let exploreResponseHtml = '';
  let isExploring = false;
  let exploreError = '';
  let followUpInput = '';
  let conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [];
  let weatherSummary = '';
  let newsSummary = '';
  let showWeatherModal = false;
  let weatherModalData: { temp: string, condition: string, code: number, wind: string, windDir: string } = { temp: '', condition: '', code: 0, wind: '', windDir: '' };

  const weatherCodeMap: Record<number, { desc: string; icon: string }> = {
    0: { desc: 'Clear sky', icon: '☀️' },
    1: { desc: 'Mainly clear', icon: '🌤️' },
    2: { desc: 'Partly cloudy', icon: '⛅' },
    3: { desc: 'Overcast', icon: '☁️' },
    45: { desc: 'Fog', icon: '🌫️' },
    48: { desc: 'Depositing rime fog', icon: '🌫️' },
    51: { desc: 'Light drizzle', icon: '🌦️' },
    53: { desc: 'Drizzle', icon: '🌦️' },
    55: { desc: 'Dense drizzle', icon: '🌧️' },
    56: { desc: 'Freezing drizzle', icon: '🌧️' },
    57: { desc: 'Dense freezing drizzle', icon: '🌧️' },
    61: { desc: 'Slight rain', icon: '🌦️' },
    63: { desc: 'Rain', icon: '🌧️' },
    65: { desc: 'Heavy rain', icon: '🌧️' },
    66: { desc: 'Freezing rain', icon: '🌧️' },
    67: { desc: 'Heavy freezing rain', icon: '🌧️' },
    71: { desc: 'Slight snow', icon: '🌨️' },
    73: { desc: 'Snow', icon: '🌨️' },
    75: { desc: 'Heavy snow', icon: '❄️' },
    77: { desc: 'Snow grains', icon: '❄️' },
    80: { desc: 'Slight rain showers', icon: '🌦️' },
    81: { desc: 'Rain showers', icon: '🌧️' },
    82: { desc: 'Violent rain showers', icon: '⛈️' },
    85: { desc: 'Slight snow showers', icon: '🌨️' },
    86: { desc: 'Heavy snow showers', icon: '❄️' },
    95: { desc: 'Thunderstorm', icon: '⛈️' },
    96: { desc: 'Thunderstorm w/ hail', icon: '⛈️' },
    99: { desc: 'Thunderstorm w/ heavy hail', icon: '⛈️' },
  };

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

  async function searchDuckDuckGo(query: string) {
    try {
      const response = await fetch(`https://corsproxy.io/?https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
      const data = await response.json();
      
      const results = [];
      
      if (data.Abstract && data.AbstractURL && !data.AbstractURL.includes('duckduckgo.com')) {
        results.push({
          title: data.Heading || query,
          snippet: data.Abstract,
          url: data.AbstractURL,
          type: 'abstract'
        });
      }
      
      if (data.RelatedTopics) {
        data.RelatedTopics.slice(0, 3).forEach((topic: any) => {
          if (topic.Text && topic.FirstURL && !topic.FirstURL.includes('duckduckgo.com')) {
            results.push({
              title: topic.Text.split(' - ')[0],
              snippet: topic.Text,
              url: topic.FirstURL,
              type: 'related'
            });
          }
        });
      }
      
      return results;
    } catch (e) {
      console.warn('DuckDuckGo search failed:', e);
      return [];
    }
  }

  async function searchWikipediaArticles(query: string) {
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&origin=*`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();
      
      if (!searchData.query?.search?.length) {
        return [];
      }
      
      const results = searchData.query.search;
      const pageIds = results.map((r: any) => r.pageid).join('|');
      
      const summaryUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts|pageimages&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=200&pageids=${pageIds}&origin=*`;
      const summaryResponse = await fetch(summaryUrl);
      const summaryData = await summaryResponse.json();
      
      return results.map((result: any) => {
        const pageData = summaryData.query?.pages?.[result.pageid];
        const extract = pageData?.extract || '';
        const thumbnail = pageData?.thumbnail?.source || null;
        
        return {
          id: result.pageid,
          title: result.title,
          description: extract || result.snippet || '',
          thumbnail,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`
        };
      });
    } catch (e) {
      console.warn('Wikipedia search failed:', e);
      return [];
    }
  }

  async function performExplore(query: string, isFollowUp = false) {
    if (!query.trim()) return;
    
    isExploring = true;
    exploreError = '';
    
    if (!isFollowUp) {
      exploreResponse = '';
      conversationHistory = [];
    }
    
    try {
      let messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
        {
          role: 'system',
          content: 'You are a helpful AI assistant that provides comprehensive, detailed answers to questions. Use the provided articles and web search results to give accurate and up-to-date information. Be thorough but concise. Format your response using markdown with proper headings, lists, bold text, and code blocks where appropriate. Cite sources when referencing specific information.'
        }
      ];

      if (isFollowUp) {
        messages = messages.concat(conversationHistory);
      }

      const [wikiResults, ddgResults] = await Promise.all([
        searchWikipediaArticles(query),
        searchDuckDuckGo(query)
      ]);
      
      let additionalContext = '';
      
      if (wikiResults.length > 0) {
        additionalContext += '\n\n**Articles Found:**\n';
        wikiResults.forEach((result: any, index: number) => {
          additionalContext += `${index + 1}. **${result.title}**: ${result.description}\n`;
        });
      }
      
      if (ddgResults.length > 0) {
        additionalContext += '\n\n**Additional Web Information:**\n';
        ddgResults.forEach((result: any, index: number) => {
          additionalContext += `${index + 1}. **${result.title}**: ${result.snippet}\n`;
        });
      }
      
      const userMessage = `Question: ${query}${additionalContext}`;
      messages.push({
        role: 'user',
        content: userMessage
      });
      
      const response = await fetch('https://ai.hackclub.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-4-scout',
          messages,
          max_tokens: 2000,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      if (isFollowUp) {
        conversationHistory.push({ role: 'user', content: query });
        conversationHistory.push({ role: 'assistant', content: aiResponse });
        exploreResponse = conversationHistory.map(msg => 
          msg.role === 'user' ? `**You:** ${msg.content}` : `**AI:** ${msg.content}`
        ).join('\n\n');
      } else {
        conversationHistory.push({ role: 'user', content: query });
        conversationHistory.push({ role: 'assistant', content: aiResponse });
        exploreResponse = aiResponse;
      }
      
      exploreResponseHtml = exploreResponse
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(.+)$/gm, '<p>$1</p>')
        .replace(/<p><\/p>/g, '')
        .replace(/<p><h/g, '<h')
        .replace(/<\/h><\/p>/g, '</h>')
        .replace(/<p><li>/g, '<ul><li>')
        .replace(/<\/li><\/p>/g, '</li></ul>');
      
    } catch (error) {
      console.error('Explore error:', error);
      exploreError = 'Failed to get response.';
    } finally {
      isExploring = false;
    }
  }

  function handleFollowUpSubmit() {
    if (followUpInput.trim()) {
      performExplore(followUpInput, true);
      followUpInput = '';
    }
  }

  function handleFollowUpKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && followUpInput.trim()) {
      event.preventDefault();
      handleFollowUpSubmit();
    }
  }

  function handleSearchInput() {
    clearTimeout(searchTimeout);
    selectedResultIndex = -1;
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
    } else if (showResults && (searchResults.length > 0 || imageResults.length > 0)) {
      const totalResults = searchResults.length + imageResults.length;
      
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectedResultIndex = Math.min(selectedResultIndex + 1, totalResults - 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectedResultIndex = Math.max(selectedResultIndex - 1, -1);
      } else if (event.key === 'Enter' && selectedResultIndex >= 0) {
        event.preventDefault();
        if (searchMode === 'wiki' && selectedResultIndex < searchResults.length) {
          selectResult(searchResults[selectedResultIndex]);
        } else if (searchMode === 'image' && selectedResultIndex < imageResults.length) {
          selectImageResult(imageResults[selectedResultIndex]);
        }
      }
    }
  }

  function handleExploreSubmit() {
    if (exploreInput.trim()) {
      performExplore(exploreInput);
    }
  }

  function handleExploreKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && exploreInput.trim()) {
      event.preventDefault();
      handleExploreSubmit();
    }
  }

  async function fetchWeather() {
    weatherSummary = 'Loading...';
    try {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.77&longitude=-122.42&current_weather=true');
      const data = await res.json();
      if (data.current_weather) {
        const tempC = data.current_weather.temperature;
        const tempF = (tempC * 9/5 + 32).toFixed(1);
        const code = data.current_weather.weathercode;
        lastWeatherCode = code;
        const weather = weatherCodeMap[code] || { desc: 'Unknown', icon: '❓' };
        const windSpeed = data.current_weather.windspeed;
        const windDir = data.current_weather.winddirection;
        const windDirStr = degToCompass(windDir);
        weatherSummary = `San Francisco ${weather.desc} — ${tempC}°C / ${tempF}°F\nWind: ${windSpeed} km/h ${windDirStr}`;
      } else {
        weatherSummary = 'No data.';
      }
    } catch {
      weatherSummary = 'Failed to fetch.';
    }
  }

  function degToCompass(num: number) {
    const val = Math.floor((num / 22.5) + 0.5);
    const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return arr[(val % 16)];
  }

  async function fetchNews() {
    newsSummary = 'Loading...';
    try {
      const res = await fetch('https://gnews.io/api/v4/top-headlines?lang=en&token=demo');
      const data = await res.json();
      if (data.articles && data.articles.length > 0) {
        newsSummary = data.articles[0].title;
      } else {
        newsSummary = 'No news.';
      }
    } catch {
      newsSummary = 'Failed to fetch.';
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
    recentSearches = loadRecentSearches();
    searchInput?.focus();
    fetchWeather();
    fetchNews();
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    };
  });

  function updateWeatherModalData() {
    if (!weatherSummary) return;
    const lines = weatherSummary.split('\n');
    const main = lines[0] || '';
    const wind = lines[1] || '';
    const tempMatch = main.match(/([-\d.]+°C \/ [-\d.]+°F)/);
    const temp = tempMatch ? tempMatch[1] : '';
    const condMatch = main.match(/\s([A-Za-z ]+) —/);
    const condition = condMatch ? condMatch[1].trim() : '';
    const windMatch = wind.match(/Wind: ([\d.]+ km\/h) ([A-Z]+)/);
    const windSpeed = windMatch ? windMatch[1] : '';
    const windDir = windMatch ? windMatch[2] : '';
    weatherModalData = {
      temp,
      condition,
      code: lastWeatherCode,
      wind: windSpeed,
      windDir
    };
  }

  let lastWeatherCode = 0;

  function windDirToDeg(dir: string): number {
    const map: Record<string, number> = { N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5, S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5 };
    return map[dir] || 0;
  }

  function handleChatInputSubmit() {
    if (followUpInput.trim()) {
      performExplore(followUpInput, true);
      followUpInput = '';
      setTimeout(() => {
        const el = document.getElementById('chat-messages');
        if (el) el.scrollTop = el.scrollHeight;
      }, 50);
    }
  }
</script>

<svelte:head>
  <title>FutureWiki</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</svelte:head>

<div class="page">
  <div class="sidebar">
    <div class="sidebar-logo">
      <span class="sidebar-logo-fw">FW</span>
      <span class="sidebar-logo-full">FutureWiki</span>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-indicator" style="transform: translateY({currentView === 'search' ? 0 : 80}px);"></div>
      <button class="nav-item {currentView === 'search' ? 'active' : ''}" on:click={() => currentView = 'search'} aria-label="Wiki">
        <span class="nav-icon"><Book size={20} /></span>
        <span class="nav-tooltip">Wiki</span>
      </button>
      <button class="nav-item {currentView === 'explore' ? 'active' : ''}" on:click={() => currentView = 'explore'} aria-label="Chat">
        <span class="nav-icon"><MessageCircle size={20} /></span>
        <span class="nav-tooltip">Chat</span>
      </button>
    </nav>
  </div>
  <main class="main">
    {#if currentView === 'search'}
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
                {#each searchResults as result, index}
                  <button
                    type="button"
                    class="result-item {selectedResultIndex === index ? 'selected' : ''}"
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
                {#each imageResults as result, index}
                  <button
                    type="button"
                    class="result-item image-result {selectedResultIndex === index ? 'selected' : ''}"
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
        <div class="niptu-bottom-row">
          <div class="niptu-card niptu-bottom-left" on:click={() => showWeatherModal = true} style="cursor:pointer;">
            <div class="niptu-card-header">
              <span class="niptu-icon"><Sun size={22} /></span>
              <span class="niptu-title">Weather</span>
            </div>
            <div class="niptu-summary">{weatherSummary}</div>
          </div>
        </div>
      {/if}
    </div>
    {:else if currentView === 'explore'}
      <div class="chat-container">
        <div class="chat-header">AI Chat</div>
        <div class="chat-messages" id="chat-messages">
          {#each conversationHistory as msg}
            <div class="chat-bubble {msg.role}">
              {#if msg.role === 'assistant'}
                <div class="chat-bubble-inner ai-bubble"><Markdown>{msg.content}</Markdown></div>
              {:else}
                <div class="chat-bubble-inner user-bubble">{msg.content}</div>
              {/if}
            </div>
          {/each}
          {#if isExploring}
            <div class="chat-bubble assistant"><div class="chat-bubble-inner chat-bubble-loading"><span class="loading-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span></div></div>
          {/if}
        </div>
        <form class="chat-input-row" on:submit|preventDefault={handleChatInputSubmit}>
          <input
            bind:value={followUpInput}
            on:keydown={handleFollowUpKeydown}
            type="text"
            placeholder="Type your message..."
            class="chat-input"
            autocomplete="off"
            disabled={isExploring}
          />
          <button type="submit" class="chat-send-btn" disabled={isExploring || !followUpInput.trim()}>
            {isExploring ? '...' : 'Send'}
          </button>
        </form>
      </div>
    {/if}
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

{#if showWeatherModal}
  {updateWeatherModalData()}
  <div class="modal-overlay" on:click={() => showWeatherModal = false}>
    <div class="modal-content weather-modal" on:click|stopPropagation>
      <button class="modal-close" on:click={() => showWeatherModal = false}>×</button>
      <div class="weather-modal-header">
        <span class="weather-modal-icon">
          {#if weatherModalData.code === 0}
            <Sun size={40} />
          {:else if weatherModalData.code === 1}
            <CloudSun size={40} />
          {:else if weatherModalData.code === 2}
            <CloudSun size={40} />
          {:else if weatherModalData.code === 3}
            <Cloud size={40} />
          {:else if weatherModalData.code === 45 || weatherModalData.code === 48}
            <CloudFog size={40} />
          {:else if [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(weatherModalData.code)}
            <CloudRain size={40} />
          {:else if [71,73,75,77,85,86].includes(weatherModalData.code)}
            <CloudSnow size={40} />
          {:else if [95,96,99].includes(weatherModalData.code)}
            <CloudLightning size={40} />
          {:else}
            <Sun size={40} />
          {/if}
        </span>
        <div class="weather-modal-title">San Francisco</div>
      </div>
      {#if weatherSummary}
        <div class="weather-modal-body-structured">
          <div class="weather-modal-detail-row weather-modal-detail-main">
            <Thermometer size={22} class="weather-detail-icon" />
            <span class="weather-detail-label">{weatherModalData.condition}</span>
            <span class="weather-detail-temp">{weatherModalData.temp}</span>
          </div>
          <div class="weather-divider-accent"></div>
          <div class="weather-modal-detail-row">
            <Wind size={20} class="weather-detail-icon" />
            <span class="weather-detail-label">{weatherModalData.wind}</span>
            <span class="weather-detail-winddir"><ArrowUpRight size={18} style="transform: rotate({windDirToDeg(weatherModalData.windDir)}deg);" /> {weatherModalData.windDir}</span>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .page {
    min-height: 100vh;
    background-color: #f9fafb;
    display: flex;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .sidebar {
    width: 84px;
    background: linear-gradient(180deg, #f1f5f9 0%, #e0e7ef 100%);
    border-right: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 40px;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 10;
    box-shadow: 2px 0 16px 0 rgba(59,130,246,0.04);
    transition: width 0.22s cubic-bezier(.4,1.4,.6,1), background 0.22s, box-shadow 0.22s;
  }
  .sidebar:hover {
    width: 220px;
    background: linear-gradient(180deg, #e0e7ef 0%, #f1f5f9 100%);
    box-shadow: 4px 0 32px 0 rgba(59,130,246,0.13), 0 2px 16px 0 rgba(59,130,246,0.07);
  }
  .sidebar-logo {
    font-size: 1.18rem;
    font-weight: 800;
    color: #2563eb;
    letter-spacing: -0.01em;
    margin-bottom: 32px;
    text-align: center;
    width: 100%;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    position: relative;
  }
  .sidebar-logo-fw {
    display: inline-block;
    transition: opacity 0.18s;
  }
  .sidebar-logo-full {
    display: inline-block;
    margin-left: 0.5em;
    opacity: 0;
    max-width: 0;
    overflow: hidden;
    white-space: nowrap;
    color: #2563eb;
    font-size: 1.18rem;
    transform: translateX(-12px);
    transition: opacity 0.18s, max-width 0.22s cubic-bezier(.4,1.4,.6,1), transform 0.22s cubic-bezier(.4,1.4,.6,1);
  }
  .sidebar:hover .sidebar-logo-fw {
    opacity: 0;
  }
  .sidebar:hover .sidebar-logo-full {
    opacity: 1;
    max-width: 200px;
    transform: translateX(0);
  }
  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
    align-items: center;
    position: relative;
  }
  
  .nav-item {
    width: 56px;
    height: 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: #64748b;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    border-radius: 50px;
    transition: background 0.18s, color 0.18s, box-shadow 0.18s;
    position: relative;
    box-shadow: 0 1px 4px rgba(59,130,246,0.04);
  }
  
  .nav-item:hover {
    background: #e0e7ef;
    color: #1e293b;
  }
  
  .nav-item.active {
    background: linear-gradient(90deg, #3b82f6 60%, #2563eb 100%);
    color: #fff;
    box-shadow: 0 4px 16px rgba(59,130,246,0.10);
  }
  
  .nav-item:hover:not(.active) {
    background: #e0e7ef;
    color: #1e293b;
  }
  
  .nav-item {
    position: relative;
  }
  
  .nav-item .nav-icon {
    transition: transform 0.18s, box-shadow 0.18s;
  }

  .nav-item.active .nav-icon {
    transform: scale(1.18);
    box-shadow: 0 2px 8px #3b82f633;
  }
  
  .tooltip {
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translateY(-50%);
    margin-left: 8px;
    background: #000;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    opacity: 0;
    transition: 0.2s;
    z-index: 1000;
  }
  
  .nav-item:hover .tooltip {
    opacity: 1;
  }
  
  .main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
    margin-left: 84px;
    transition: margin-left 0.22s cubic-bezier(.4,1.4,.6,1);
  }
  .sidebar:hover ~ .main {
    margin-left: 220px;
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
    font-size: 2.25rem;
    font-weight: 800;
    color: #111827;
    margin-bottom: 8px;
    letter-spacing: -0.025em;
  }
  
  .subtitle {
    color: #4b5563;
    font-size: 1.125rem;
    font-weight: 500;
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
    font-weight: 500;
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
  
  .result-item:hover,
  .result-item.selected {
    background-color: #f9fafb;
  }
  
  .result-item.selected {
    border-left: 3px solid #3b82f6;
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
    font-weight: 600;
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
    font-weight: 700;
    color: #111827;
    letter-spacing: 0.025em;
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
    font-weight: 500;
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
  
  .explore-input-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 32px;
    width: 100%;
    max-width: 800px;
  }
  
  .explore-input {
    width: 100%;
    padding: 32px 40px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 2rem;
    font-weight: 500;
    background-color: white;
    outline: none;
    transition: all 0.2s;
  }
  
  .sources-selector {
    display: flex;
    gap: 4px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 4px;
    margin-top: 16px;
    width: fit-content;
  }
  
  .source-option {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
    font-weight: 500;
    color: #64748b;
  }
  
  .source-option:hover {
    background: #e2e8f0;
    color: #334155;
  }
  
  .source-option.active {
    background: #3b82f6;
    color: white;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  }
  
  .source-icon {
    font-size: 1rem;
  }
  
  .explore-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
  }

  .explore-layout {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
  }

  .explore-question {
    margin-bottom: 32px;
    padding: 24px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .question-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
    line-height: 1.4;
  }

  .explore-content {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .loading-message {
    padding: 48px 24px;
    text-align: center;
  }

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e5e7eb;
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loading-text {
    font-size: 1rem;
    color: #6b7280;
    font-weight: 500;
  }

  .explore-response {
    padding: 32px 24px;
  }

  .explore-response-content {
    font-size: 1rem;
    line-height: 1.6;
    color: #374151;
  }

  .explore-response-content h1,
  .explore-response-content h2,
  .explore-response-content h3 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    font-weight: 600;
    color: #111827;
  }

  .explore-response-content h1 {
    font-size: 1.5rem;
  }

  .explore-response-content h2 {
    font-size: 1.25rem;
  }

  .explore-response-content h3 {
    font-size: 1.125rem;
  }

  .explore-response-content p {
    margin-bottom: 1em;
  }

  .explore-response-content ul {
    margin: 1em 0;
    padding-left: 1.5em;
  }

  .explore-response-content li {
    margin-bottom: 0.5em;
  }

  .explore-response-content code {
    background-color: #f3f4f6;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875em;
  }

  .explore-response-content strong {
    font-weight: 600;
  }

  .explore-response-content em {
    font-style: italic;
  }

  .follow-up-section {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #e5e7eb;
  }

  .follow-up-input-container {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .follow-up-input {
    flex: 1;
    padding: 12px 16px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    background-color: white;
    outline: none;
    transition: all 0.2s;
  }

  .follow-up-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
  }

  .follow-up-button {
    padding: 12px 20px;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .follow-up-button:hover:not(:disabled) {
    background-color: #2563eb;
  }

  .follow-up-button:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
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

  .niptu-row {
    display: flex;
    gap: 16px;
    margin-top: 12px;
  }
  .niptu-card {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 18px 16px 14px 16px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
    box-shadow: 0 1px 4px rgba(59,130,246,0.04);
  }
  .niptu-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .niptu-icon {
    font-size: 1.5rem;
    line-height: 1;
  }
  .niptu-title {
    font-weight: 700;
    font-size: 1.05rem;
    color: #1e293b;
  }
  .niptu-summary {
    font-size: 0.97rem;
    color: #334155;
    margin-top: 2px;
    word-break: break-word;
    white-space: pre-line;
  }
  .niptu-flex-row {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 0;
    width: 100%;
    margin-bottom: 16px;
  }
  .niptu-left {
    margin-right: 24px;
    min-width: 160px;
    align-self: flex-start;
  }
  .niptu-center {
    flex: 1;
    min-width: 0;
  }
  .niptu-right {
    margin-left: 24px;
    min-width: 160px;
    align-self: flex-start;
  }
  .niptu-bottom-row {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    width: 100%;
    margin-top: 40px;
  }
  .niptu-bottom-left {
    min-width: 220px;
    max-width: 340px;
    margin-left: 48px;
  }
  .niptu-bottom-right {
    min-width: 180px;
    max-width: 260px;
    margin-right: 48px;
  }
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal-content {
    background: white;
    border-radius: 10px;
    padding: 32px 28px 24px 28px;
    min-width: 320px;
    max-width: 90vw;
    box-shadow: 0 4px 32px rgba(0,0,0,0.15);
    position: relative;
  }
  .modal-title {
    font-size: 1.3rem;
    font-weight: 700;
    margin-bottom: 16px;
    color: #1e293b;
  }
  .modal-details {
    font-size: 1.05rem;
    color: #334155;
    white-space: pre-line;
  }
  .modal-close {
    position: absolute;
    top: 8px;
    right: 16px;
    background: none;
    border: none;
    color: #64748b;
    font-size: 2rem;
    cursor: pointer;
  }
  .weather-modal {
    padding: 40px 36px 32px 36px;
    min-width: 340px;
    max-width: 96vw;
    border-radius: 18px;
    box-shadow: 0 8px 40px rgba(59,130,246,0.10);
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .weather-modal-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 18px;
  }
  .weather-modal-icon {
    margin-bottom: 8px;
    color: #fbbf24;
  }
  .weather-modal-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: #1e293b;
    letter-spacing: -0.01em;
  }
  .weather-modal-body {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 8px;
  }
  .weather-modal-detail {
    font-size: 1.08rem;
    color: #334155;
    background: #f8fafc;
    border-radius: 8px;
    padding: 10px 14px;
    width: 100%;
    box-sizing: border-box;
    text-align: center;
  }
  .weather-modal-body-structured {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-top: 8px;
  }
  .weather-modal-detail-row {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1.08rem;
    color: #334155;
    background: #f8fafc;
    border-radius: 12px;
    padding: 18px 20px;
    width: 100%;
    box-sizing: border-box;
    text-align: left;
    box-shadow: 0 2px 8px rgba(59,130,246,0.04);
    margin-bottom: 0;
  }
  .weather-modal-detail-main {
    font-size: 1.15rem;
    font-weight: 600;
    background: #e0e7ef;
    color: #1e293b;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
  .weather-main-icon {
    font-size: 1.3em;
    margin-right: 6px;
  }
  .weather-detail-temp {
    font-weight: 700;
    font-size: 1.08rem;
    color: #2563eb;
    margin-left: auto;
  }
  .weather-detail-icon {
    color: #3b82f6;
  }
  .weather-detail-label {
    flex: 1;
  }
  .weather-detail-winddir {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 1.01rem;
    color: #64748b;
    margin-left: 12px;
  }
  .weather-divider {
    width: 100%;
    height: 1px;
    background: #e5e7eb;
    margin: 0;
  }
  .weather-divider-accent {
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, #3b82f6 0%, #fbbf24 100%);
    border: none;
    margin: 0 0 0 0;
    box-shadow: 0 1px 4px rgba(59,130,246,0.07);
  }

  /* Chat UI styles */
  .chat-container {
    width: 100%;
    max-width: 540px;
    height: 70vh;
    min-height: 420px;
    background: #fff;
    border-radius: 18px;
    box-shadow: 0 2px 24px 0 rgba(59,130,246,0.07);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }
  .chat-header {
    padding: 18px 24px 12px 24px;
    font-size: 1.18rem;
    font-weight: 700;
    color: #2563eb;
    border-bottom: 1px solid #e5e7eb;
    background: #f8fafc;
    letter-spacing: -0.01em;
  }
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 24px 18px 12px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: #f8fafc;
  }
  .chat-bubble {
    display: flex;
    width: 100%;
    margin-bottom: 2px;
  }
  .chat-bubble.user { justify-content: flex-end; }
  .chat-bubble.assistant { justify-content: flex-start; }
  .chat-bubble-inner {
    max-width: 75%;
    padding: 12px 16px;
    border-radius: 16px;
    font-size: 1rem;
    line-height: 1.6;
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(59,130,246,0.07);
    word-break: break-word;
    transition: background 0.18s;
  }
  .user-bubble { background: #3b82f6; color: #fff; }
  .ai-bubble { background: #e0e7ef; color: #1e293b; }
  .chat-bubble-loading {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .chat-input-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 18px 18px 18px 18px;
    border-top: 1px solid #e5e7eb;
    background: #fff;
  }
  .chat-input {
    flex: 1;
    padding: 12px 16px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    background-color: white;
    outline: none;
    transition: all 0.2s;
  }
  .chat-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.10);
  }
  .chat-send-btn {
    padding: 12px 20px;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .chat-send-btn:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }
</style>


