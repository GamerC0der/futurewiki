<script lang="ts">
  import { onMount } from 'svelte';
  import { User, Bot, Send, Trash, Sparkles, Zap, MessageSquare, RotateCcw, Copy, Check, Loader2, Lightbulb, BookOpen, Search, X, Image } from 'lucide-svelte';
  import { searchWikipedia } from '$lib/wikipedia';
  let isExploring = false;
  let exploreError = '';
  let followUpInput = '';
  let conversationHistory: Array<{role: 'user' | 'assistant', content: string, timestamp: Date, id: string, imageUrl?: string}> = [];
  let suggestedFollowUps: string[] = [];


  let chatContainer: HTMLElement;
  let copiedMessageId: string | null = null;
  let showWelcome = true;
  let selectedSuggestion = -1;
  let aiWelcomeMessage = '';
  let isGeneratingWelcome = false;
  let generationTimes: Record<string, number> = {};

  const fallbackWelcomeMessages = [
    "What would you like to learn about today?",
    "Ask me anything, I'm here to help!",
    "I can help you explore any topic. What interests you?",
    "Ready to dive into some knowledge? What's your question?"
  ];

  const allQuickPrompts = [
    "Explain quantum computing in simple terms",
    "What are the latest developments in AI?",
    "How does climate change affect our planet?",
    "Tell me about space exploration history",
    "What are the benefits of renewable energy?",
    "How do vaccines work?",
    "What is machine learning?",
    "Explain blockchain technology",
    "How do solar panels work?",
    "What causes earthquakes?",
    "How does the human brain work?",
    "What is CRISPR gene editing?",
    "Explain the theory of relativity",
    "How do electric cars work?",
    "What is the internet of things?",
    "How do satellites stay in orbit?",
    "What causes climate change?",
    "How do nuclear power plants work?",
    "What is virtual reality?",
    "How do wind turbines generate electricity?",
    "What is artificial intelligence?",
    "How do airplanes fly?",
    "What is the greenhouse effect?",
    "How do computers work?",
    "Generate an image of a futuristic city",
    "Create an image of a beautiful sunset over mountains",
    "Show me an image of a robot in a garden",
    "Generate an image of space exploration"
  ];

  let quickPrompts: string[] = [];

  function getRandomPrompts(count: number = 6): string[] {
    const shuffled = [...allQuickPrompts].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  function generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  async function performExplore(query: string, isFollowUp = false) {
    if (!query.trim()) return;
    
    isExploring = true;
    exploreError = '';
    showWelcome = false;
    
    if (!isFollowUp) {
      conversationHistory = [];
    }
    
    const userMessage = {
      role: 'user' as const,
      content: query,
      timestamp: new Date(),
      id: generateId()
    };
    
    conversationHistory = [...conversationHistory, userMessage];
    
    const startTime = Date.now();
    
    try {
      const isImageRequest = query.toLowerCase().includes('generate') && query.toLowerCase().includes('image') ||
                            query.toLowerCase().includes('create') && query.toLowerCase().includes('image') ||
                            query.toLowerCase().includes('show me') && query.toLowerCase().includes('image');
      
      if (isImageRequest) {
        await generateImage(query);
        return;
      }
      
      let messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
        {
          role: 'system',
          content: '/no_think You are a helpful AI assistant that provides comprehensive, detailed answers to questions. Use the provided articles and web search results to give accurate and up-to-date information. Be thorough but concise. Format your response using markdown with proper headings, lists, bold text, and code blocks where appropriate. Cite sources when referencing specific information. Be conversational and engaging.'
        }
      ];

      if (isFollowUp) {
        messages = messages.concat(conversationHistory.slice(0, -1).map(msg => ({
          role: msg.role,
          content: msg.content
        })));
      }

      const wikiResults = await searchWikipedia(query);
      let additionalContext = '';
      if (wikiResults.length > 0) {
        additionalContext += '\n\n**Relevant Articles Found:**\n';
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
      
      let aiResponse: string;
      
      try {
        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('Invalid response format from AI service');
        }
        
        aiResponse = data.choices[0].message.content;
      } catch (jsonError) {
        const textResponse = await response.text();
        aiResponse = textResponse;
      }
      
      if (!aiResponse || typeof aiResponse !== 'string') {
        throw new Error('No valid content in AI response');
      }
      
      const assistantMessage = {
        role: 'assistant' as const,
        content: aiResponse,
        timestamp: new Date(),
        id: generateId()
      };
      
      const generationTime = (Date.now() - startTime) / 1000;
      generationTimes[assistantMessage.id] = generationTime;
      
      conversationHistory = [...conversationHistory, assistantMessage];
      
      if (!isFollowUp) {
        generateSuggestedFollowUps(query, aiResponse);
      }
      
      scrollToBottom();
      
    } catch (error) {
      console.error('Explore error:', error);
      exploreError = error instanceof Error ? error.message : 'Failed to get response.';
      
      const errorMessage = {
        role: 'assistant' as const,
        content: `Sorry, I encountered an error: ${exploreError}. Please try again.`,
        timestamp: new Date(),
        id: generateId()
      };
      
      conversationHistory = [...conversationHistory, errorMessage];
    } finally {
      isExploring = false;
      followUpInput = '';
    }
  }

  function handleFollowUpSubmit() {
    if (followUpInput.trim()) {
      performExplore(followUpInput, true);
    }
  }

  function handleFollowUpKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleFollowUpSubmit();
    }
  }

  function handleChatInputSubmit() {
    if (followUpInput.trim()) {
      performExplore(followUpInput, true);
    }
  }

  async function generateSuggestedFollowUps(question: string, aiResponse: string) {
    isGeneratingFollowUps = true;
    try {
      const messages = [
        {
          role: 'system',
          content: '/no_think Generate 3-4 natural follow-up questions based on the user\'s question and the AI response. Make them specific, relevant, and engaging. Return only the questions, one per line, without numbering or formatting.'
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
          model: 'llama-4-scout',
          messages,
          max_tokens: 256,
          temperature: 0.7
        })
      });
      
      if (apiResponse.ok) {
        let followUpsText: string;
        
        try {
          const data = await apiResponse.json();
          followUpsText = data.choices[0].message.content;
        } catch (jsonError) {
          followUpsText = await apiResponse.text();
        }
        
        suggestedFollowUps = followUpsText.split('\n').filter((q: string) => q.trim()).slice(0, 4);
      }
    } catch (error) {
      console.error('Failed to generate follow-ups:', error);
    } finally {
      isGeneratingFollowUps = false;
    }
  }

  async function generateAIWelcomeMessage() {
    isGeneratingWelcome = true;
    try {
      const welcomeMessages = [
        "Hi there! 🌟 Ready to explore, learn, and uncover answers? I'm your AI buddy—what question ignites your curiosity today? 🔍✨",
        "Hello! 🚀 Let's dive into knowledge together! What fascinating topic would you like to explore today? I'm here to help! 💡",
        "Welcome! ✨ Ready to discover amazing things? Ask me anything—I'm your AI companion for learning adventures! 🌟",
        "Hey there! 🔍 Curious about something? I'm your AI buddy ready to explore the world of knowledge with you! Let's start! ✨"
      ];
      
      aiWelcomeMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    } catch (error) {
      console.error('Failed to generate welcome message:', error);
    } finally {
      isGeneratingWelcome = false;
    }
  }

  function convertMarkdownToHtml(markdown: string): string {
    let html = markdown;
    
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'text';
      return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
    });
    
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');
    
    html = html.replace(/\n\n/g, '</p><p>');
    
    html = html.replace(/^([^<].*)$/gm, '<p>$1</p>');
    
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p><(h[1-6])>/g, '<$1>');
    html = html.replace(/<\/(h[1-6])><\/p>/g, '</$1>');
    html = html.replace(/<p><(ul|ol)>/g, '<$1>');
    html = html.replace(/<\/(ul|ol)><\/p>/g, '</$1>');
    html = html.replace(/<p><pre>/g, '<pre>');
    html = html.replace(/<\/pre><\/p>/g, '</pre>');
    
    html = html.replace(/<\/ul>\s*<ul>/g, '');
    html = html.replace(/<\/ol>\s*<ol>/g, '');
    
    html = html.replace(/\[\((\d+)\)\]/g, '<a href="#" class="wiki-ref" data-ref="$1">[$1]</a>');
    
    return html;
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  async function generateImage(prompt: string) {
    isGeneratingImage = true;
    try {
      const imageDescription = prompt
        .replace(/generate\s+an?\s+image\s+of\s+/i, '')
        .replace(/create\s+an?\s+image\s+of\s+/i, '')
        .replace(/show\s+me\s+an?\s+image\s+of\s+/i, '')
        .replace(/generate\s+image\s+/i, '')
        .replace(/create\s+image\s+/i, '')
        .replace(/show\s+me\s+image\s+/i, '')
        .trim();
      
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imageDescription)}`;
      
      const assistantMessage = {
        role: 'assistant' as const,
        content: `Here's your generated image of: **${imageDescription}**`,
        timestamp: new Date(),
        id: generateId(),
        imageUrl: pollinationsUrl
      };
      
      conversationHistory = [...conversationHistory, assistantMessage];
      scrollToBottom();
      
    } catch (error) {
      console.error('Image generation error:', error);
      const errorMessage = {
        role: 'assistant' as const,
        content: `Sorry, I couldn't generate the image. Please try again with a different description.`,
        timestamp: new Date(),
        id: generateId()
      };
      
      conversationHistory = [...conversationHistory, errorMessage];
    } finally {
      isGeneratingImage = false;
    }
  }

  function clearChat() {
    conversationHistory = [];
    suggestedFollowUps = [];
    showWelcome = true;
    exploreError = '';
  }

  function copyMessage(messageId: string, content: string) {
    navigator.clipboard.writeText(content);
    copiedMessageId = messageId;
    setTimeout(() => {
      copiedMessageId = null;
    }, 2000);
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function handleQuickPrompt(prompt: string) {
    followUpInput = prompt;
    performExplore(prompt);
  }

  onMount(() => {
    quickPrompts = getRandomPrompts(6);
    generateAIWelcomeMessage();
    scrollToBottom();
  });
</script>

<div class="chat-wrapper">
  <div class="chat-header">
    <div class="chat-header-content">
      <div class="chat-title">
        <Sparkles size={20} />
        <span>AI Assistant</span>
      </div>
      <div class="chat-actions">
        <button class="header-btn" on:click={clearChat} title="Clear chat">
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  </div>

  <div class="chat-messages" bind:this={chatContainer}>
    {#if showWelcome && conversationHistory.length === 0}
      <div class="welcome-screen">
        <div class="welcome-icon">
          <Bot size={48} />
        </div>
        <h2 class="welcome-title">Welcome to FutureWiki AI</h2>
        <p class="welcome-subtitle">
          {#if aiWelcomeMessage}
            {aiWelcomeMessage}
          {:else if isGeneratingWelcome}
            <span class="generating-welcome">Generating personalized welcome...</span>
          {:else}
            {fallbackWelcomeMessages[Math.floor(Math.random() * fallbackWelcomeMessages.length)]}
          {/if}
        </p>
        
        <div class="quick-prompts">
          <h3 class="quick-prompts-title">
            <Lightbulb size={16} />
            Quick Start
          </h3>
          <div class="quick-prompts-grid">
            {#each quickPrompts as prompt}
              <button 
                class="quick-prompt-btn"
                on:click={() => handleQuickPrompt(prompt)}
              >
                {prompt}
              </button>
            {/each}
          </div>
        </div>
      </div>
    {:else}
      {#each conversationHistory as msg, index}
        <div class="message {msg.role}">
          <div class="message-avatar">
            {#if msg.role === 'user'}
              <User size={20} />
            {:else}
              <Bot size={20} />
            {/if}
          </div>
          <div class="message-content">
            <div class="message-header">
              <span class="message-role">{msg.role === 'user' ? 'You' : 'AI Assistant'}</span>
              <span class="message-time">{formatTime(msg.timestamp)}</span>
              {#if msg.role === 'assistant'}
                <button 
                  class="copy-btn"
                  on:click={() => copyMessage(msg.id, msg.content)}
                  title="Copy message"
                >
                  {#if copiedMessageId === msg.id}
                    <Check size={14} />
                  {:else}
                    <Copy size={14} />
                  {/if}
                </button>
              {/if}
            </div>
            <div class="message-text">
              {@html convertMarkdownToHtml(msg.content)}
              {#if msg.imageUrl}
                <div class="generated-image">
                  <img src={msg.imageUrl} alt="Generated image" loading="lazy" />
                </div>
              {/if}
            </div>
            {#if msg.role === 'assistant' && generationTimes[msg.id]}
              <div class="generation-time">
                This generation took {generationTimes[msg.id].toFixed(1)} seconds
              </div>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
    
    {#if isExploring}
      <div class="message assistant">
        <div class="message-avatar">
          <Bot size={20} />
        </div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-role">AI Assistant</span>
            <span class="message-time">{formatTime(new Date())}</span>
          </div>
          <div class="typing-indicator">
            <div class="typing-dots">
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
            </div>
            <span class="typing-text">Thinking...</span>
          </div>
        </div>
      </div>
    {/if}
  </div>

  {#if suggestedFollowUps.length > 0 && !isExploring && !showWelcome}
    <div class="suggested-followups">
      <div class="suggested-header">
        <Zap size={16} />
        <span>Suggested follow-ups</span>
      </div>
      <div class="suggested-buttons">
        {#each suggestedFollowUps as followUp, index}
          <button
            type="button"
            class="suggested-btn {selectedSuggestion === index ? 'selected' : ''}"
            on:click={() => {
              followUpInput = followUp;
              handleFollowUpSubmit();
            }}
            on:mouseenter={() => selectedSuggestion = index}
            on:mouseleave={() => selectedSuggestion = -1}
            disabled={isExploring}
          >
            {followUp}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="chat-input-container">
    <form class="chat-input-form" on:submit|preventDefault={handleChatInputSubmit}>
      <div class="input-wrapper">
        <textarea
          bind:value={followUpInput}
          on:keydown={handleFollowUpKeydown}
          placeholder="Ask me anything..."
          class="chat-input"
          rows="1"
          disabled={isExploring}
        ></textarea>
        <div class="input-actions">
          {#if followUpInput.trim()}
            <button 
              type="button" 
              class="clear-input-btn"
              on:click={() => followUpInput = ''}
              title="Clear input"
            >
              <X size={16} />
            </button>
          {/if}
          <button 
            type="submit" 
            class="send-btn"
            disabled={isExploring || !followUpInput.trim()}
          >
            {#if isExploring}
              <Loader2 size={18} class="spinning" />
            {:else}
              <Send size={18} />
            {/if}
          </button>
        </div>
      </div>
    </form>
  </div>
</div>

<style>
  .chat-wrapper {
    width: 100%;
    max-width: 800px;
    height: 85vh;
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #e5e7eb;
    position: relative;
  }

  .chat-header {
    background: #1f2937;
    padding: 20px 24px;
    border-bottom: 1px solid #374151;
  }

  .chat-header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .chat-title {
    display: flex;
    align-items: center;
    gap: 12px;
    color: white;
    font-size: 1.25rem;
    font-weight: 700;
  }

  .header-btn {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .header-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    background: #fafbfc;
    scroll-behavior: smooth;
  }

  .welcome-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 60px 20px;
    color: #6b7280;
  }

  .welcome-icon {
    background: #374151;
    color: white;
    padding: 24px;
    border-radius: 50%;
    margin-bottom: 24px;
  }

  .welcome-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 12px 0;
  }

  .welcome-subtitle {
    font-size: 1.125rem;
    color: #6b7280;
    margin: 0 0 40px 0;
  }

  .generating-welcome {
    color: #059669;
    font-style: italic;
  }

  .quick-prompts {
    width: 100%;
    max-width: 500px;
  }

  .quick-prompts-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
    margin: 0 0 16px 0;
  }

  .quick-prompts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
  }

  .quick-prompt-btn {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px;
    text-align: left;
    font-size: 0.9rem;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .quick-prompt-btn:hover {
    border-color: #374151;
    box-shadow: 0 4px 12px rgba(55, 65, 81, 0.15);
    transform: translateY(-1px);
  }

  .message {
    display: flex;
    gap: 16px;
    animation: fadeInUp 0.4s cubic-bezier(0.4, 1.4, 0.6, 1);
  }

  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .message.user {
    flex-direction: row-reverse;
  }

  .message-avatar {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: #374151;
    color: white;
  }

  .message.user .message-avatar {
    background: #1f2937;
  }

  .message-content {
    flex: 1;
    max-width: 80%;
  }

  .message.user .message-content {
    max-width: 70%;
  }

  .message-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .message-role {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
  }

  .message-time {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .copy-btn {
    background: none;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
    margin-left: auto;
  }

  .copy-btn:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .generation-time {
    font-size: 0.75rem;
    color: #9ca3af;
    margin-top: 8px;
    font-style: italic;
  }

  .message-text {
    background: white;
    padding: 16px 20px;
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    font-size: 1rem;
    line-height: 1.6;
    color: #1f2937;
    border: 1px solid #f3f4f6;
  }

  .message.user .message-text {
    background: #1f2937;
    color: white;
    border: none;
  }

  .message-text h1,
  .message-text h2,
  .message-text h3 {
    margin: 1em 0 0.5em 0;
    font-weight: 600;
  }

  .message-text h1 { font-size: 1.5rem; }
  .message-text h2 { font-size: 1.25rem; }
  .message-text h3 { font-size: 1.125rem; }

  .message-text p {
    margin: 0 0 1em 0;
  }

  .message-text ul,
  .message-text ol {
    margin: 1em 0;
    padding-left: 1.5em;
  }

  .message-text li {
    margin-bottom: 0.5em;
  }

  .message-text code {
    background: #f3f4f6;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875em;
  }

  .message-text strong {
    font-weight: 600;
  }

  .message-text em {
    font-style: italic;
  }

  .message-text pre {
    background: #1f2937;
    color: #f9fafb;
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1em 0;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .message-text pre code {
    background: none;
    padding: 0;
    color: inherit;
    font-size: inherit;
  }

  .message-text a {
    color: #3b82f6;
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color 0.2s;
  }

  .message-text a:hover {
    border-bottom-color: #3b82f6;
  }

  .message-text .wiki-ref {
    color: #059669;
    font-weight: 500;
  }

  .message-text .wiki-ref:hover {
    border-bottom-color: #059669;
  }

  .generated-image {
    margin-top: 16px;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .generated-image img {
    width: 100%;
    height: auto;
    display: block;
    max-width: 500px;
    border-radius: 12px;
  }

  .typing-indicator {
    display: flex;
    align-items: center;
    gap: 12px;
    background: white;
    padding: 16px 20px;
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    border: 1px solid #f3f4f6;
  }

  .typing-dots {
    display: flex;
    gap: 4px;
  }

  .typing-dot {
    width: 8px;
    height: 8px;
    background: #374151;
    border-radius: 50%;
    animation: typing 1.4s infinite ease-in-out;
  }

  .typing-dot:nth-child(1) { animation-delay: -0.32s; }
  .typing-dot:nth-child(2) { animation-delay: -0.16s; }

  @keyframes typing {
    0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
    40% { transform: scale(1); opacity: 1; }
  }

  .typing-text {
    font-size: 0.9rem;
    color: #6b7280;
    font-weight: 500;
  }

  .suggested-followups {
    background: white;
    border-top: 1px solid #e5e7eb;
    padding: 20px 24px;
  }

  .suggested-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 12px;
  }

  .suggested-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .suggested-btn {
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 20px;
    padding: 8px 16px;
    font-size: 0.875rem;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .suggested-btn:hover,
  .suggested-btn.selected {
    background: #374151;
    color: white;
    border-color: #374151;
    transform: translateY(-1px);
  }

  .suggested-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .chat-input-container {
    background: white;
    border-top: 1px solid #e5e7eb;
    padding: 20px 24px;
  }

  .chat-input-form {
    width: 100%;
  }

  .input-wrapper {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    background: #f8fafc;
    border: 2px solid #e5e7eb;
    border-radius: 16px;
    padding: 12px 16px;
    transition: all 0.2s;
  }

  .input-wrapper:focus-within {
    border-color: #374151;
    box-shadow: 0 0 0 3px rgba(55, 65, 81, 0.1);
  }

  .chat-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 1rem;
    line-height: 1.5;
    color: #1f2937;
    resize: none;
    outline: none;
    min-height: 24px;
    max-height: 120px;
  }

  .chat-input::placeholder {
    color: #9ca3af;
  }

  .input-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .clear-input-btn {
    background: none;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .clear-input-btn:hover {
    background: #e5e7eb;
    color: #374151;
  }

  .send-btn {
    background: #1f2937;
    color: white;
    border: none;
    padding: 10px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .send-btn:hover:not(:disabled) {
    background: #374151;
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(31, 41, 55, 0.3);
  }

  .send-btn:disabled {
    background: #e5e7eb;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .chat-wrapper {
      height: 100vh;
      border-radius: 0;
    }

    .chat-messages {
      padding: 16px;
    }

    .message-content {
      max-width: 85%;
    }

    .message.user .message-content {
      max-width: 80%;
    }

    .quick-prompts-grid {
      grid-template-columns: 1fr;
    }

    .suggested-buttons {
      flex-direction: column;
    }

    .suggested-btn {
      text-align: left;
    }
  }
</style> 