<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { ArrowLeft } from 'lucide-svelte';
  
  let articleData: any = null;
  let isLoading = true;
  let error = '';
  let fontSize = 'medium';
  let headings: Array<{id: string, text: string, level: number}> = [];
  let upscaledImages = new Map<string, string>();
  let upscalingInProgress = new Set<string>();
  let aiSummary = '';
  let isGeneratingSummary = false;
  let showAISummary = true;
  let duckDuckGoResults: any[] = [];
  let selectedImage: string | null = null;
  let showImageModal = false;
  let questionInput = '';
  let isAskingQuestion = false;
  let questionAnswer = '';
  let showQuestionAnswer = false;
  let questionHistory: Array<{question: string, answer: string, timestamp: Date}> = [];
  let suggestedQuestions = [
    'What are the main points?',
    'How does this work?',
    'What are the key benefits?',
    'What are the risks involved?',
    'How does this compare to alternatives?'
  ];
  let isGeneratingSuggestions = false;
  let stockData: any = null;
  let isCheckingStock = false;
  let hoveredPoint: any = null;
  let tooltipPosition = { x: 0, y: 0 };
  
  $: pageId = $page.params.id;
  $: pageTitle = $page.params.title ? decodeURIComponent($page.params.title) : '';
  
  function openImageModal(imageUrl: string) {
    selectedImage = imageUrl;
    showImageModal = true;
  }
  
  function closeImageModal() {
    showImageModal = false;
    selectedImage = null;
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (showImageModal) {
        closeImageModal();
      }
    }
  }

  function handleChartMouseMove(event: MouseEvent) {
    if (!stockData?.chartData) return;
    
    const svg = event.currentTarget as SVGElement;
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const chartWidth = 400;
    const chartHeight = 200;
    const pointIndex = Math.round((x / chartWidth) * (stockData.chartData.length - 1));
    
    if (pointIndex >= 0 && pointIndex < stockData.chartData.length) {
      const point = stockData.chartData[pointIndex];
      const pointY = 20 + 160 - ((point.price - stockData.minPrice) / (stockData.maxPrice - stockData.minPrice)) * 160;
      
      if (Math.abs(y - pointY) < 20) {
        hoveredPoint = { ...point, index: pointIndex };
        tooltipPosition = { x: event.clientX, y: event.clientY };
      } else {
        hoveredPoint = null;
      }
    } else {
      hoveredPoint = null;
    }
  }

  function handleChartMouseLeave() {
    hoveredPoint = null;
  }
  
  async function searchDuckDuckGo(query: string) {
    try {
      const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
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
  
  async function generateSuggestedQuestions(title: string, content: string) {
    if (isGeneratingSuggestions) return;
    
    isGeneratingSuggestions = true;
    
    try {
      const contentLength = content.length;
      const wordCount = content.split(' ').length;
      
      console.log('Content length:', contentLength, 'Word count:', wordCount);
      
      let questionCount = 5;
      if (contentLength < 500 || wordCount < 100) {
        questionCount = 2;
      } else if (contentLength < 1000 || wordCount < 200) {
        questionCount = 3;
      } else if (contentLength < 2000 || wordCount < 400) {
        questionCount = 4;
      } else if (contentLength > 5000 || wordCount > 1000) {
        questionCount = 6;
      }
      
      console.log('Question count:', questionCount);
      
      const response = await fetch('https://ai.hackclub.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-4-scout',
          messages: [
            {
              role: 'system',
              content: `Generate ${questionCount} relevant questions that someone might ask about this topic. Each question should be 3-5 words maximum. Make them specific and interesting. Return only the questions, one per line, no numbering or extra text.`
            },
            {
              role: 'user',
              content: `Generate questions about: "${title}"\n\nContent: ${content}`
            }
          ],
          max_tokens: 300,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }
      
      const data = await response.json();
      const generatedQuestions = data.choices[0].message.content
        .split('\n')
        .map((q: string) => q.trim())
        .filter((q: string) => q.length > 0)
        .slice(0, questionCount);
      
      if (generatedQuestions.length > 0) {
        suggestedQuestions = generatedQuestions;
      }
      
    } catch (e) {
      console.error('Failed to generate suggested questions:', e);
    } finally {
      isGeneratingSuggestions = false;
    }
  }

  async function checkStockInfo(title: string, content: string) {
    if (isCheckingStock) return;
    
    isCheckingStock = true;
    
    try {
      const response = await fetch('https://ai.hackclub.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-4-scout',
          messages: [
            {
              role: 'system',
              content: 'Analyze if this company/topic is publicly traded. Common companies like Apple (AAPL), Tesla (TSLA), Microsoft (MSFT), Amazon (AMZN), Google (GOOGL), Meta (META), Netflix (NFLX), Rocket Lab (RKLB), SpaceX (private), etc. If publicly traded, provide ONLY the stock symbol like AAPL or RKLB. If not public, respond with: NOT_PUBLIC. Only return the symbol or NOT_PUBLIC, nothing else.'
            },
            {
              role: 'user',
              content: `Is "${title}" a publicly traded company? Analyze this content:\n\n${content}`
            }
          ],
          max_tokens: 10,
          temperature: 0.1
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to check stock info');
      }
      
      const data = await response.json();
      const result = data.choices[0].message.content.trim();
      
      console.log('AI stock check result:', result);
      
      if (result !== 'NOT_PUBLIC') {
        const symbol = result;
        console.log('Checking stock data for symbol:', symbol);
        const stockResponse = await fetch(`https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`);
        
        console.log('Stock API response status:', stockResponse.status);
        
        if (stockResponse.ok) {
          const yahooData = await stockResponse.json();
          if (yahooData.chart && yahooData.chart.result && yahooData.chart.result[0]) {
            const result = yahooData.chart.result[0];
            const quote = result.indicators.quote[0];
            const meta = result.meta;
            
            console.log('Yahoo data:', yahooData);
            console.log('Meta:', meta);
            console.log('Quote:', quote);
            
            const currentPrice = meta.regularMarketPrice || meta.chartPreviousClose;
            const previousClose = meta.previousClose || meta.chartPreviousClose;
            const change = currentPrice - previousClose;
            const changePercent = previousClose ? (change / previousClose) * 100 : 0;
            
            const lastVolumeIndex = quote.volume ? quote.volume.length - 1 : 0;
            const volume = quote.volume && quote.volume[lastVolumeIndex] ? quote.volume[lastVolumeIndex] : 0;
            
            const chartData = result.timestamp ? result.timestamp.map((time: number, index: number) => {
              const price = quote.close && quote.close[index] || 
                           quote.open && quote.open[index] || 
                           quote.high && quote.high[index] || 
                           quote.low && quote.low[index];
              return {
                time: time * 1000,
                price: price
              };
            }).filter((point: any) => point.price && !isNaN(point.price)) : [];
            
            const prices = chartData.map((d: any) => d.price);
            const minPrice = Math.min(...prices) * 0.995;
            const maxPrice = Math.max(...prices) * 1.005;
            
            stockData = {
              symbol: symbol,
              price: currentPrice,
              change: change,
              changePercent: changePercent,
              volume: volume,
              chartData: chartData,
              minPrice: minPrice,
              maxPrice: maxPrice
            };
            
            console.log('Processed stock data:', stockData);
          }
        }
      }
      
    } catch (e) {
      console.error('Failed to check stock info:', e);
    } finally {
      isCheckingStock = false;
    }
  }

  async function askQuestion(question: string, title: string, content: string) {
    if (isAskingQuestion || !question.trim()) return;
    
    isAskingQuestion = true;
    questionAnswer = '';
    showQuestionAnswer = true;
    
    try {
      const ddgResults = await searchDuckDuckGo(question);
      
      let additionalContext = '';
      if (ddgResults.length > 0) {
        additionalContext = '\n\nAdditional information from web search:\n';
        ddgResults.forEach((result, index) => {
          additionalContext += `${index + 1}. ${result.title}: ${result.snippet}\n`;
        });
      }
      
      const response = await fetch('https://ai.hackclub.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-4-scout',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that answers questions about Wikipedia articles. Use the provided Wikipedia content and additional web information to give accurate, detailed answers. Be thorough but concise. If the information is not available in the provided sources, say so clearly.'
            },
            {
              role: 'user',
              content: `Based on this Wikipedia article about "${title}" and additional web information, please answer this question: "${question}"\n\nWikipedia Content:\n${content}${additionalContext}`
            }
          ],
          max_tokens: 1500,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get answer');
      }
      
      const data = await response.json();
      questionAnswer = data.choices[0].message.content;
      
      questionHistory.unshift({
        question: question,
        answer: questionAnswer,
        timestamp: new Date()
      });
      
      if (questionHistory.length > 5) {
        questionHistory = questionHistory.slice(0, 5);
      }
      
    } catch (e) {
      console.error('Failed to get answer:', e);
      questionAnswer = 'Unable to answer your question at this time.';
    } finally {
      isAskingQuestion = false;
    }
  }

  async function generateAISummary(title: string, content: string) {
    if (isGeneratingSummary) return;
    
    isGeneratingSummary = true;
    aiSummary = '';
    showAISummary = true;
    
    try {
      const ddgResults = await searchDuckDuckGo(title);
      duckDuckGoResults = ddgResults;
      
      let additionalContext = '';
      if (ddgResults.length > 0) {
        additionalContext = '\n\nAdditional information from web search:\n';
        ddgResults.forEach((result, index) => {
          additionalContext += `${index + 1}. ${result.title}: ${result.snippet}\n`;
        });
      }
      
      const response = await fetch('https://ai.hackclub.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-4-scout',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that creates comprehensive, detailed summaries of Wikipedia articles enhanced with additional web information. Include ALL important information, facts, dates, statistics, people, events, and details from both the Wikipedia article and additional web sources. Make it thorough and complete, covering every significant aspect. Do not include any introductory text like "Here is a rewritten version" - just provide the comprehensive summary directly. Aim to include as much detail as possible while maintaining readability. Format the response with clear paragraphs separated by double line breaks. When mentioning sources or additional information, you can reference them naturally in the text.'
            },
            {
              role: 'user',
              content: `Create a comprehensive summary of this Wikipedia article about "${title}" that includes ALL the important information, enhanced with additional web data:\n\nWikipedia Content:\n${content}${additionalContext}`
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }
      
      const data = await response.json();
      const fullSummary = data.choices[0].message.content;
      
      const paragraphs = fullSummary.split('\n\n').filter(p => p.trim());
      
      for (let i = 0; i < paragraphs.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800));
        aiSummary += (i > 0 ? '\n\n' : '') + paragraphs[i];
      }
      
    } catch (e) {
      console.error('Failed to generate AI summary:', e);
      aiSummary = 'Unable to generate AI summary at this time.';
    } finally {
      isGeneratingSummary = false;
    }
  }
  
  async function upscaleImage(imageUrl: string): Promise<string> {
    if (upscaledImages.has(imageUrl)) {
      return upscaledImages.get(imageUrl)!;
    }
    
    if (upscalingInProgress.has(imageUrl)) {
      return imageUrl;
    }
    
    if (typeof window === 'undefined') {
      return imageUrl;
    }
    
    upscalingInProgress.add(imageUrl);
    
    try {
      const img = new window.Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => {
          console.warn('Failed to load image for upscaling:', imageUrl);
          reject(new Error('Image load failed'));
        };
        img.src = imageUrl;
        
        setTimeout(() => {
          if (!img.complete) {
            reject(new Error('Image load timeout'));
          }
        }, 10000);
      });
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      const scale = 2;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const upscaledUrl = canvas.toDataURL('image/jpeg', 0.95);
      upscaledImages.set(imageUrl, upscaledUrl);
      
      return upscaledUrl;
    } catch (e) {
      console.warn('Failed to upscale image:', e);
      upscaledImages.set(imageUrl, imageUrl);
      return imageUrl;
    } finally {
      upscalingInProgress.delete(imageUrl);
    }
  }
  
  async function loadArticle() {
    try {
      if (!pageId || !pageTitle) {
        throw new Error('Invalid page parameters');
      }
      
      const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`);
      
      if (!response.ok) {
        throw new Error('Article not found');
      }
      
      const data = await response.json();
      
      if (data.type === 'disambiguation') {
        throw new Error('This is a disambiguation page. Please select a specific topic.');
      }
      
      articleData = {
        title: data.title,
        extract: data.extract,
        url: data.content_urls?.desktop?.page,
        thumbnail: data.thumbnail?.source,
        description: data.description
      };
      
      const contentResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(pageTitle)}`);
      const htmlContent = await contentResponse.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      headings = [];
      const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
      
      headingElements.forEach((heading, index) => {
        const id = heading.id || `heading-${index}`;
        const text = heading.textContent?.trim() || '';
        const level = parseInt(heading.tagName.charAt(1));
        
        if (text && level >= 1 && level <= 6) {
          headings.push({ id, text, level });
        }
      });
      
    } catch (e) {
      console.error('Failed to load article:', e);
      error = e instanceof Error ? e.message : 'Failed to load article';
    } finally {
      isLoading = false;
    }
  }
  
  onMount(() => {
    loadArticle();
    document.addEventListener('keydown', handleKeydown);
    
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });
  
  $: if (articleData && showAISummary && !aiSummary && !isGeneratingSummary) {
    generateAISummary(articleData.title, articleData.extract);
  }
  
  $: if (articleData && !isGeneratingSuggestions && suggestedQuestions.length === 5 && suggestedQuestions[0] === 'What are the main points?') {
    generateSuggestedQuestions(articleData.title, articleData.extract);
  }
  
  $: if (articleData && !isCheckingStock && !stockData) {
    checkStockInfo(articleData.title, articleData.extract);
  }
  

