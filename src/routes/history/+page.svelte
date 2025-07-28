<script lang="ts">
  import { onMount } from 'svelte';
  import { Book, MessageCircle } from 'lucide-svelte';
  import { loadRecentSearches } from '$lib/storage';
  
  let recentSearches: string[] = [];
  let conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [];

  function getWikiResult(search: string) {
    return { title: search, description: '', url: `https://en.wikipedia.org/wiki/${encodeURIComponent(search)}` };
  }

  const emptySvg = `<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="80" rx="20" fill="#f1f5f9"/><rect x="18" y="28" width="44" height="24" rx="6" fill="#e0e7ef"/><rect x="24" y="36" width="32" height="8" rx="4" fill="#cbd5e1"/></svg>`;

  onMount(() => {
    recentSearches = loadRecentSearches();
  });
</script>

<div class="history-page-full-centered">
  <div class="history-title history-title-main">History</div>
  <div class="history-section">
    <div class="history-section-header">Wiki</div>
    {#if recentSearches.length > 0}
    <div class="history-cards-grid">
      {#each recentSearches.slice(0,12) as search (search)}
        {@const wiki = getWikiResult(search)}
        <div class="history-card history-card-wiki fade-in">
          <div class="history-card-avatar wiki-avatar"><Book size={22} /></div>
          <div class="history-card-header">
            <span class="history-card-title">{wiki.title}</span>
          </div>
          {#if (wiki as any).thumbnail}
            <img class="history-card-thumb" src={(wiki as any).thumbnail} alt={wiki.title} />
          {/if}
          {#if wiki.description}
            <div class="history-card-desc">{wiki.description}</div>
          {/if}
          <div class="history-card-actions">
            <a class="history-card-link-btn" href={(wiki as any).url} target="_blank">View Article</a>
            <a class="history-card-action" href="/?search={encodeURIComponent(wiki.title)}">Search Again</a>
          </div>
        </div>
      {/each}
    </div>
    {:else}
    <div class="history-empty-modern">
      {@html emptySvg}
      <div class="history-empty-title">No Wiki History</div>
      <div class="history-empty-desc">Your recent Wikipedia searches will appear here.</div>
    </div>
    {/if}
  </div>
  <div class="history-section">
    <div class="history-section-header">Chat</div>
    {#if conversationHistory.length > 0}
    <div class="history-cards-grid">
      {#each conversationHistory.filter(msg => msg.role === 'user').slice(-12).reverse() as msg, i}
        <div class="history-card history-card-chat fade-in">
          <div class="history-card-avatar chat-avatar"><MessageCircle size={22} /></div>
          <div class="history-card-header">
            <span class="history-card-title">You</span>
          </div>
          <div class="history-card-desc">{msg.content}</div>
          <div class="history-card-actions">
            <a class="history-card-action" href="/explore?q={encodeURIComponent(msg.content)}">Chat Again</a>
          </div>
        </div>
      {/each}
    </div>
    {:else}
    <div class="history-empty-modern">
      {@html emptySvg}
      <div class="history-empty-title">No Chat History</div>
      <div class="history-empty-desc">Your chat conversations will appear here.</div>
    </div>
    {/if}
  </div>
</div>

<style>
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
    text-decoration: none;
    display: inline-block;
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
</style> 