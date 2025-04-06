// Main content script for Infodemic Fighter extension
// Handles search result page modifications

console.log('Infodemic Fighter content script loaded');

// Import FontAwesome for icons
const fontAwesomeLink = document.createElement('link');
fontAwesomeLink.rel = 'stylesheet';
fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
document.head.appendChild(fontAwesomeLink);

// Global settings
let settings = {
  enabled: true,
  showBiasIndicator: true,
  showReliabilityIndicator: true,
  colorScheme: 'default'
};

// Get settings from storage
chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
  console.log('Got settings response:', response);
  if (response && response.settings) {
    settings = response.settings;
    console.log('Updated settings:', settings);
    
    // Only process if extension is enabled
    if (settings.enabled) {
      detectSearchEngine();
    }
  } else {
    // If no settings found, use defaults and process anyway
    console.log('Using default settings');
    detectSearchEngine();
  }
});

// Detect which search engine we're on
function detectSearchEngine() {
  console.log('Detecting search engine...');
  const url = window.location.href;
  
  if (url.includes('google.com/search')) {
    console.log('Google search detected');
    processGoogleSearch();
  } else if (url.includes('bing.com/search')) {
    console.log('Bing search detected');
    processBingSearch();
  } else if (url.includes('duckduckgo.com')) {
    console.log('DuckDuckGo search detected');
    processDuckDuckGoSearch();
  }
}

// Process Google search results
function processGoogleSearch() {
  console.log('Processing Google search results');
  
  // Get all search result elements that DON'T already have indicators
  const searchResults = [
    ...document.querySelectorAll('div.g:not(:has(.infodemic-indicator))'),
    ...document.querySelectorAll('.srKDX:not(:has(.infodemic-indicator))'),
    ...document.querySelectorAll('.xpd:not(:has(.infodemic-indicator))')
  ];
  
  console.log(`Found ${searchResults.length} Google search results to process`);
  
  if (searchResults.length > 0) {
    // Process in batches to avoid freezing the UI
    processBatch(searchResults, 0, 5);
  }
  
  // Set up observer for dynamic loading
  setupMutationObserver();
}

// Process results in smaller batches to prevent UI freezing
function processBatch(results, startIndex, batchSize) {
  const endIndex = Math.min(startIndex + batchSize, results.length);
  
  for (let i = startIndex; i < endIndex; i++) {
    processSearchResult(results[i]);
  }
  
  // If there are more results, process the next batch after a delay
  if (endIndex < results.length) {
    setTimeout(() => {
      processBatch(results, endIndex, batchSize);
    }, 100);
  }
}

// Process Bing search results
function processBingSearch() {
  // Get all search result elements
  const searchResults = document.querySelectorAll('.b_algo');
  
  searchResults.forEach(processSearchResult);
}

// Process DuckDuckGo search results
function processDuckDuckGoSearch() {
  // Get all search result elements
  const searchResults = document.querySelectorAll('.result');
  
  searchResults.forEach(processSearchResult);
}

// Process a single search result
function processSearchResult(resultElement) {
  // Check if already processed
  if (resultElement.querySelector('.infodemic-indicator')) return;
  
  // Find the link element - try multiple possible selectors
  const linkElement = 
    resultElement.querySelector('a.zReHs') || 
    resultElement.querySelector('a[jsname="UWckNb"]') ||
    resultElement.querySelector('a');
    
  if (!linkElement) return;
  
  const url = linkElement.href;
  if (!url) return;
  
  console.log('Processing search result with URL:', url);
  
  // Check URL against bias database
  chrome.runtime.sendMessage({ type: 'CHECK_URL', url }, (response) => {
    if (response && response.biasData) {
      // Create and insert bias indicator
      const indicator = createBiasIndicator(response.biasData);
      
      // Find the right place to insert the indicator
      // Try multiple potential parent elements based on the DOM structure
      const titleElement = 
        linkElement.closest('h3') || 
        linkElement.closest('.yuRUbf') || 
        linkElement;
        
      titleElement.insertAdjacentElement('afterend', indicator);
      
      // Apply styles to make indicator visible
      applyIndicatorStyles(indicator);
    }
  });
}

