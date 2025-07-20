<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
</script>

<svelte:head>
  <title>Page Not Found - FutureWiki</title>
</svelte:head>

<div class="page">
  <header class="header">
    <div class="header-container">
      <div class="header-content">
        <a href="/" class="logo">FutureWiki</a>
        <nav class="nav">
          <a href="/" class="nav-link">Home</a>
          <a href="/read" class="nav-link">Search</a>
        </nav>
      </div>
    </div>
  </header>

  <main class="main">
    <div class="error-container">
      <div class="error-content">
        <div class="error-code">404</div>
        <h1 class="error-title">Page Not Found</h1>
        <p class="error-message">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      
      <div class="button-group">
        <button
          type="button"
          class="button button-primary"
          on:click={() => goto('/')}
        >
          Go Home
        </button>
        <button
          type="button"
          class="button button-secondary"
          on:click={() => goto('/read')}
        >
          Search FutureWiki
        </button>
      </div>
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
  
  @media (min-width: 640px) {
    .header-container {
      padding: 0 24px;
    }
  }
  
  @media (min-width: 1024px) {
    .header-container {
      padding: 0 32px;
    }
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
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  
  @media (min-width: 640px) {
    .main {
      padding: 24px;
    }
  }
  
  @media (min-width: 1024px) {
    .main {
      padding: 32px;
    }
  }
  
  .error-container {
    max-width: 448px;
    width: 100%;
    text-align: center;
  }
  
  .error-content {
    margin-bottom: 32px;
  }
  
  .error-code {
    font-size: 6rem;
    font-weight: 700;
    color: #e5e7eb;
    margin-bottom: 16px;
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
  
  .button:focus {
    outline: none;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }
  
  .button-primary {
    background-color: #2563eb;
    color: white;
  }
  
  .button-primary:hover {
    background-color: #1d4ed8;
  }
  
  .button-secondary {
    background-color: white;
    border: 1px solid #d1d5db;
    color: #374151;
  }
  
  .button-secondary:hover {
    background-color: #f9fafb;
  }
  
  .button-secondary:focus {
    box-shadow: 0 0 0 4px rgba(156, 163, 175, 0.1);
  }
</style> 