</script>

<svelte:head>
  <title>{pageTitle} - FutureWiki</title>
</svelte:head>

<div class="page">
  <main class="main">
    <button class="back-btn" on:click={() => goto('/')}> <ArrowLeft size={18} style="vertical-align:middle;margin-right:4px;"/>Back</button>
    {#if error}
      <div class="error-container">
        <div class="error-content">
          <h1 class="error-title">Error</h1>
          <p class="error-message">{error}</p>
          <div class="button-group">
            <button class="button button-primary" on:click={() => goto('/read')}>
              Back to Search
            </button>
          </div>
        </div>
      </div>
    {:else if articleData}
      <div class="article-container">
        <article class="article">
          <div class="article-header">
            <h1 class="article-title">{articleData.title}</h1>
            {#if articleData.description}
              <p class="article-description">{articleData.description}</p>
            {/if}
          </div>
          
          <div class="article-content">
            <div class="content-section">
              <div class="content-header">
                <h2 class="content-title">Summary</h2>
                <div class="content-actions">

                </div>
              </div>
              
              <div class="content-body">
                {#if !showAISummary}
                  <div class="prose">
                    {articleData.extract}
                  </div>
                {:else if aiSummary}
                  <div class="ai-summary">{aiSummary}</div>
                {:else}
                  <div class="loading-message">
                    {#if isGeneratingSummary}
                      <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <span class="loading-text">Writing an article using typing chimps</span>
                      </div>
                    {:else}
                      <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <span class="loading-text">Getting Article...</span>
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
            


            <div class="question-section redesigned">
              <div class="question-header">
                <h3 class="question-title">Ask a Question</h3>
                <p class="question-subtitle">Get specific answers about this topic</p>
              </div>
              <div class="question-card">
                <div class="question-input-row">
                  <input
                    type="text"
                    bind:value={questionInput}
                    placeholder="Type your question..."
                    class="question-input-lg"
                    on:keydown={(e) => {
                      if (e.key === 'Enter' && questionInput.trim()) {
                        askQuestion(questionInput, articleData.title, articleData.extract);
                      }
                    }}
                  />
                  <button
                    class="ask-button-lg"
                    on:click={() => askQuestion(questionInput, articleData.title, articleData.extract)}
                    disabled={isAskingQuestion || !questionInput.trim()}
                  >
                    {isAskingQuestion ? 'Asking...' : 'Ask'}
                  </button>
                </div>
                <hr class="question-divider" />
                {#if !showQuestionAnswer && !isAskingQuestion}
                  <div class="suggestions-section">
                    <div class="suggestions-title">Suggestions:</div>
                    <div class="suggestions-list-lg">
                      {#each suggestedQuestions as suggestion}
                        <button
                          class="suggestion-button-lg"
                          on:click={() => {
                            questionInput = suggestion;
                            askQuestion(suggestion, articleData.title, articleData.extract);
                          }}
                          disabled={isGeneratingSuggestions}
                        >
                          {suggestion}
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}
                {#if showQuestionAnswer}
                  <div class="answer-section-lg">
                    {#if questionAnswer}
                      <div class="answer-content-lg">
                        <h4 class="answer-title-lg">Answer</h4>
                        <div class="answer-text-lg">{questionAnswer}</div>
                      </div>
                    {:else if isAskingQuestion}
                      <div class="loading-message">
                        <div class="loading-content">
                          <div class="loading-spinner"></div>
                          <span class="loading-text">Finding answer...</span>
                        </div>
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
              {#if questionHistory.length > 0}
                <div class="history-section-lg">
                  <h4 class="history-title-lg">Recent Questions</h4>
                  <div class="history-list-lg">
                    {#each questionHistory as item}
                      <div class="history-item-lg">
                        <div class="history-question-lg">{item.question}</div>
                        <div class="history-answer-lg">{item.answer}</div>
                        <div class="history-time-lg">{item.timestamp.toLocaleTimeString()}</div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
            


            {#if stockData}
              <div class="stock-section">
                <h3 class="stock-title">Stock Information</h3>
                <div class="stock-content">
                  <div class="stock-header">
                    <div class="stock-symbol">{stockData.symbol}</div>
                    <div class="stock-price">${stockData.price.toFixed(2)}</div>
                    <div class="stock-change {stockData.change >= 0 ? 'positive' : 'negative'}">
                      {stockData.change >= 0 ? '+' : ''}{stockData.change.toFixed(2)} ({stockData.changePercent.toFixed(2)}%)
                    </div>
                  </div>
                  <div class="stock-volume">
                    Volume: {stockData.volume.toLocaleString()}
                  </div>
                  {#if stockData.chartData && stockData.chartData.length > 0}
                    <div class="stock-chart">
                      <div class="chart-header">
                        <h4 class="chart-title">1 Month Price Chart</h4>
                      </div>
                      <div class="chart-container">
                        <div class="price-labels">
                          {#each Array.from({length: 6}, (_, i) => i) as i}
                            {@const price = stockData.maxPrice - (i / 5) * (stockData.maxPrice - stockData.minPrice)}
                            <div class="price-label">${price.toFixed(2)}</div>
                          {/each}
                        </div>
                        <div class="chart-area">
                          <svg 
                            class="chart-svg" 
                            viewBox="0 0 400 200" 
                            preserveAspectRatio="xMidYMid meet"
                            on:mousemove={handleChartMouseMove}
                            on:mouseleave={handleChartMouseLeave}
                          >
                            {#each Array.from({length: 6}, (_, i) => i) as i}
                              {@const y = 20 + (i / 5) * 160}
                              <line x1="0" y1={y} x2="400" y2={y} stroke="#e2e8f0" stroke-width="1" />
                            {/each}
                            {#each Array.from({length: 8}, (_, i) => i) as i}
                              {@const x = (i / 7) * 400}
                              <line x1={x} y1="20" x2={x} y2="180" stroke="#e2e8f0" stroke-width="1" />
                            {/each}
                            
                            <path 
                              d={stockData.chartData.map((point, index) => {
                                const x = (index / (stockData.chartData.length - 1)) * 400;
                                const y = 20 + 160 - ((point.price - stockData.minPrice) / (stockData.maxPrice - stockData.minPrice)) * 160;
                                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                              }).join(' ')}
                              stroke="#3b82f6" 
                              stroke-width="3" 
                              fill="none" 
                              stroke-linecap="round" 
                              stroke-linejoin="round"
                            />
                            
                            <defs>
                              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style="stop-color:rgba(59, 130, 246, 0.1);stop-opacity:1" />
                                <stop offset="100%" style="stop-color:rgba(59, 130, 246, 0.01);stop-opacity:1" />
                              </linearGradient>
                            </defs>
                            <path 
                              d={`M 0 180 ${stockData.chartData.map((point, index) => {
                                const x = (index / (stockData.chartData.length - 1)) * 400;
                                const y = 20 + 160 - ((point.price - stockData.minPrice) / (stockData.maxPrice - stockData.minPrice)) * 160;
                                return `L ${x} ${y}`;
                              }).join(' ')} L 400 180 Z`}
                              fill="url(#chartGradient)"
                            />
                            
                            {#each stockData.chartData as point, index}
                              {@const x = (index / (stockData.chartData.length - 1)) * 400}
                              {@const y = 20 + 160 - ((point.price - stockData.minPrice) / (stockData.maxPrice - stockData.minPrice)) * 160}
                              {@const isHovered = hoveredPoint && hoveredPoint.index === index}
                              <circle 
                                cx={x} 
                                cy={y} 
                                r={isHovered ? "6" : "3"} 
                                fill={isHovered ? "#1d4ed8" : "#3b82f6"}
                                stroke={isHovered ? "white" : "none"}
                                stroke-width={isHovered ? "2" : "0"}
                                class="chart-point"
                                style="cursor: pointer; transition: all 0.2s ease;"
                              />
                            {/each}
                            
                            {#if stockData.chartData.length > 0}
                              {@const lastIndex = stockData.chartData.length - 1}
                              {@const lastPoint = stockData.chartData[lastIndex]}
                              {@const lastX = (lastIndex / (stockData.chartData.length - 1)) * 400}
                              {@const lastY = 20 + 160 - ((lastPoint.price - stockData.minPrice) / (stockData.maxPrice - stockData.minPrice)) * 160}
                              {@const isLastHovered = hoveredPoint && hoveredPoint.index === lastIndex}
                              <circle 
                                cx={lastX} 
                                cy={lastY} 
                                r={isLastHovered ? "8" : "6"} 
                                fill="white" 
                                stroke={isLastHovered ? "#1d4ed8" : "#3b82f6"} 
                                stroke-width={isLastHovered ? "3" : "2"}
                                style="transition: all 0.2s ease;"
                              />
                            {/if}
                          </svg>
                          
                          {#if hoveredPoint}
                            <div 
                              class="chart-tooltip"
                              style="left: {tooltipPosition.x}px; top: {tooltipPosition.y}px;"
                            >
                              <div class="tooltip-content">
                                <div class="tooltip-date">
                                  {new Date(hoveredPoint.time).toLocaleDateString()}
                                </div>
                                <div class="tooltip-price">
                                  ${hoveredPoint.price.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          {/if}
                        </div>

                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
            
            {#if articleData.url}
              <div class="read-more-section">
                <h3 class="read-more-title">Read More</h3>
                <p class="read-more-text">Explore the complete article with additional details and references.</p>
                <a 
                  href={articleData.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="read-more-link"
                >
                  View full article on Wikipedia
                  <svg class="link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            {/if}
          </div>
        </article>
      </div>
    {/if}
  </main>
</div>

{#if showImageModal && selectedImage}
  <div 
    class="image-modal"
    on:click={closeImageModal}
  >
    <div class="modal-content">
      <img 
        src={selectedImage} 
        alt="Full size image"
        class="modal-image"
        on:click|stopPropagation={() => {}}
      />
      <button
        on:click={closeImageModal}
        class="modal-close"
        aria-label="Close image"
      >
        <svg class="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
{/if}

<style>
  .page {
    min-height: 100vh;
    background-color: #f9fafb;
    display: flex;
    flex-direction: column;
  }
  
  .header {
    background-color: white;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    border-bottom: 1px solid #e5e7eb;
  }
  
  .header-container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 16px;
  }
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 64px;
  }
  
  .logo {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    text-decoration: none;
  }
  
  .logo:hover {
    color: #374151;
  }
  
  .nav {
    display: flex;
    gap: 32px;
  }
  
  .nav-link {
    color: #4b5563;
    text-decoration: none;
  }
  
  .nav-link:hover {
    color: #111827;
  }
  
  .main {
    flex: 1;
    padding: 32px 16px;
  }
  
  .error-container {
    max-width: 448px;
    margin: 0 auto;
    text-align: center;
  }
  
  .error-content {
    margin-bottom: 32px;
  }
  
  .error-title {
    font-size: 1.875rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 16px;
  }
  
  .error-message {
    font-size: 1.125rem;
    color: #4b5563;
    margin-bottom: 32px;
  }
  
  .button-group {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .button {
    width: 100%;
    padding: 12px 24px;
    border-radius: 12px;
    font-weight: 500;
    font-size: 1rem;
    cursor: pointer;
    border: none;
    transition: background-color 0.2s;
  }
  
  .button-primary {
    background-color: #2563eb;
    color: white;
  }
  
  .button-primary:hover {
    background-color: #1d4ed8;
  }
  
  .article-container {
    max-width: 1024px;
    margin: 0 auto;
  }
  
  .article {
    background-color: white;
    border-radius: 16px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
  
  .article-header {
    padding: 48px 48px 32px;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .article-title {
    font-size: 3rem;
    font-weight: 900;
    color: #111827;
    margin-bottom: 16px;
    line-height: 1.2;
  }
  
  .article-description {
    font-size: 1.25rem;
    color: #6b7280;
    line-height: 1.6;
  }
  
  .article-content {
    padding: 48px;
  }
  
  .content-section {
    margin-bottom: 48px;
  }
  
  .content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }
  
  .content-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
  }
  
  .content-actions {
    display: flex;
    gap: 12px;
  }
  
  .ai-attribution {
    font-size: 0.875rem;
    color: #6b7280;
    text-decoration: none;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;
  }
  
  .ai-attribution:hover {
    background-color: #f3f4f6;
    color: #374151;
  }
  
  .ai-attribution-inline {
    color: #6b7280;
    text-decoration: none;
    transition: color 0.2s;
  }
  
  .ai-attribution-inline:hover {
    color: #374151;
  }
  
  .ai-service {
    font-weight: 600;
    color: #3b82f6;
  }
  
  .action-button {
    padding: 8px 16px;
    background-color: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .action-button:hover {
    background-color: #e5e7eb;
    border-color: #9ca3af;
  }
  
  .content-body {
    background-color: #f9fafb;
    border-radius: 12px;
    padding: 32px;
  }
  
  .prose {
    color: #374151;
    line-height: 1.75;
    font-size: 1.125rem;
  }
  
  .ai-summary {
    white-space: pre-wrap;
    line-height: 1.75;
    font-size: 1.125rem;
    color: #374151;
  }
  
  .loading-message {
    text-align: center;
    padding: 32px;
    color: #6b7280;
  }
  
  .loading-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  
  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid #d1d5db;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .loading-text {
    font-weight: 500;
    color: #6b7280;
  }
  
  .generate-button {
    width: 100%;
    padding: 16px 24px;
    background-color: #1f2937;
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-bottom: 48px;
  }
  
  .generate-button:hover:not(:disabled) {
    background-color: #111827;
  }
  
  .generate-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .question-section {
    margin-top: 32px;
    padding: 24px;
    background-color: #f9fafb;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }
  
  .question-header {
    margin-bottom: 20px;
  }
  
  .question-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 4px;
  }
  
  .question-subtitle {
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .question-input-container {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }
  
  .question-input {
    flex: 1;
    padding: 12px 16px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    background-color: white;
    color: #111827;
    transition: border-color 0.2s;
  }
  
  .question-input:focus {
    outline: none;
    border-color: #9ca3af;
  }
  
  .question-input::placeholder {
    color: #9ca3af;
  }
  
  .ask-button {
    padding: 12px 24px;
    background-color: #6b7280;
    color: white;
    border: 1px solid #9ca3af;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .ask-button:hover:not(:disabled) {
    background-color: #9ca3af;
  }
  
  .ask-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .answer-section {
    border-top: 1px solid #e5e7eb;
    padding-top: 20px;
  }
  
  .answer-content {
    background-color: white;
    padding: 16px;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
  }
  
  .answer-title {
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 12px;
  }
  
  .answer-text {
    color: #374151;
    line-height: 1.6;
    white-space: pre-wrap;
  }
  
  .suggestions-section {
    margin-bottom: 20px;
  }
  
  .suggestions-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #6b7280;
    margin-bottom: 12px;
  }
  
  .suggestions-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .suggestion-button {
    padding: 6px 12px;
    background-color: #e5e7eb;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .suggestion-button:hover {
    background-color: #d1d5db;
  }
  
  .suggestion-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .generating-indicator {
    font-size: 0.75rem;
    color: #9ca3af;
    font-weight: normal;
    margin-left: 8px;
  }
  
  .history-section {
    margin-bottom: 20px;
  }
  
  .history-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #6b7280;
    margin-bottom: 12px;
  }
  
  .history-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .history-item {
    background-color: white;
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
  }
  
  .history-question {
    font-weight: 500;
    color: #111827;
    margin-bottom: 8px;
  }
  
  .history-answer {
    color: #374151;
    font-size: 0.875rem;
    line-height: 1.5;
    margin-bottom: 8px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .history-time {
    font-size: 0.75rem;
    color: #9ca3af;
  }
  
  .stock-section {
    margin-top: 32px;
    padding: 24px;
    background-color: #f9fafb;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
  }
  
  .stock-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 16px;
  }
  
  .stock-content {
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }
  
  .stock-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 12px;
  }
  
  .stock-symbol {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
  }
  
  .stock-price {
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }
  
  .stock-change {
    font-size: 1rem;
    font-weight: 500;
    padding: 4px 8px;
    border-radius: 4px;
  }
  
  .stock-change.positive {
    color: #059669;
    background-color: #d1fae5;
  }
  
  .stock-change.negative {
    color: #dc2626;
    background-color: #fee2e2;
  }
  
  .stock-volume {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 16px;
  }
  
  .stock-chart {
    border-top: 1px solid #e5e7eb;
    padding-top: 16px;
  }
  
  .stock-chart {
    border-top: 1px solid #e5e7eb;
    padding-top: 16px;
  }
  
  .chart-header {
    margin-bottom: 16px;
  }
  
  .chart-title {
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }
  
  .chart-container {
    display: flex;
    align-items: stretch;
    background-color: #f8fafc;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .price-labels {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 20px 8px;
    background-color: white;
    border-right: 1px solid #e5e7eb;
    min-width: 60px;
  }
  
  .price-label {
    font-size: 11px;
    color: #64748b;
    text-align: right;
    font-family: monospace;
  }
  
  .chart-area {
    flex: 1;
    position: relative;
    background-color: white;
  }
  
  .chart-svg {
    width: 100%;
    height: 200px;
    display: block;
  }
  
  .chart-point {
    transition: all 0.2s ease;
  }
  
  .chart-point:hover {
    r: 6;
    fill: #1d4ed8;
    stroke: white;
    stroke-width: 2;
  }
  
  .chart-tooltip {
    position: fixed;
    z-index: 1000;
    pointer-events: none;
    transform: translate(-50%, -100%);
    margin-top: -8px;
  }
  
  .tooltip-content {
    background-color: #1f2937;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.875rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    white-space: nowrap;
  }
  
  .tooltip-date {
    font-weight: 500;
    margin-bottom: 2px;
  }
  
  .tooltip-price {
    font-weight: 700;
    color: #3b82f6;
  }
  
  .date-labels {
    display: flex;
    justify-content: space-between;
    padding: 8px 20px;
    background-color: white;
    border-top: 1px solid #e5e7eb;
  }
  
  .date-label {
    font-size: 11px;
    color: #64748b;
    text-align: center;
  }
  
  .sources-section {
    margin-top: 32px;
    padding: 24px;
    background-color: #f9fafb;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
  }
  
  .sources-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 16px;
  }
  
  .sources-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .source-item {
    padding: 16px;
    background-color: white;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }
  
  .source-link {
    display: block;
    text-decoration: none;
    color: inherit;
    padding: 8px;
    margin: -8px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  
  .source-link:hover {
    background-color: #f9fafb;
  }
  
  .source-title {
    font-weight: 500;
    color: #111827;
    margin-bottom: 4px;
  }
  
  .source-snippet {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 8px;
  }
  
  .source-url {
    font-size: 0.75rem;
    color: #6b7280;
    display: flex;
    align-items: center;
  }
  
  .url-icon {
    width: 12px;
    height: 12px;
    margin-right: 4px;
  }
  
  .read-more-section {
    margin-top: 48px;
    padding: 24px;
    background-color: #f9fafb;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
  }
  
  .read-more-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 8px;
  }
  
  .read-more-text {
    color: #374151;
    margin-bottom: 16px;
  }
  
  .read-more-link {
    display: inline-flex;
    align-items: center;
    padding: 8px 16px;
    background-color: #1f2937;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 500;
    transition: background-color 0.2s;
  }
  
  .read-more-link:hover {
    background-color: #111827;
  }
  
  .link-icon {
    width: 16px;
    height: 16px;
    margin-left: 8px;
  }
  
  .image-modal {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.8);
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  
  .modal-content {
    position: relative;
    max-width: 1024px;
    max-height: 90vh;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .modal-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }
  
  .modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
    padding: 8px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .modal-close:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }
  
  .close-icon {
    width: 24px;
    height: 24px;
  }
  
  .back-btn {
    position: absolute;
    top: 16px;
    left: 16px;
    background-color: #f3f4f6;
    color: #374151;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #d1d5db;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    z-index: 10;
  }
  
  .back-btn:hover {
    background-color: #e5e7eb;
  }
  
  @media (max-width: 768px) {
    .article-header {
      padding: 32px 24px 24px;
    }
    
    .article-title {
      font-size: 2rem;
    }
    
    .article-content {
      padding: 24px;
    }
    
    .content-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }
    
    .content-body {
      padding: 24px;
    }
  }
  .question-section.redesigned {
    margin-top: 40px;
    margin-bottom: 40px;
  }
  .question-card {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    padding: 32px 24px;
    max-width: 600px;
    margin: 0 auto;
  }
  .question-header {
    text-align: center;
    margin-bottom: 16px;
  }
  .question-title {
    font-size: 1.25rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .question-input-row {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }
  .question-input-lg {
    flex: 1;
    padding: 16px 18px;
    font-size: 1.1rem;
    border-radius: 8px;
    border: 1px solid #d1d5db;
    background: #f9fafb;
    outline: none;
    transition: border 0.2s;
  }
  .question-input-lg:focus {
    border-color: #3b82f6;
  }
  .ask-button-lg {
    padding: 0 24px;
    background: #3b82f6;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    height: 48px;
  }
  .ask-button-lg:disabled {
    background: #a5b4fc;
    cursor: not-allowed;
  }
  .question-divider {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 16px 0;
  }
  .suggestions-section {
    margin-bottom: 12px;
  }
  .suggestions-title {
    font-size: 1rem;
    font-weight: 500;
    margin-bottom: 8px;
  }
  .suggestions-list-lg {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .suggestion-button-lg {
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 8px 14px;
    font-size: 0.98rem;
    color: #374151;
    cursor: pointer;
    transition: background 0.2s;
  }
  .suggestion-button-lg:hover {
    background: #e0e7ff;
  }
  .answer-section-lg {
    margin-top: 18px;
    background: #f8fafc;
    border-radius: 8px;
    padding: 18px 16px;
  }
  .answer-title-lg {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .answer-text-lg {
    font-size: 1rem;
    color: #374151;
  }
  .history-section-lg {
    margin-top: 32px;
  }
  .history-title-lg {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .history-list-lg {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .history-item-lg {
    background: #f3f4f6;
    border-radius: 6px;
    padding: 10px 14px;
  }
  .history-question-lg {
    font-weight: 500;
    color: #1e293b;
  }
  .history-answer-lg {
    color: #374151;
    margin-top: 4px;
  }
  .history-time-lg {
    font-size: 0.85rem;
    color: #64748b;
    margin-top: 2px;
  }
</style> 