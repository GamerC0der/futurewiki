<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { searchWikipedia, searchWikimediaImages, searchWiktionary, type SearchResult, type ImageSearchResult, type DictionaryResult } from '$lib/wikipedia';
  import { addToRecentSearches, loadRecentSearches } from '$lib/storage';
  import { CheckCircle, Globe, Sun, Newspaper, Wind, Thermometer, ArrowUpRight, Cloud, CloudSun, CloudRain, CloudLightning, CloudFog, CloudSnow, Book, MessageCircle, Send, History, BookOpen, Clock, TrendingUp } from 'lucide-svelte';
  import { User, Bot } from 'lucide-svelte';
  import { Trash } from 'lucide-svelte';
  import Markdown from 'svelte-markdown';

  
  let searchQuery = '';
  let searchResults: SearchResult[] = [];
  let imageResults: ImageSearchResult[] = [];
  let dictionaryResults: DictionaryResult[] = [];
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
  let selectedSource = 'auto';
  let exploreInput = '';
  let exploreResponse = '';
  let exploreResponseHtml = '';
  let isExploring = false;
  let exploreError = '';
  let followUpInput = '';
  let conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [];
  let suggestedFollowUps: string[] = [];
  let isGeneratingFollowUps = false;
  let weatherSummary = '';
  let newsSummary = '';
  let showWeatherModal = false;
  let showNewsModal = false;
  let weatherModalData: { temp: string, condition: string, code: number, wind: string, windDir: string } = { temp: '', condition: '', code: 0, wind: '', windDir: '' };
  let newsModalData: { title: string, description: string, url: string, publishedAt: string } = { title: '', description: '', url: '', publishedAt: '' };
  let newsModalArticles: { title: string, description: string, url: string, publishedAt: string, thumbnail?: string }[] = [];
  let newsLoading = false;
  let newsFeedsLoaded = 0;
  let newsFeedsTotal = 0;
  let selectedNewsArticle: number | null = null;
  let disambiguationError = '';
  let disambiguationOptions: { title: string, description: string, url: string }[] = [];

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

  const NEWS_RSS_URLS = [
    'https://feeds.bbci.co.uk/news/rss.xml',
    'https://rss.cnn.com/rss/edition.rss',
    'https://feeds.npr.org/1001/rss.xml',
    'https://www.aljazeera.com/xml/rss/all.xml',
    'https://www.reutersagency.com/feed/?best-topics=top-news',
    'https://www.nytimes.com/services/xml/rss/nyt/HomePage.xml',
    'https://www.theguardian.com/world/rss',
    'https://www.washingtonpost.com/rss/world',
    'https://www.cbc.ca/cmlink/rss-world',
    'https://www.france24.com/en/rss',
    'https://feeds.feedburner.com/TechCrunch',
    'https://www.wired.com/feed/rss',
    'https://feeds.arstechnica.com/arstechnica/index',
    'https://www.theverge.com/rss/index.xml',
    'https://feeds.nature.com/nature/rss/current',
    'https://www.science.org/rss/news_current.xml',
    'https://feeds.bloomberg.com/markets/news.rss',
    'https://www.ft.com/world?format=rss',
    'https://feeds.economist.com/United-States',
    'https://www.euronews.com/rss?level=theme&name=news',
    'https://www.dw.com/rss/rss-en-all',
    'https://feeds.reuters.com/Reuters/worldNews',
    'https://www.abc.net.au/news/feed/45910/rss.xml',
    'https://www.smh.com.au/rss/feed.xml'
  ];

  async function performSearch(query: string) {
    if (!query.trim()) {
      searchResults = [];
      imageResults = [];
      searchError = '';
      disambiguationError = '';
      disambiguationOptions = [];
      return;
    }

    isLoading = true;
    searchError = '';
    disambiguationError = '';
    disambiguationOptions = [];
    recentSearches = addToRecentSearches(query);
    
    try {
      if (searchMode === 'dictionary') {
        const results = await searchWiktionary(query);
        if (results.length > 0) {
          dictionaryResults = results;
          searchResults = [];
          imageResults = [];
              } else {
        dictionaryResults = [];
        searchResults = [];
        imageResults = [];
        searchError = 'No dictionary results found. Try a different word or check spelling.';
      }
      } else if (searchMode === 'wiki') {
        const results = await searchWikipedia(query);
        if (results.length > 0) {
          if (results[0].description && results[0].description.toLowerCase().includes('disambiguation page')) {
            searchResults = [];
            imageResults = [];
            dictionaryResults = [];
            disambiguationError = 'This is a disambiguation page. Please select a specific topic.';
            const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srlimit=15&origin=*`;
            const searchResponse = await fetch(searchUrl);
            const searchData = await searchResponse.json();
            if (searchData.query?.search?.length) {
              disambiguationOptions = searchData.query.search.map((item: any) => ({
                title: item.title,
                description: item.snippet?.replace(/<[^>]+>/g, '') || '',
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`
              })).filter((opt: any) => !opt.title.toLowerCase().includes('disambiguation'));
            }
            if (!disambiguationOptions.length && results.length > 0) {
              disambiguationOptions = results.slice(0, 5).map((r: any) => ({
                title: r.title,
                description: r.description || '',
                url: r.url
              }));
            }
          } else {
            searchResults = results;
            imageResults = [];
            dictionaryResults = [];
          }
        } else {
          searchResults = [];
          imageResults = [];
          dictionaryResults = [];
          searchError = 'No results found.';
        }
      } else {
        const results = await searchWikimediaImages(query);
        if (results.length > 0) {
          imageResults = results;
          searchResults = [];
          dictionaryResults = [];
        } else {
          imageResults = [];
          searchResults = [];
          dictionaryResults = [];
          searchError = 'No images found.';
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      searchResults = [];
      imageResults = [];
      searchError = 'Search failed.';
      disambiguationError = '';
      disambiguationOptions = [];
    } finally {
      isLoading = false;
    }
  }

  async function searchWikipediaArticles(query: string) {
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(query)}&srlimit=15&origin=*`;
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
      conversationHistory = [];
    }
    
    try {
      if (/\bnews\b/i.test(query)) {
        await fetchNews();
        const newsText = newsModalArticles.length > 0
          ? newsModalArticles.map((a, i) => `${i + 1}. ${a.title} - ${a.description}\n${a.url}`).join('\n\n')
          : newsSummary || 'No news available.';
        conversationHistory = [
          ...conversationHistory,
          { role: 'user', content: query },
          { role: 'assistant', content: `Here are the latest news headlines:\n\n${newsText}` }
        ];
        isExploring = false;
        return;
      }

      let messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
        {
          role: 'system',
          content: 'You are a helpful AI assistant that provides comprehensive, detailed answers to questions. Use the provided articles and web search results to give accurate and up-to-date information. Be thorough but concise. Format your response using markdown with proper headings, lists, bold text, and code blocks where appropriate. Cite sources when referencing specific information.'
        }
      ];

      if (isFollowUp) {
        messages = messages.concat(conversationHistory);
      }

      const wikiResults = await searchWikipediaArticles(query);
      let additionalContext = '';
      if (wikiResults.length > 0) {
        additionalContext += '\n\n**Articles Found:**\n';
        wikiResults.forEach((result: any, index: number) => {
          additionalContext += `${index + 1}. **${result.title}**: ${result.description}\n`;
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Raw AI response:', data);
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from AI service');
      }
      
      const aiResponse = data.choices[0].message.content;
      console.log('Extracted AI response:', aiResponse);
      
      if (!aiResponse || typeof aiResponse !== 'string') {
        throw new Error('No valid content in AI response');
      }
      
      conversationHistory = [...conversationHistory, { role: 'user', content: query }, { role: 'assistant', content: aiResponse }];
      console.log('Updated conversation history:', conversationHistory);
      
      if (!isFollowUp) {
        generateSuggestedFollowUps(query, aiResponse);
      }
      
    } catch (error) {
      console.error('Explore error:', error);
      exploreError = error instanceof Error ? error.message : 'Failed to get response.';
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
    newsLoading = true;
    newsFeedsLoaded = 0;
    const allItems: any[] = [];
    let articlesSet = new Map();
    newsModalArticles = [];
    newsFeedsTotal = NEWS_RSS_URLS.length;
    
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('News loading timeout')), 10000); 
      });
      
      const fetchPromise = Promise.all(NEWS_RSS_URLS.map(async (url, index) => {
        try {
          const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            for (const item of data.items) {
              if (!articlesSet.has(item.title)) {
                articlesSet.set(item.title, item);
                allItems.push(item);
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch news from:', url, error);
        } finally {
          newsFeedsLoaded++;
        }
      }));
      
      await Promise.race([fetchPromise, timeoutPromise]);
      
      const uniqueItems = Array.from(articlesSet.values());
      uniqueItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      newsModalArticles = uniqueItems.slice(0, 20).map((item: any) => ({
        title: item.title,
        description: item.description || 'No description available',
        url: item.link,
        publishedAt: new Date(item.pubDate).toLocaleDateString(),
        thumbnail: item.thumbnail || null
      }));
      
      if (newsModalArticles.length > 0) {
        newsSummary = newsModalArticles[0].title;
        newsModalData = newsModalArticles[0];
      } else {
        newsSummary = 'No news available.';
        newsModalArticles = [];
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
      if (error instanceof Error && error.message === 'News loading timeout') {
        const loadedArticles = Array.from(articlesSet.values());
        loadedArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
        newsModalArticles = loadedArticles.slice(0, 20).map((item: any) => ({
          title: item.title,
          description: item.description || 'No description available',
          url: item.link,
          publishedAt: new Date(item.pubDate).toLocaleDateString(),
          thumbnail: item.thumbnail || null
        }));
        
        if (newsModalArticles.length > 0) {
          newsSummary = `${newsModalArticles.length} articles loaded`;
          newsModalData = newsModalArticles[0];
        } else {
          newsSummary = 'No articles loaded before timeout.';
          newsModalArticles = [];
        }
      } else {
        newsSummary = 'Failed to load news.';
        newsModalArticles = [];
      }
    } finally {
      newsLoading = false;
      newsFeedsLoaded = newsFeedsTotal; 
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

  function selectNewsArticle(index: number) {
    selectedNewsArticle = index;
  }

  function getNewsSource(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  }

  function shareArticle(article: { title: string, url: string }) {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        url: article.url
      });
    } else {
      navigator.clipboard.writeText(`${article.title}\n${article.url}`);
    }
  }

  async function generateSuggestedFollowUps(question: string, aiResponse: string) {
    isGeneratingFollowUps = true;
    try {
      const messages = [
        {
          role: 'system',
          content: 'Generate 3-4 natural follow-up questions based on the user\'s question and the AI response. Make them specific, relevant, and engaging. Return only the questions, one per line, without numbering or formatting.'
        },
        {
          role: 'user',
          content: `Question: ${question}\n\nResponse: ${aiResponse}\n\nGenerate follow-up questions:`
        }
      ];
      
      const apiResponse = await fetch('https://ai.hackclub.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen3-32b',
          messages,
          max_tokens: 300,
          temperature: 0.7
        })
      });
      
      if (apiResponse.ok) {
        const data = await apiResponse.json();
        const followUpsText = data.choices[0].message.content;
        suggestedFollowUps = followUpsText.split('\n').filter((q: string) => q.trim()).slice(0, 4);
      }
    } catch (error) {
      console.error('Failed to generate follow-ups:', error);
    } finally {
      isGeneratingFollowUps = false;
    }
  }

  async function rewritePrompt(prompt: string) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'Rewrite the user\'s question to be more specific, clear, and likely to get a better response. Keep it concise but comprehensive. Return only the rewritten question.'
        },
        {
          role: 'user',
          content: `Rewrite this question: ${prompt}`
        }
      ];
      
      const response = await fetch('https://ai.hackclub.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-4-scout',
          messages,
          max_tokens: 200,
          temperature: 0.7
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      }
    } catch (error) {
      console.error('Failed to rewrite prompt:', error);
    }
    return prompt;
  }

  function convertMarkdownToHtml(markdown: string): string {
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
      .replace(/\[\((\d+)\)\]/g, '<a href="#" class="wiki-ref" data-ref="$1">[$1]</a>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, '<p>$1</p>')
      .replace(/<p><\/p>/g, '')
      .replace(/<p><h/g, '<h')
      .replace(/<\/h><\/p>/g, '</h>')
      .replace(/<p><li>/g, '<ul><li>')
      .replace(/<\/li><\/p>/g, '</li></ul>')
      .replace(/<\/ul><ul>/g, '');
  }

  function getWikiResult(search) {
    const match = searchResults.find(r => r.title === search);
    return match || { title: search, description: '', url: `https://en.wikipedia.org/wiki/${encodeURIComponent(search)}` };
  }

  const emptySvg = `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="80" rx="20" fill="#f1f5f9"/><rect x="18" y="28" width="44" height="24" rx="6" fill="#e0e7ef"/><rect x="24" y="36" width="32" height="8" rx="4" fill="#cbd5e1"/></svg>`;

