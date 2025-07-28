<script lang="ts">
  import { onMount } from 'svelte';
  import { User, Bot, Send, Trash } from 'lucide-svelte';
  import { searchWikipediaArticles } from '$lib/wikipedia';
  
  let exploreInput = '';
  let exploreResponse = '';
  let exploreResponseHtml = '';
  let isExploring = false;
  let exploreError = '';
  let followUpInput = '';
  let conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [];
  let suggestedFollowUps: string[] = [];
  let isGeneratingFollowUps = false;

  async function performExplore(query: string, isFollowUp = false) {
    if (!query.trim()) return;
    
    isExploring = true;
    exploreError = '';
    
    if (!isFollowUp) {
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
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from AI service');
      }
      
      const aiResponse = data.choices[0].message.content;
      
      if (!aiResponse || typeof aiResponse !== 'string') {
        throw new Error('No valid content in AI response');
      }
      
      conversationHistory = [...conversationHistory, { role: 'user', content: query }, { role: 'assistant', content: aiResponse }];
      
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
      setTimeout(() => {
        const el = document.getElementById('chat-messages');
        if (el) el.scrollTop = el.scrollHeight;
      }, 50);
    }
  }

  function handleFollowUpKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && followUpInput.trim()) {
      event.preventDefault();
      handleFollowUpSubmit();
    }
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
          model: 'llama-4-scout',
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

  onMount(() => {
    // Focus on input when page loads
    const input = document.querySelector('.chat-input') as HTMLInputElement;
    if (input) input.focus();
  });
</script>

<div class="chat-container">
  <div class="chat-messages" id="chat-messages">
    {#each conversationHistory as msg, index}
      <div class="message {msg.role}">
        <div class="bubble-avatar">
          {#if msg.role === 'user'}
            <User size={22} />
          {:else}
            <Bot size={22} />
          {/if}
        </div>
        <div class="bubble-content">
          <div class="message-text">{@html convertMarkdownToHtml(msg.content)}</div>
          <div class="message-meta">{msg.role === 'user' ? 'You' : 'AI'} • {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        </div>
      </div>
    {/each}
    {#if isExploring}
      <div class="message assistant loading">
        <div class="bubble-avatar"><Bot size={22} /></div>
        <div class="bubble-content">
          <div class="chat-loading-spinner"></div>
          <div class="chat-loading-message">Thinking hard... fetching the best answer for you!</div>
        </div>
      </div>
    {/if}
  </div>
  <form class="chat-input-bar" on:submit|preventDefault={handleChatInputSubmit}>
    <input
      bind:value={followUpInput}
      on:keydown={handleFollowUpKeydown}
      type="text"
      placeholder="Type your question..."
      class="chat-input"
      autocomplete="off"
      disabled={isExploring}
    />
    <button type="button" class="chat-clear-btn" on:click={() => { conversationHistory = []; followUpInput = ''; }} title="Clear chat" aria-label="Clear chat" disabled={isExploring}>
      <Trash size={20} />
    </button>
    <button type="submit" class="chat-send-btn" disabled={isExploring || !followUpInput.trim()}>
      <Send size={20} />
    </button>
  </form>
  {#if suggestedFollowUps.length > 0 && !isExploring}
    <div class="suggested-followups chat-followups">
      <div class="suggested-header">Suggested follow-ups:</div>
      <div class="suggested-buttons">
        {#each suggestedFollowUps.slice(0, 2) as followUp}
          <button
            type="button"
            class="suggested-btn"
            on:click={() => {
              followUpInput = followUp;
              handleFollowUpSubmit();
            }}
            disabled={isExploring}
          >
            {followUp}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
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
</style> 