// Create bias indicator element - simplified for performance
function createBiasIndicator(biasData) {
  const container = document.createElement('div');
  container.className = 'infodemic-indicator infodemic-tooltip';
  container.style.display = 'inline-flex';
  container.style.margin = '0 8px';
  container.style.verticalAlign = 'middle';
  
  // Only show bias indicator if enabled
  if (settings.showBiasIndicator) {
    const biasPill = document.createElement('div');
    biasPill.className = `bias-pill bias-${biasData.bias}`;
    biasPill.style.padding = '2px 6px';
    biasPill.style.borderRadius = '12px';
    biasPill.style.marginRight = '4px';
    biasPill.style.fontSize = '12px';
    biasPill.style.fontWeight = 'bold';
    
    // Based on bias type, set color directly
    switch(biasData.bias) {
      case 'left':
        biasPill.style.backgroundColor = '#0000FF';
        biasPill.style.color = '#FFFFFF';
        break;
      case 'center-left':
        biasPill.style.backgroundColor = '#6495ED';
        biasPill.style.color = '#FFFFFF';
        break;
      case 'center':
        biasPill.style.backgroundColor = '#808080';
        biasPill.style.color = '#FFFFFF';
        break;
      case 'center-right':
        biasPill.style.backgroundColor = '#FFA500';
        biasPill.style.color = '#FFFFFF';
        break;
      case 'right':
        biasPill.style.backgroundColor = '#FF0000';
        biasPill.style.color = '#FFFFFF';
        break;
      default:
        biasPill.style.backgroundColor = '#D3D3D3';
        biasPill.style.color = '#333333';
    }
    
    // Add FontAwesome icon
    const biasType = getBiasType(biasData.bias);
    const iconClass = getBiasIconClass(biasType);
    biasPill.innerHTML = `<i class="${iconClass}"></i>`;
    container.appendChild(biasPill);
  }
  
  // Rest of the function remains the same...
  
  return container;
}

// Helper function to convert bias value to display type
function getBiasType(bias) {
  switch(bias) {
    case 'left': return 'L';
    case 'center-left': return 'CL';
    case 'center': return 'C';
    case 'center-right': return 'CR';
    case 'right': return 'R';
    default: return '?';
  }
}

// Get appropriate FontAwesome icon class for bias indicator
function getBiasIconClass(biasType) {
  switch(biasType) {
    case 'L': return 'fas fa-arrow-left';
    case 'CL': return 'fas fa-angle-left';
    case 'C': return 'fas fa-balance-scale';
    case 'CR': return 'fas fa-angle-right';
    case 'R': return 'fas fa-arrow-right';
    default: return 'fas fa-question';
  }
}

// Get appropriate FontAwesome icon class for reliability indicator
function getReliabilityIconClass(reliabilityType) {
  switch(reliabilityType) {
    case 'H': return 'fas fa-check-circle';
    case 'M': return 'fas fa-exclamation-circle';
    case 'L': return 'fas fa-times-circle';
    default: return 'fas fa-question-circle';
  }
}

// Set up mutation observer to handle dynamically loaded content - FIX CRASH ISSUES
function setupMutationObserver() {
  // Track if we're currently processing to prevent infinite loops
  let isProcessing = false;
  
  // Use a debounce function to limit how often we process
  const debouncedProcess = debounce(() => {
    if (isProcessing) return;
    
    isProcessing = true;
    console.log('Processing new search results from mutation observer');
    
    // Get the search engine type
    const url = window.location.href;
    if (url.includes('google.com/search')) {
      // Only process NEW results that don't have indicators yet
      const newResults = [
        ...document.querySelectorAll('div.g:not(:has(.infodemic-indicator))'),
        ...document.querySelectorAll('.srKDX:not(:has(.infodemic-indicator))'),
        ...document.querySelectorAll('.xpd:not(:has(.infodemic-indicator))')
      ];
      
      if (newResults.length > 0) {
        console.log(`Found ${newResults.length} new Google search results`);
        newResults.forEach(processSearchResult);
      }
    }
    
    isProcessing = false;
  }, 500); // Wait 500ms before processing to batch changes
  
  // Create the observer with the debounced callback
  const observer = new MutationObserver((mutations) => {
    // Check if any mutations are relevant before triggering processing
    const hasRelevantMutations = mutations.some(mutation => 
      mutation.type === 'childList' && 
      mutation.addedNodes.length > 0 &&
      // Avoid processing our own injected elements
      !Array.from(mutation.addedNodes).some(node => 
        node.classList && 
        (node.classList.contains('infodemic-indicator') || 
         node.classList.contains('infodemic-tooltip'))
      )
    );
    
    if (hasRelevantMutations) {
      debouncedProcess();
    }
  });
  
  // Observe only specific containers, not the entire body
  const searchContainers = [
    document.querySelector('#search'),
    document.querySelector('#rso'),
    document.querySelector('#center_col'),
    document.querySelector('#main')
  ].filter(Boolean); // Filter out null elements
  
  if (searchContainers.length > 0) {
    searchContainers.forEach(container => {
      observer.observe(container, { 
        childList: true, 
        subtree: true 
      });
    });
    console.log('Mutation observer set up for search containers');
  } else {
    // Fallback to body if no containers found, but with more restricted options
    observer.observe(document.body, { 
      childList: true, 
      subtree: false // Don't observe the entire subtree to reduce overhead
    });
    console.log('Mutation observer set up for body (fallback)');
  }
}

// Simple debounce function to limit function calls
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}