</script>

<svelte:head>
  <title>FutureWiki</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</svelte:head>

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
                  class="mode-button {searchMode === 'dictionary' ? 'active' : ''}"
                  on:click={() => searchMode = 'dictionary'}
                  title="Dictionary"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
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

        {#if showResults && ((searchResults.length > 0 || imageResults.length > 0 || dictionaryResults.length > 0) || searchError || disambiguationError)}
          <div class="results">
            {#if disambiguationError}
              <div class="error">
                <div class="error-text">{disambiguationError}</div>
                {#if disambiguationOptions.length > 0}
                  <div class="disambig-options">
                    {#each disambiguationOptions as opt}
                      <a class="disambig-option-btn" href={opt.url} target="_blank">{opt.title}{#if opt.description} <span class="disambig-desc">- {opt.description}</span>{/if}</a>
                    {/each}
                  </div>
                {/if}
                <button class="button button-primary" on:click={() => { showResults = false; searchQuery = ''; searchResults = []; imageResults = []; dictionaryResults = []; disambiguationError = ''; disambiguationOptions = []; }}>Back to Search</button>
              </div>
            {:else if searchError}
              <div class="error">
                <div class="error-text">{searchError}</div>
              </div>
            {:else if searchMode === 'dictionary' && dictionaryResults.length > 0}
              <div class="results-list">
                {#each dictionaryResults as result, index}
                  <div class="result-item dictionary-result {selectedResultIndex === index ? 'selected' : ''}">
                    <div class="result-content">
                      <div class="result-title">{result.word}</div>
                      <div class="dictionary-pos">{result.partOfSpeech}</div>
                      {#if result.pronunciation}
                        <div class="dictionary-pronunciation">/{result.pronunciation}/</div>
                      {/if}
                      {#if result.definitions.length > 0}
                        <div class="dictionary-definitions">
                          {#each result.definitions as definition, defIndex}
                            <div class="definition-item">
                              <span class="definition-number">{defIndex + 1}.</span>
                              <span class="definition-text">{definition}</span>
                            </div>
                          {/each}
                        </div>
                      {/if}
                      {#if result.etymology && result.etymology !== 'No etymology available'}
                        <div class="dictionary-etymology">
                          <strong>Etymology:</strong> {result.etymology}
                        </div>
                      {/if}
                      {#if result.examples.length > 0}
                        <div class="dictionary-examples">
                          <strong>Examples:</strong>
                          {#each result.examples as example}
                            <div class="example-item">"{example}"</div>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  </div>
                {/each}
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
            <h3 class="section-title">
              <span class="section-icon"><Clock size={16} /></span>
              Recent Searches
            </h3>
            {#if recentSearches.length > 0}
              <div class="tags">
                {#each recentSearches as search}
                  <button
                    type="button"
                    class="tag tag-recent"
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
            <h3 class="section-title">
              <span class="section-icon"><TrendingUp size={16} /></span>
              Popular Topics
            </h3>
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
        
        <div class="quick-access">
          <div class="quick-access-title">Quick Access</div>
          <div class="quick-access-grid">
            <div class="quick-access-card" on:click={() => showWeatherModal = true}>
              <div class="quick-access-icon">
                <Sun size={24} />
              </div>
              <div class="quick-access-content">
                <div class="quick-access-label">Weather</div>
                <div class="quick-access-value">{weatherSummary}</div>
              </div>
            </div>
            <div class="quick-access-card" on:click={() => showNewsModal = true}>
              <div class="quick-access-icon">
                <Newspaper size={24} />
              </div>
              <div class="quick-access-content">
                <div class="quick-access-label">News</div>
                <div class="quick-access-value">{newsSummary}</div>
              </div>
            </div>
          </div>
        </div>
      {/if}

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

{#if showNewsModal}
  <div class="modal-overlay news-modal-overlay" on:click={() => showNewsModal = false}>
    <div class="news-modal-container" on:click|stopPropagation>
      <div class="news-modal-sidebar">
        <div class="news-sidebar-header">
          <div class="news-sidebar-title">
            <Newspaper size={24} />
            <span>News Reader</span>
          </div>
          <button class="news-modal-close" on:click={() => showNewsModal = false}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {#if newsLoading}
          <div class="news-loading-container">
            <div class="news-loading-spinner"></div>
            <div class="news-loading-text">Loading news... ({newsFeedsLoaded}/{newsFeedsTotal})</div>
            <div class="news-loading-progress">
              <div class="news-progress-bar" style="width: {(newsFeedsLoaded / newsFeedsTotal) * 100}%"></div>
            </div>
          </div>
        {:else}
          <div class="news-articles-list">
            {#each newsModalArticles as article, index}
              <div 
                class="news-article-item {selectedNewsArticle === index ? 'active' : ''}" 
                on:click={() => selectNewsArticle(index)}
              >
                {#if article.thumbnail}
                  <img 
                    src={article.thumbnail} 
                    alt={article.title} 
                    class="news-item-thumbnail" 
                    on:error={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target && target.nextElementSibling) {
                        target.style.display = 'none';
                        (target.nextElementSibling as HTMLElement).style.display = 'block';
                      }
                    }}
                  />
                  <div class="news-item-thumbnail-placeholder" style="display: none;"></div>
                {:else}
                  <div class="news-item-thumbnail-placeholder"></div>
                {/if}
                <div class="news-item-content">
                  <h4 class="news-item-title">{article.title}</h4>
                  <div class="news-item-meta">
                    <span class="news-item-date">{article.publishedAt}</span>
                    <span class="news-item-source">{getNewsSource(article.url)}</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      
      <div class="news-modal-content">
        {#if selectedNewsArticle !== null && newsModalArticles[selectedNewsArticle]}
          {@const article = newsModalArticles[selectedNewsArticle]}
          <div class="news-article-reader">
            <div class="news-article-header">
              <div class="news-article-source-badge">{getNewsSource(article.url)}</div>
              <div class="news-article-date">{article.publishedAt}</div>
            </div>
            
            <h1 class="news-article-title-large">{article.title}</h1>
            
            {#if article.thumbnail}
              <div class="news-article-hero">
                <img 
                  src={article.thumbnail} 
                  alt={article.title} 
                  class="news-article-hero-img" 
                  on:error={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target) {
                      target.style.display = 'none';
                    }
                  }}
                />
              </div>
            {/if}
            
            <div class="news-article-body">
              <div class="news-article-description-large">{article.description}</div>
              
              <div class="news-article-actions">
                <a href={article.url} target="_blank" rel="noopener noreferrer" class="news-read-full-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Read Full Article
                </a>
                <button class="news-share-btn" on:click={() => shareArticle(article)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  Share
                </button>
              </div>
            </div>
          </div>
        {:else}
          <div class="news-empty-state">
            <Newspaper size={48} />
            <h3>Select an article to read</h3>
            <p>Choose from the latest news headlines in the sidebar</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

</div>

<style>

  
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
    margin-bottom: 16px;
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
    border: 2px solid #e5e7eb;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    transition: all 0.2s ease;
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
    width: 48px;
    height: 48px;
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 8px;
    margin: 4px;
  }
  
  .mode-button:hover {
    background-color: #e5e7eb;
    color: #374151;
  }
  
  .mode-button.active {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  }
  
  .mode-button svg {
    flex-shrink: 0;
  }

  .followup-form {
    display: flex;
    gap: 8px;
    margin-top: 24px;
    align-items: flex-end;
  }
  
  .followup-input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 1rem;
    background: #fff;
    outline: none;
    min-width: 0;
  }
  
  .followup-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.10);
  }
  
  .followup-button {
    padding: 0 16px;
    background: #1e293b;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .followup-button:disabled {
    background: #cbd5e1;
    cursor: not-allowed;
  }
  
  .followup-button:hover:not(:disabled) {
    background: #334155;
  }
  
  .search-input {
    flex: 1;
    padding: 16px 20px;
    border: none;
    font-size: 1.125rem;
    font-weight: 500;
    background-color: transparent;
    outline: none;
    color: #111827;
  }
  
  .search-input::placeholder {
    color: #9ca3af;
    font-weight: 400;
  }
  
  .search-input:focus {
    outline: none;
  }
  
  .search-input-container:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15), 0 0 0 2px rgba(59, 130, 246, 0.1);
    transform: translateY(-1px);
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

  .dictionary-result {
    cursor: default;
    padding: 16px;
  }

  .dictionary-pos {
    font-size: 0.75rem;
    color: #3b82f6;
    font-weight: 600;
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .dictionary-pronunciation {
    font-size: 0.875rem;
    color: #6b7280;
    font-style: italic;
    margin-bottom: 8px;
  }

  .dictionary-definitions {
    margin-bottom: 12px;
  }

  .definition-item {
    display: flex;
    gap: 8px;
    margin-bottom: 6px;
    line-height: 1.5;
  }

  .definition-number {
    font-weight: 600;
    color: #3b82f6;
    min-width: 20px;
  }

  .definition-text {
    color: #374151;
  }

  .dictionary-etymology {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 8px;
    padding: 8px;
    background: #f9fafb;
    border-radius: 4px;
  }

  .dictionary-examples {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .example-item {
    margin-top: 4px;
    padding-left: 12px;
    font-style: italic;
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
  
  @media (max-width: 640px) {
    .container {
      padding: 0 16px;
    }
    
    .title {
      font-size: 1.875rem;
    }
    
    .subtitle {
      font-size: 1rem;
    }
    
    .search-input {
      font-size: 1rem;
      padding: 14px 16px;
    }
    
    .quick-access-grid {
      grid-template-columns: 1fr;
    }
    
    .quick-access-card {
      padding: 14px;
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
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .section-icon {
    font-size: 1rem;
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
  
  .tag-recent {
    background-color: #fef3c7;
    border-color: #fde68a;
    color: #92400e;
  }
  
  .tag-recent:hover {
    background-color: #fde68a;
  }
  
  .empty-text {
    color: #6b7280;
    font-size: 0.75rem;
  }
  
  .quick-access {
    margin-top: 32px;
  }
  
  .quick-access-title {
    font-size: 0.875rem;
    font-weight: 700;
    color: #111827;
    letter-spacing: 0.025em;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .quick-access-title::before {
    content: "⚡";
    font-size: 1rem;
  }
  
  .quick-access-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  
  .quick-access-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  
  .quick-access-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    transform: translateY(-1px);
  }
  
  .quick-access-icon {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
  }
  
  .quick-access-content {
    flex: 1;
    min-width: 0;
  }
  
  .quick-access-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 4px;
  }
  
  .quick-access-value {
    font-size: 0.75rem;
    color: #6b7280;
    line-height: 1.4;
    white-space: pre-line;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
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
    justify-content: space-between;
    width: 100%;
    margin-top: 40px;
  }
  .niptu-bottom-left {
    min-width: 220px;
    max-width: 340px;
  }
  .niptu-bottom-right {
    min-width: 220px;
    max-width: 340px;
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

  .news-modal {
    padding: 40px 36px 32px 36px;
    min-width: 400px;
    max-width: 96vw;
    border-radius: 18px;
    box-shadow: 0 8px 40px rgba(59,130,246,0.10);
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .news-modal-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 24px;
  }

  .news-modal-icon {
    margin-bottom: 8px;
    color: #3b82f6;
  }

  .news-modal-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: #1e293b;
    letter-spacing: -0.01em;
  }

  .news-modal-body {
    width: 100%;
    max-width: 500px;
  }

  .news-modal-article {
    background: #f8fafc;
    border-radius: 12px;
    padding: 24px;
    border: 1px solid #e2e8f0;
  }

  .news-article-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 12px 0;
    line-height: 1.4;
  }

  .news-article-meta {
    margin-bottom: 16px;
  }

  .news-publish-date {
    font-size: 0.9rem;
    color: #64748b;
    font-weight: 500;
  }

  .news-article-description {
    font-size: 1rem;
    line-height: 1.6;
    color: #374151;
    margin-bottom: 20px;
  }

  .news-read-more {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background: #3b82f6;
    color: #ffffff;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.95rem;
    transition: all 0.2s;
  }

  .news-read-more:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }

  /* New News Modal Styles */
  .news-modal-overlay {
    background: rgba(0, 0, 0, 0.8);
  }

  .news-modal-container {
    display: flex;
    width: 95vw;
    height: 90vh;
    max-width: 1400px;
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .news-modal-sidebar {
    width: 380px;
    background: #f8fafc;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .news-sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #e2e8f0;
    background: white;
  }

  .news-sidebar-title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1.1rem;
    font-weight: 600;
    color: #1e293b;
  }

  .news-modal-close {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 8px;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .news-modal-close:hover {
    background: #f1f5f9;
    color: #374151;
  }

  .news-loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    text-align: center;
  }

  .news-loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e2e8f0;
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  .news-loading-text {
    font-size: 0.95rem;
    color: #64748b;
    margin-bottom: 16px;
  }

  .news-loading-progress {
    width: 100%;
    height: 4px;
    background: #e2e8f0;
    border-radius: 2px;
    overflow: hidden;
  }

  .news-progress-bar {
    height: 100%;
    background: #3b82f6;
    transition: width 0.3s ease;
  }

  .news-articles-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px 0;
  }

  .news-article-item {
    display: flex;
    gap: 12px;
    padding: 16px 24px;
    cursor: pointer;
    transition: all 0.2s;
    border-left: 3px solid transparent;
  }

  .news-article-item:hover {
    background: #f1f5f9;
  }

  .news-article-item.active {
    background: #e0e7ef;
    border-left-color: #3b82f6;
  }

  .news-item-thumbnail {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .news-item-thumbnail-placeholder {
    width: 60px;
    height: 60px;
    background: #e2e8f0;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .news-item-content {
    flex: 1;
    min-width: 0;
  }

  .news-item-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #1e293b;
    line-height: 1.4;
    margin: 0 0 8px 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .news-item-meta {
    display: flex;
    gap: 12px;
    font-size: 0.75rem;
    color: #64748b;
  }

  .news-item-source {
    font-weight: 500;
    color: #3b82f6;
  }

  .news-modal-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .news-article-reader {
    flex: 1;
    overflow-y: auto;
    padding: 40px;
  }

  .news-article-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }

  .news-article-source-badge {
    background: #3b82f6;
    color: white;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .news-article-date {
    color: #64748b;
    font-size: 0.9rem;
  }

  .news-article-title-large {
    font-size: 2.2rem;
    font-weight: 700;
    color: #1e293b;
    line-height: 1.3;
    margin: 0 0 32px 0;
  }

  .news-article-hero {
    margin-bottom: 32px;
  }

  .news-article-hero-img {
    width: 100%;
    max-height: 400px;
    object-fit: cover;
    border-radius: 12px;
  }

  .news-article-body {
    max-width: 800px;
  }

  .news-article-description-large {
    font-size: 1.2rem;
    line-height: 1.7;
    color: #374151;
    margin-bottom: 32px;
  }

  .news-article-actions {
    display: flex;
    gap: 16px;
    padding-top: 24px;
    border-top: 1px solid #e2e8f0;
  }

  .news-read-full-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: #3b82f6;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    transition: all 0.2s;
  }

  .news-read-full-btn:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }

  .news-share-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: #f8fafc;
    color: #374151;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .news-share-btn:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  .news-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #64748b;
    text-align: center;
  }

  .news-empty-state h3 {
    margin: 16px 0 8px 0;
    color: #374151;
  }

  .news-empty-state p {
    font-size: 0.95rem;
  }

  /* Chat UI styles */
  .chat-container {
    width: 100%;
    max-width: 600px;
    height: 75vh;
    min-height: 500px;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #e5e7eb;
    position: relative;
  }
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: #f8fafc;
  }
  .message {
    display: flex;
    width: 100%;
    align-items: flex-end;
    gap: 12px;
    animation: fadeInUp 0.4s cubic-bezier(.4,1.4,.6,1);
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .message.user {
    flex-direction: row-reverse;
  }
  .bubble-avatar {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: #e0e7ef;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    font-weight: 600;
    flex-shrink: 0;
  }
  .message.user .bubble-avatar {
    background: #1e293b;
    color: #fff;
  }
  .bubble-content {
    background: #fff;
    padding: 14px 18px;
    border-radius: 14px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.07);
    font-size: 1rem;
    line-height: 1.6;
    color: #1e293b;
    border: 1px solid #e2e8f0;
    max-width: 80%;
    word-wrap: break-word;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .message.user .bubble-content {
    background: #1e293b;
    color: #fff;
    border-color: #1e293b;
  }
  .message-meta {
    font-size: 0.8rem;
    color: #64748b;
    margin-top: 2px;
    text-align: right;
  }
  .message.user .message-meta {
    color: #cbd5e1;
  }
  .chat-input-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 18px 20px;
    background: #f8fafc;
    border-top: 1px solid #e5e7eb;
    position: sticky;
    bottom: 0;
    z-index: 10;
  }
  .chat-input {
    flex: 1;
    padding: 14px 16px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    background: #fff;
    outline: none;
    min-width: 0;
  }
  .chat-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.10);
  }
  .chat-send-btn {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    background: #1e293b;
    color: #fff;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
    font-size: 1.2rem;
  }
  .chat-send-btn:hover:not(:disabled) {
    background: #334155;
  }
  .chat-send-btn:disabled {
    background: #cbd5e1;
    cursor: not-allowed;
  }
  .suggested-followups.chat-followups {
    margin: 0 20px 18px 20px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 16px;
  }
  .suggested-header {
    font-size: 0.9rem;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 12px;
    text-transform: uppercase;
  }
  .suggested-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .suggested-btn {
    padding: 8px 12px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 0.9rem;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    line-height: 1.4;
  }
  .suggested-btn:hover:not(:disabled) {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #1e293b;
  }
  .suggested-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .input-with-rewrite {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }
  .rewrite-btn {
    padding: 8px;
    background: #3b82f6;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .rewrite-btn:hover:not(:disabled) {
    background: #2563eb;
    transform: scale(1.05);
  }
  .rewrite-btn:disabled {
    background: #cbd5e1;
    cursor: not-allowed;
    
    transform: none;
  }
  .chat-loading-outer {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
    width: 100%;
    z-index: 2;
  }
  .chat-loading-spinner {
    width: 48px;
    height: 48px;
    border: 6px solid #e0e7ef;
    border-top: 6px solid #3b82f6;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    margin-bottom: 8px;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .chat-loading-message {
    font-size: 1.1rem;
    color: #2563eb;
    font-weight: 600;
    text-align: center;
    letter-spacing: 0.01em;
  }
  .chat-loading-shimmer {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(90deg, #f8fafc 25%, #e0e7ef 50%, #f8fafc 75%);
    background-size: 200% 100%;
    animation: shimmer 1.2s infinite linear;
    opacity: 0.5;
    border-radius: 12px;
    z-index: 1;
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .message.assistant.loading {
    width: 100%;
    justify-content: center;
    align-items: center;
  }
  .message.assistant.loading .bubble-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 220px;
    min-height: 120px;
    background: #f1f5f9;
    border: none;
    box-shadow: none;
  }

  .chat-clear-btn {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    background: #f3f4f6;
    color: #64748b;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
    margin-right: 4px;
    font-size: 1.2rem;
  }
  .chat-clear-btn:hover:not(:disabled) {
    background: #e5e7eb;
    color: #ef4444;
  }
  .chat-clear-btn:disabled {
    background: #e5e7eb;
    color: #cbd5e1;
    cursor: not-allowed;
  }

  .history-page-full-centered {
    width: 100vw;
    min-height: 80vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 48px;
    padding: 48px 0 32px 0;
  }
  .history-cards {
    display: flex;
    flex-wrap: wrap;
    gap: 32px;
    justify-content: center;
    width: 100%;
    max-width: 1100px;
  }
  .history-card {
    background: linear-gradient(135deg, #f8fafc 60%, #e0e7ef 100%);
    border: 1.5px solid #e5e7eb;
    border-radius: 14px;
    box-shadow: 0 2px 16px 0 rgba(59,130,246,0.07);
    padding: 26px 30px 22px 30px;
    min-width: 270px;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: flex-start;
    transition: box-shadow 0.18s, border 0.18s, background 0.18s;
    position: relative;
  }
  .history-card:hover, .history-card:focus-within {
    box-shadow: 0 4px 32px 0 rgba(59,130,246,0.13), 0 2px 16px 0 rgba(59,130,246,0.09);
    border-color: #3b82f6;
    background: linear-gradient(135deg, #e0e7ef 60%, #f8fafc 100%);
  }
  .history-card-wiki {
    border-left: 5px solid #ececec;
  }
  .history-card-chat {
    border-left: 5px solid #ececec;
  }
  .history-card-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 2px;
  }
  .history-card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #2563eb;
    background: #e0e7ef;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    margin-right: 4px;
  }
  .history-card-chat .history-card-icon {
    color: #3b82f6;
    background: #f1f5f9;
  }
  .history-card-title {
    font-size: 1.08rem;
    font-weight: 700;
    color: #2563eb;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .history-card-chat .history-card-title {
    color: #3b82f6;
  }
  .history-card-link {
    font-size: 0.92rem;
    color: #3b82f6;
    text-decoration: underline;
    margin-left: 8px;
    transition: color 0.15s;
  }
  .history-card-link:hover {
    color: #2563eb;
  }
  .history-card-thumb {
    width: 100%;
    max-width: 120px;
    border-radius: 8px;
    margin-bottom: 6px;
  }
  .history-card-action {
    margin-top: 8px;
    background: #222;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 6px 16px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .history-card-action:hover {
    background: #444;
  }

  .history-title-main {
    font-size: 2.2rem;
    font-weight: 800;
    color: #1e293b;
    margin-bottom: 32px;
    letter-spacing: -0.01em;
    text-align: center;
    width: 100%;
  }
  .history-section {
    width: 100%;
    max-width: 1100px;
    margin: 0 auto 48px auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
  }
  .history-section-header {
    font-size: 1.25rem;
    font-weight: 700;
    color: #2563eb;
    margin-bottom: 10px;
    letter-spacing: 0.01em;
    text-align: left;
    width: 100%;
    padding-left: 8px;
  }
  .history-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 36px;
    width: 100%;
    margin: 0 auto;
    justify-items: center;
    align-items: stretch;
  }
  .history-card {
    background: rgba(255,255,255,0.75);
    border: 1.5px solid #e5e7eb;
    border-radius: 18px;
    box-shadow: 0 4px 32px 0 rgba(59,130,246,0.10), 0 2px 16px 0 rgba(59,130,246,0.07);
    backdrop-filter: blur(8px);
    padding: 34px 32px 28px 32px;
    min-width: 0;
    max-width: 420px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 18px;
    align-items: flex-start;
    transition: box-shadow 0.22s, border 0.22s, background 0.22s, transform 0.18s;
    position: relative;
    animation: fadeIn 0.7s cubic-bezier(.4,1.4,.6,1);
  }
  .history-card:hover, .history-card:focus-within {
    box-shadow: 0 8px 48px 0 rgba(59,130,246,0.18), 0 4px 32px 0 rgba(59,130,246,0.13);
    border-color: #3b82f6;
    background: rgba(255,255,255,0.92);
    transform: scale(1.025);
    z-index: 2;
  }
  .history-card-wiki {
    border-left: 5px solid #ececec;
  }
  .history-card-chat {
    border-left: 5px solid #ececec;
  }
  .history-card-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    margin-bottom: 6px;
    font-size: 1.2rem;
    box-shadow: 0 2px 8px rgba(59,130,246,0.08);
  }
  .wiki-avatar {
    background: linear-gradient(135deg, #e0e7ef 60%, #f1f5f9 100%);
    color: #2563eb;
  }
  .chat-avatar {
    background: linear-gradient(135deg, #f1f5f9 60%, #e0e7ef 100%);
    color: #3b82f6;
  }
  .history-card-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 2px;
    font-size: 1.13rem;
    font-weight: 700;
    color: #1e293b;
  }
  .history-card-title {
    font-size: 1.13rem;
    font-weight: 700;
    color: #1e293b;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .history-card-link-btn {
    font-size: 1.01rem;
    color: #fff;
    background: linear-gradient(90deg, #3b82f6 60%, #2563eb 100%);
    border: none;
    border-radius: 6px;
    padding: 7px 18px;
    font-weight: 600;
    margin-right: 10px;
    text-decoration: none;
    transition: background 0.15s, box-shadow 0.15s;
    box-shadow: 0 1px 4px rgba(59,130,246,0.07);
    display: inline-block;
  }
  .history-card-link-btn:hover, .history-card-link-btn:focus {
    background: linear-gradient(90deg, #2563eb 80%, #3b82f6 100%);
    box-shadow: 0 2px 8px rgba(59,130,246,0.13);
    color: #fff;
  }
  .history-card-thumb {
    width: 100%;
    max-width: 120px;
    border-radius: 10px;
    margin-bottom: 6px;
    box-shadow: 0 1px 8px 0 rgba(59,130,246,0.10);
  }
  .history-card-desc {
    font-size: 1.08rem;
    color: #374151;
    margin-top: 2px;
    margin-bottom: 2px;
    word-break: break-word;
    line-height: 1.6;
  }
  .history-card-actions {
    display: flex;
    gap: 10px;
    margin-top: 10px;
    width: 100%;
  }
  .history-card-action {
    background: linear-gradient(90deg, #3b82f6 60%, #2563eb 100%);
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 7px 18px;
    font-size: 1.01rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, box-shadow 0.15s;
    box-shadow: 0 1px 4px rgba(59,130,246,0.07);
    display: inline-block;
  }
  .history-card-action:hover, .history-card-action:focus {
    background: linear-gradient(90deg, #2563eb 80%, #3b82f6 100%);
    box-shadow: 0 2px 8px rgba(59,130,246,0.13);
    color: #fff;
  }
  .history-empty-modern {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin: 48px auto 32px auto;
    color: #64748b;
    font-size: 1.08rem;
    min-height: 180px;
  }
  .history-empty-title {
    font-size: 1.18rem;
    font-weight: 700;
    color: #2563eb;
    margin-top: 8px;
  }
  .history-empty-desc {
    font-size: 1.01rem;
    color: #64748b;
    margin-bottom: 4px;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(24px) scale(0.98); }
    to { opacity: 1; transform: none; }
  }

  .history-card-link-btn, .history-card-action {
    background: #111 !important;
    color: #fff !important;
    border: none !important;
    background-image: none !important;
    box-shadow: none !important;
  }
  .history-card-link-btn:hover, .history-card-action:hover, .history-card-link-btn:focus, .history-card-action:focus {
    background: #222 !important;
    color: #fff !important;
  }

  .history-card:hover, .history-card:focus-within, .history-card-wiki:hover, .history-card-wiki:focus-within, .history-card-chat:hover, .history-card-chat:focus-within {
    box-shadow: none !important;
    border-color: #ececec !important;
    background: rgba(255,255,255,0.75) !important;
    transform: none !important;
    z-index: auto !important;
  }

  .disambig-options {
    margin: 18px 0 18px 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .disambig-option-btn {
    display: block;
    background: #f1f5f9;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 10px 14px;
    color: #2563eb;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.18s, border 0.18s, color 0.18s;
    font-size: 1rem;
  }
  .disambig-option-btn:hover {
    background: #e0e7ef;
    border-color: #3b82f6;
    color: #1e293b;
  }
  .disambig-desc {
    color: #64748b;
    font-weight: 400;
    font-size: 0.97em;
    margin-left: 6px;
  }

</style>


