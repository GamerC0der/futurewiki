<script lang="ts">
  import { page } from '$app/stores';
  import { Book, MessageCircle, History, Search, User, Settings, Bell } from 'lucide-svelte';
  
  let currentView = 'search';
  
  $: {
    const path = $page.url.pathname;
    if (path === '/') {
      currentView = 'search';
    } else if (path.startsWith('/page/')) {
      currentView = 'search';
    } else if (path === '/explore') {
      currentView = 'explore';
    } else if (path === '/history') {
      currentView = 'history';
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
      <div class="nav-indicator" style="transform: translateY({currentView === 'search' ? 0 : currentView === 'explore' ? 80 : 160}px);"></div>
      <a href="/" class="nav-item {currentView === 'search' ? 'active' : ''}" aria-label="Wiki">
        <span class="nav-icon"><Book size={20} /></span>
        <span class="nav-tooltip">Wiki</span>
      </a>
      <a href="/explore" class="nav-item {currentView === 'explore' ? 'active' : ''}" aria-label="Chat">
        <span class="nav-icon"><MessageCircle size={20} /></span>
        <span class="nav-tooltip">Chat</span>
      </a>
      <a href="/history" class="nav-item {currentView === 'history' ? 'active' : ''}" aria-label="History">
        <span class="nav-icon"><History size={20} /></span>
        <span class="nav-tooltip">History</span>
      </a>
    </nav>
  </div>
  
  <div class="content-wrapper">
    <header class="top-bar">
      <div class="top-bar-container">
        <div class="top-bar-content">
          <a href="/" class="top-bar-logo">FutureWiki</a>
          <nav class="top-bar-nav">
            <a href="/" class="nav-link">Home</a>
            <a href="/explore" class="nav-link">Explore</a>
            <a href="/history" class="nav-link">History</a>
          </nav>
        </div>
      </div>
    </header>
    
    <main class="main">
      <slot />
    </main>
  </div>
</div>

<style>
  .page {
    min-height: 100vh;
    background-color: #f9fafb;
    display: flex;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .sidebar {
    width: 84px;
    background: #f8fafc;
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
    transition: width 0.15s ease;
  }
  .sidebar:hover {
    width: 220px;
  }
  
  .content-wrapper {
    flex: 1;
    margin-left: 84px;
    transition: margin-left 0.22s cubic-bezier(.4,1.4,.6,1);
  }
  .sidebar:hover ~ .content-wrapper {
    margin-left: 220px;
  }
  
  .top-bar {
    background-color: white;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    border-bottom: 1px solid #e5e7eb;
    position: sticky;
    top: 0;
    z-index: 15;
  }
  
  .top-bar-container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 16px;
  }
  
  @media (min-width: 640px) {
    .top-bar-container {
      padding: 0 24px;
    }
  }
  
  @media (min-width: 1024px) {
    .top-bar-container {
      padding: 0 32px;
    }
  }
  
  .top-bar-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 64px;
  }
  
  .top-bar-logo {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    text-decoration: none;
  }
  
  .top-bar-logo:hover {
    color: #374151;
  }
  
  .top-bar-nav {
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
  
  .sidebar-logo {
    font-size: 1.18rem;
    font-weight: 800;
    color: #222;
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
    color: #222;
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
    color: #222;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    border-radius: 50px;
    transition: background 0.18s, color 0.18s, box-shadow 0.18s;
    position: relative;
    box-shadow: 0 1px 4px rgba(59,130,246,0.04);
    text-decoration: none;
  }
  
  .nav-item:hover {
    background: #ececec;
    color: #222;
  }
  
  .nav-item.active {
    background: #ececec;
    color: #222;
    box-shadow: none;
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
    color: #888;
  }

  .nav-item.active .nav-icon {
    transform: scale(1.18);
    box-shadow: 0 2px 8px #3b82f633;
    color: #222;
  }
  
  .nav-tooltip {
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
    pointer-events: none;
  }
  
  .nav-item:hover .nav-tooltip {
    opacity: 1;
  }
  
  .main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
  }
</style> 