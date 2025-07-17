<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center">
  <div class="max-w-7xl mx-auto px-8 w-full">
    <div class="flex justify-center">
      <div class="text-center space-y-6 p-8">
        <h1 class="text-6xl font-black font-futuristic bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent tracking-wider">
          FutureWiki
        </h1>
        <p class="text-xl text-gray-600 font-medium flex justify-center gap-1">
          {#each "Surf the InterWebs".split('') as letter, i}
            <span class="hover:text-gray-900 hover:scale-110 transition-all duration-200 cursor-default" style="transition-delay: {i * 50}ms">
              {letter === ' ' ? '\u00A0' : letter}
            </span>
          {/each}
        </p>
        <div class="mt-8">
          <button class="group relative bg-gray-800 hover:bg-gray-900 text-white font-semibold py-4 px-10 rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 border border-gray-700 hover:border-gray-600">
            <span class="relative z-10">Get Started</span>
            <div class="absolute inset-0 bg-gradient-to-r from-gray-700 to-gray-800 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="bg-white py-12" bind:this={featuresSection}>
  <div class="max-w-6xl mx-auto px-8">
    <h2 class="text-4xl font-bold text-gray-800 text-center mb-16 font-futuristic transition-all duration-1000 {showFeatures ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}">
      Features
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div id="unbiased-info" class="group bg-gray-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-500 hover:scale-105 border border-gray-200 hover:border-gray-300 transition-all duration-700 {showFeatures ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}" 
           style="transition-delay: 200ms;">
        <div class="w-16 h-16 bg-gray-800 group-hover:bg-gray-900 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110">
          <svg class="w-8 h-8 text-white group-hover:text-gray-100 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
          </svg>
        </div>
        <h3 class="text-2xl font-bold text-gray-800 mb-4 group-hover:text-gray-900 transition-colors duration-300">Unbiased Info</h3>
        <p class="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
          Get factual, unbiased information from reliable sources without any hidden agendas or corporate influence.
        </p>
      </div>
      
      <div id="all-stories" class="group bg-gray-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-500 hover:scale-105 border border-gray-200 hover:border-gray-300 transition-all duration-700 {showFeatures ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}" 
           style="transition-delay: 400ms;">
        <div class="w-16 h-16 bg-gray-800 group-hover:bg-gray-900 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110">
          <svg class="w-8 h-8 text-white group-hover:text-gray-100 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>
        </div>
        <h3 class="text-2xl font-bold text-gray-800 mb-4 group-hover:text-gray-900 transition-colors duration-300">All the Stories</h3>
        <p class="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
          Hear everything, not just what they want you to hear. All of it. Powered by Wikipedia.
        </p>
      </div>
      
      <div id="dictionary" class="group bg-gray-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-500 hover:scale-105 border border-gray-200 hover:border-gray-300 transition-all duration-700 {showFeatures ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}" 
           style="transition-delay: 600ms;">
        <div class="w-16 h-16 bg-gray-800 group-hover:bg-gray-900 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110">
          <svg class="w-8 h-8 text-white group-hover:text-gray-100 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <h3 class="text-2xl font-bold text-gray-800 mb-4 group-hover:text-gray-900 transition-colors duration-300">Dictionary: Built In</h3>
        <p class="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
          Integrated dictionary and reference tools to help you understand complex terms and concepts instantly.
        </p>
      </div>
    </div>
  </div>
</div>

<footer class="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-20">
  <div class="max-w-6xl mx-auto px-8">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
      <div class="col-span-1 md:col-span-2">
        <div class="flex items-center mb-6">
          <div class="w-12 h-12 bg-gradient-to-r from-gray-700 to-gray-600 rounded-xl flex items-center justify-center mr-4">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
            </svg>
          </div>
          <h3 class="text-4xl font-black font-futuristic bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">FutureWiki</h3>
        </div>
        <p class="text-gray-300 mb-8 max-w-lg text-lg leading-relaxed">
          Surf the InterWebs with unbiased information, comprehensive coverage, and built-in tools for a better browsing experience.
        </p>

      </div>
      
      <div class="bg-gray-800/50 rounded-2xl p-8 border border-gray-700/50">
        <h4 class="text-xl font-bold mb-6 text-white">Features</h4>
        <ul class="space-y-4">
          <li>
            <a href="#unbiased-info" class="group flex items-center text-gray-300 hover:text-white transition-all duration-200 cursor-pointer" on:click|preventDefault={() => scrollToCard('unbiased-info')}>
              <div class="w-2 h-2 bg-gray-600 rounded-full mr-3 group-hover:bg-white transition-colors duration-200"></div>
              <span class="group-hover:translate-x-1 transition-transform duration-200">Unbiased Info</span>
            </a>
          </li>
          <li>
            <a href="#all-stories" class="group flex items-center text-gray-300 hover:text-white transition-all duration-200 cursor-pointer" on:click|preventDefault={() => scrollToCard('all-stories')}>
              <div class="w-2 h-2 bg-gray-600 rounded-full mr-3 group-hover:bg-white transition-colors duration-200"></div>
              <span class="group-hover:translate-x-1 transition-transform duration-200">All the Stories</span>
            </a>
          </li>
          <li>
            <a href="#dictionary" class="group flex items-center text-gray-300 hover:text-white transition-all duration-200 cursor-pointer" on:click|preventDefault={() => scrollToCard('dictionary')}>
              <div class="w-2 h-2 bg-gray-600 rounded-full mr-3 group-hover:bg-white transition-colors duration-200"></div>
              <span class="group-hover:translate-x-1 transition-transform duration-200">Dictionary: Built In</span>
            </a>
          </li>
        </ul>
      </div>
    </div>
    
    <div class="border-t border-gray-700/50 mt-16 pt-8">
      <div class="flex justify-center items-center">
        <div class="flex items-center text-gray-400 text-sm">
          <span>Powered by</span>
          <div class="ml-2 px-3 py-1 bg-gray-800 rounded-lg border border-gray-700">
            <span class="font-semibold text-white">Wikipedia</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</footer>

<script lang="ts">
  import { onMount } from 'svelte';
  
  let featuresSection: HTMLElement;
  let showFeatures = false;
  
  function scrollToCard(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }
  
  onMount(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          showFeatures = true;
        }
      });
    }, { threshold: 0.3 });
    
    if (featuresSection) {
      observer.observe(featuresSection);
    }
    
    return () => {
      if (featuresSection) {
        observer.unobserve(featuresSection);
      }
    };
  });
</script>

<style>
  ::-webkit-scrollbar {
    width: 12px;
  }
  
  ::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 6px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #374151 0%, #6b7280 100%);
    border-radius: 6px;
    border: 2px solid #f1f5f9;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #1f2937 0%, #4b5563 100%);
  }
  
</style>


