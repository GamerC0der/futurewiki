<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { ArrowLeft, BookOpen, Clock, User, Globe, ChevronLeft, ChevronRight } from 'lucide-svelte';

  let articles: Array<{
    id: string;
    title: string;
    content: string;
    url: string;
    author?: string;
    publishedAt?: string;
    readingTime: number;
    source: string;
    headings?: Array<{id: string, text: string, level: number}>;
  }> = [];
  
  let currentArticleIndex = 0;
  let isLoading = true;
  let error = '';
  let fontSize = 'medium';
  let showTableOfContents = false;
  let headings: Array<{id: string, text: string, level: number}> = [];
  let customUrl = '';
  let isAddingCustomUrl = false;

  const articleUrls = [
    'https://en.wikipedia.org/wiki/Artificial_intelligence',
    'https://en.wikipedia.org/wiki/Climate_change',
    'https://en.wikipedia.org/wiki/Quantum_computing',
    'https://en.wikipedia.org/wiki/Space_exploration',
    'https://en.wikipedia.org/wiki/Renewable_energy',
    'https://en.wikipedia.org/wiki/Biotechnology',
    'https://en.wikipedia.org/wiki/Cybersecurity',
    'https://en.wikipedia.org/wiki/Virtual_reality',
    'https://www.bbc.com/news/articles/c4ge4905eq7o'
  ];

  async function scrapeArticle(url: string) {
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      const html = await response.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const hostname = new URL(url).hostname.replace('www.', '');
      
      if (hostname === 'bbc.com' || hostname === 'bbc.co.uk') {
        return scrapeBBCArticle(doc, url);
      }
      
      return scrapeGenericArticle(doc, url);
    } catch (e) {
      console.error('Failed to scrape article:', e);
      return null;
    }
  }

  function scrapeBBCArticle(doc: Document, url: string) {
    const title = doc.querySelector('h1')?.textContent?.trim() || 
                 doc.querySelector('[data-testid="headline"]')?.textContent?.trim() ||
                 doc.querySelector('title')?.textContent?.trim() || 
                 'Untitled Article';
    
    let content = '';
    const contentSelectors = [
      '[data-testid="article-body"]',
      '.article-body',
      '[data-component="text-block"]',
      'article',
      'main'
    ];
    
    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const unwantedSelectors = [
          '.ad-slot',
          '.advertisement',
          '.related-content',
          '.social-share',
          '.comments',
          'script',
          'style',
          'nav',
          'header',
          'footer',
          '.sidebar',
          '.promo',
          '.recommendations'
        ];
        
        unwantedSelectors.forEach(sel => {
          element.querySelectorAll(sel).forEach(el => el.remove());
        });
        
        const textElements = element.querySelectorAll('p, h2, h3, h4, h5, h6, blockquote');
        const textContent = Array.from(textElements)
          .map(el => el.textContent?.trim())
          .filter(text => text && text.length > 20)
          .join('\n\n');
        
        content = textContent;
        if (content.length > 500) break;
      }
    }
    
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
    
    const wordCount = content.split(' ').length;
    const readingTime = Math.ceil(wordCount / 200);
    
    const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const articleHeadings: Array<{id: string, text: string, level: number}> = [];
    
    headingElements.forEach((heading, index) => {
      const id = heading.id || `heading-${index}`;
      const text = heading.textContent?.trim() || '';
      const level = parseInt(heading.tagName.charAt(1));
      
      if (text && level >= 1 && level <= 6) {
        articleHeadings.push({ id, text, level });
      }
    });
    
    return {
      id: url.split('/').pop() || Math.random().toString(36).substr(2, 9),
      title,
      content,
      url,
      readingTime,
      source: 'bbc.com',
      headings: articleHeadings
    };
  }

  function scrapeGenericArticle(doc: Document, url: string) {
    const title = doc.querySelector('h1')?.textContent?.trim() || 
                 doc.querySelector('title')?.textContent?.trim() || 
                 'Untitled Article';
    
    let content = '';
    const contentSelectors = [
      '#mw-content-text',
      '.mw-parser-output',
      'article',
      '.content',
      'main',
      'body'
    ];
    
    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const unwantedSelectors = [
          '.mw-editsection',
          '.reference',
          '.reflist',
          '.navbox',
          '.infobox',
          'script',
          'style',
          'nav',
          'header',
          'footer',
          '.sidebar'
        ];
        
        unwantedSelectors.forEach(sel => {
          element.querySelectorAll(sel).forEach(el => el.remove());
        });
        
        content = element.textContent?.trim() || '';
        if (content.length > 500) break;
      }
    }
    
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
    
    const wordCount = content.split(' ').length;
    const readingTime = Math.ceil(wordCount / 200);
    
    const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const articleHeadings: Array<{id: string, text: string, level: number}> = [];
    
    headingElements.forEach((heading, index) => {
      const id = heading.id || `heading-${index}`;
      const text = heading.textContent?.trim() || '';
      const level = parseInt(heading.tagName.charAt(1));
      
      if (text && level >= 1 && level <= 6) {
        articleHeadings.push({ id, text, level });
      }
    });
    
    return {
      id: url.split('/').pop() || Math.random().toString(36).substr(2, 9),
      title,
      content,
      url,
      readingTime,
      source: new URL(url).hostname.replace('www.', ''),
      headings: articleHeadings
    };
  }

  async function loadArticles() {
    isLoading = true;
    error = '';
    
    try {
      const scrapedArticles = [];
      
      for (const url of articleUrls) {
        const article = await scrapeArticle(url);
        if (article && article.content.length > 100) {
          scrapedArticles.push(article);
        }
      }
      
      articles = scrapedArticles;
      
      if (articles.length === 0) {
        error = 'No articles could be loaded. Please try again later.';
      }
    } catch (e) {
      console.error('Failed to load articles:', e);
      error = 'Failed to load articles. Please check your connection and try again.';
    } finally {
      isLoading = false;
    }
  }

  function nextArticle() {
    if (currentArticleIndex < articles.length - 1) {
      currentArticleIndex++;
      updateHeadings();
    }
  }

  function previousArticle() {
    if (currentArticleIndex > 0) {
      currentArticleIndex--;
      updateHeadings();
    }
  }

  function updateHeadings() {
    if (articles[currentArticleIndex]) {
      headings = articles[currentArticleIndex].headings || [];
    }
  }

  function scrollToHeading(headingId: string) {
    const element = document.getElementById(headingId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  async function addCustomArticle() {
    if (!customUrl.trim()) return;
    
    isAddingCustomUrl = true;
    
    try {
      const article = await scrapeArticle(customUrl);
      if (article && article.content.length > 100) {
        articles = [article, ...articles];
        currentArticleIndex = 0;
        updateHeadings();
        customUrl = '';
      } else {
        alert('Could not extract content from this URL. Please try a different article.');
      }
    } catch (e) {
      console.error('Failed to add custom article:', e);
      alert('Failed to load article. Please check the URL and try again.');
    } finally {
      isAddingCustomUrl = false;
    }
  }

  onMount(() => {
    loadArticles();
  });

  $: if (articles.length > 0) {
    updateHeadings();
  }
</script>

<svelte:head>
  <title>Reader - FutureWiki</title>
</svelte:head>

<div class="reader-page">
  <div class="reader-header">
    <button class="back-btn" on:click={() => goto('/')}>
      <ArrowLeft size={18} />
      Back
    </button>
    
    <div class="reader-controls">
      <div class="custom-url-input">
        <input
          type="url"
          bind:value={customUrl}
          placeholder="Add BBC or Wikipedia URL..."
          class="url-input"
          on:keydown={(e) => {
            if (e.key === 'Enter' && customUrl.trim()) {
              addCustomArticle();
            }
          }}
        />
        <button 
          class="control-btn add-btn"
          on:click={addCustomArticle}
          disabled={isAddingCustomUrl || !customUrl.trim()}
        >
          {isAddingCustomUrl ? 'Adding...' : 'Add'}
        </button>
      </div>
      
      <button 
        class="control-btn" 
        on:click={() => showTableOfContents = !showTableOfContents}
        class:active={showTableOfContents}
      >
        <BookOpen size={16} />
        Contents
      </button>
      
      <div class="font-size-controls">
        <button 
          class="control-btn" 
          on:click={() => fontSize = fontSize === 'small' ? 'medium' : 'small'}
          class:active={fontSize === 'small'}
        >
          A-
        </button>
        <button 
          class="control-btn" 
          on:click={() => fontSize = 'medium'}
          class:active={fontSize === 'medium'}
        >
          A
        </button>
        <button 
          class="control-btn" 
          on:click={() => fontSize = fontSize === 'large' ? 'medium' : 'large'}
          class:active={fontSize === 'large'}
        >
          A+
        </button>
      </div>
    </div>
  </div>

  {#if isLoading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading articles...</p>
    </div>
  {:else if error}
    <div class="error-container">
      <p class="error-text">{error}</p>
      <button class="retry-btn" on:click={loadArticles}>Try Again</button>
    </div>
  {:else if articles.length > 0}
    <div class="reader-content">
      {#if showTableOfContents}
        <div class="toc-sidebar">
          <h3 class="toc-title">Table of Contents</h3>
          <div class="toc-list">
            {#each headings as heading}
              <button
                class="toc-item"
                style="padding-left: {(heading.level - 1) * 16 + 8}px"
                on:click={() => scrollToHeading(heading.id)}
              >
                {heading.text}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <div class="article-container" class:font-small={fontSize === 'small'} class:font-large={fontSize === 'large'}>
        <article class="article">
          <header class="article-header">
            <div class="article-meta">
              <span class="article-source">
                <Globe size={14} />
                {articles[currentArticleIndex].source}
              </span>
              <span class="article-reading-time">
                <Clock size={14} />
                {articles[currentArticleIndex].readingTime} min read
              </span>
            </div>
            
            <h1 class="article-title">{articles[currentArticleIndex].title}</h1>
            
            <div class="article-navigation">
              <button 
                class="nav-btn" 
                on:click={previousArticle}
                disabled={currentArticleIndex === 0}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              
              <span class="article-counter">
                {currentArticleIndex + 1} of {articles.length}
              </span>
              
              <button 
                class="nav-btn" 
                on:click={nextArticle}
                disabled={currentArticleIndex === articles.length - 1}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </header>

          <div class="article-body">
            <div class="article-content">
              {#each articles[currentArticleIndex].content.split('\n') as paragraph}
                {#if paragraph.trim()}
                  <p class="article-paragraph">{paragraph.trim()}</p>
                {/if}
              {/each}
            </div>
          </div>

          <footer class="article-footer">
            <a 
              href={articles[currentArticleIndex].url} 
              target="_blank" 
              rel="noopener noreferrer"
              class="original-link"
            >
              Read original article
            </a>
          </footer>
        </article>
      </div>

      <div class="articles-sidebar">
        <h3 class="sidebar-title">All Articles</h3>
        <div class="articles-list">
          {#each articles as article, index}
            <button
              class="article-item"
              class:active={index === currentArticleIndex}
              on:click={() => {
                currentArticleIndex = index;
                updateHeadings();
              }}
            >
              <div class="article-item-content">
                <h4 class="article-item-title">{article.title}</h4>
                <div class="article-item-meta">
                  <span class="article-item-source">{article.source}</span>
                  <span class="article-item-time">{article.readingTime} min</span>
                </div>
              </div>
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .reader-page {
    min-height: 100vh;
    background-color: #f9fafb;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .reader-header {
    background-color: white;
    border-bottom: 1px solid #e5e7eb;
    padding: 16px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background-color: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .back-btn:hover {
    background-color: #e5e7eb;
  }

  .reader-controls {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .custom-url-input {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .url-input {
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    background-color: white;
    outline: none;
    min-width: 250px;
    transition: border-color 0.2s;
  }

  .url-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  .url-input::placeholder {
    color: #9ca3af;
  }

  .add-btn {
    white-space: nowrap;
  }

  .control-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background-color: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .control-btn:hover {
    background-color: #e5e7eb;
  }

  .control-btn.active {
    background-color: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .font-size-controls {
    display: flex;
    gap: 2px;
  }

  .font-size-controls .control-btn {
    padding: 8px 10px;
    min-width: 40px;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 16px;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
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
    color: #6b7280;
    font-size: 1rem;
    font-weight: 500;
  }

  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 16px;
    text-align: center;
  }

  .error-text {
    color: #ef4444;
    font-size: 1rem;
    font-weight: 500;
  }

  .retry-btn {
    padding: 12px 24px;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .retry-btn:hover {
    background-color: #2563eb;
  }

  .reader-content {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0;
    max-width: 1400px;
    margin: 0 auto;
    min-height: calc(100vh - 80px);
  }

  .toc-sidebar {
    width: 280px;
    background-color: white;
    border-right: 1px solid #e5e7eb;
    padding: 24px;
    overflow-y: auto;
    max-height: calc(100vh - 80px);
  }

  .toc-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 16px;
  }

  .toc-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .toc-item {
    text-align: left;
    background: none;
    border: none;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.875rem;
    color: #374151;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .toc-item:hover {
    background-color: #f3f4f6;
  }

  .article-container {
    background-color: white;
    padding: 0;
    overflow-y: auto;
    max-height: calc(100vh - 80px);
  }

  .article {
    max-width: 800px;
    margin: 0 auto;
    padding: 48px 32px;
  }

  .article-header {
    margin-bottom: 48px;
  }

  .article-meta {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .article-source,
  .article-reading-time {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .article-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: #111827;
    line-height: 1.2;
    margin-bottom: 24px;
  }

  .article-navigation {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 0;
    border-top: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
  }

  .nav-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background-color: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .nav-btn:hover:not(:disabled) {
    background-color: #e5e7eb;
  }

  .nav-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .article-counter {
    font-size: 0.875rem;
    color: #6b7280;
    font-weight: 500;
  }

  .article-body {
    margin-bottom: 48px;
  }

  .article-content {
    font-size: 1.125rem;
    line-height: 1.75;
    color: #374151;
  }

  .article-paragraph {
    margin-bottom: 1.5rem;
  }

  .article-paragraph:last-child {
    margin-bottom: 0;
  }

  .article-footer {
    padding-top: 24px;
    border-top: 1px solid #e5e7eb;
  }

  .original-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 12px 20px;
    background-color: #3b82f6;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .original-link:hover {
    background-color: #2563eb;
  }

  .articles-sidebar {
    width: 300px;
    background-color: white;
    border-left: 1px solid #e5e7eb;
    padding: 24px;
    overflow-y: auto;
    max-height: calc(100vh - 80px);
  }

  .sidebar-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 16px;
  }

  .articles-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .article-item {
    text-align: left;
    background: none;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .article-item:hover {
    background-color: #f9fafb;
    border-color: #d1d5db;
  }

  .article-item.active {
    background-color: #eff6ff;
    border-color: #3b82f6;
  }

  .article-item-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .article-item-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #111827;
    line-height: 1.4;
    margin: 0;
  }

  .article-item-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .article-item-source {
    font-weight: 500;
  }

  .article-item-time {
    color: #9ca3af;
  }

  .font-small .article-content {
    font-size: 1rem;
  }

  .font-large .article-content {
    font-size: 1.25rem;
  }

  @media (max-width: 1200px) {
    .reader-content {
      grid-template-columns: 1fr;
    }
    
    .toc-sidebar,
    .articles-sidebar {
      display: none;
    }
  }

  @media (max-width: 768px) {
    .reader-header {
      padding: 12px 16px;
      flex-direction: column;
      gap: 12px;
    }

    .reader-controls {
      width: 100%;
      justify-content: center;
      flex-direction: column;
      gap: 12px;
    }

    .custom-url-input {
      width: 100%;
    }

    .url-input {
      min-width: 0;
      flex: 1;
    }

    .article {
      padding: 24px 16px;
    }

    .article-title {
      font-size: 2rem;
    }

    .article-navigation {
      flex-direction: column;
      gap: 12px;
    }

    .nav-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style> 