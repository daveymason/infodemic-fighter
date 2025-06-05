// Main content script for Infodemic Fighter extension
// Handles search result page modifications

// Use IIFE to create a module and prevent duplicate execution
(function InfodemicFighter() {
  // Check if we've already been loaded to prevent duplicate execution
  if (window.infodemicFighterLoaded) {
    console.log('Infodemic Fighter already loaded, preventing duplicate execution');
    return;
  }
  
  // Mark as loaded
  window.infodemicFighterLoaded = true;
  
  console.log('Infodemic Fighter content script loaded');
  
  // Set up a registry to track processed domains and URLs
  const processedDomains = new Set();
  const processedURLs = new Set();
  
  // Global settings
  let settings = {
    enabled: true,
    showBiasIndicator: true,
    showReliabilityIndicator: true,
    colorScheme: 'default'
  };

  // Get settings from storage
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
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
    // Track popup state to prevent errors
  let popupActive = false;
  let autoCloseTimer = null;
  
  // Cleanup management
  const cleanupTasks = [];
  
  // Function to register cleanup tasks
  function registerCleanup(task) {
    cleanupTasks.push(task);
  }
  
  // Function to run all cleanup tasks
  function runCleanup() {
    console.log('Running content script cleanup...');
    cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });
    cleanupTasks.length = 0; // Clear the array
  }
  
  // Run cleanup when page unloads
  window.addEventListener('beforeunload', runCleanup);
  window.addEventListener('unload', runCleanup);
  
  // Also run cleanup on visibility change (when tab becomes hidden)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Cleanup when tab becomes hidden for a while
      setTimeout(() => {
        if (document.visibilityState === 'hidden') {
          runCleanup();
        }
      }, 60000); // 1 minute delay
    }
  });
  
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Content script received message:", message);
    
    // Handle PING requests to check if content script is loaded
    if (message.type === 'PING') {
      console.log("Received PING, responding with PONG");
      sendResponse({ status: 'PONG' });
      return true;
    }
    
    // Handle popup display requests
    if (message.type === 'SHOW_BIAS_POPUP' && message.html) {
      injectPopup(message.html);
      sendResponse({ success: true });
    }
    
    return true;
  });
  
  // Function to inject popup into the page
  function injectPopup(popupHTML) {
    try {
      // Clean up any existing popup first
      removeExistingPopup();
      
      // Create the popup
      const container = document.createElement('div');
      container.innerHTML = popupHTML;
      document.body.appendChild(container.firstElementChild);
      
      // Set popup state to active
      popupActive = true;
      
      // Add event listener for close button
      const closeButton = document.getElementById('infodemic-close');
      if (closeButton) {
        closeButton.addEventListener('click', removeExistingPopup);
      }
      
    } catch (error) {
      console.error('Error injecting popup:', error);
    }
  }
    // Function to clean up existing popup
  function removeExistingPopup() {
    try {
      const existingPopup = document.getElementById('infodemic-container');
      if (existingPopup) {
        existingPopup.remove();
      }
      
      // Reset popup state
      popupActive = false;
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        autoCloseTimer = null;
      }
      
    } catch (error) {
      console.error('Error removing popup:', error);
    }
  }
  
  // Register popup cleanup
  registerCleanup(() => {
    removeExistingPopup();
    console.log('Cleaned up popups');
  });
  
  // Detect which search engine we're on
  function detectSearchEngine() {
    const url = window.location.href;
    
    // Check if search engine specific functions are available
    // These are loaded from separate search-engine specific files
    if (url.includes('google.com/search') && typeof processGoogleSearch === 'function') {
      console.log('Using Google-specific search processor');
      processGoogleSearch();
    } else if (url.includes('bing.com/search') && typeof processBingSearch === 'function') {
      console.log('Using Bing-specific search processor');
      processBingSearch();
    } else if (url.includes('duckduckgo.com') && typeof processDuckDuckGoSearch === 'function') {
      console.log('Using DuckDuckGo-specific search processor');
      processDuckDuckGoSearch();
    } else {
      // Fallback to generic processing if search engine specific functions are not available
      console.log('Using generic search processor');
      processGenericSearch();
    }
  }

  // Generic search processing as fallback
  function processGenericSearch() {
    console.log('Processing search results with generic method');
    
    // Find all links that point to external websites
    const allLinks = document.querySelectorAll('a[href^="http"]:not([href*="google.com"]):not([href*="bing.com"]):not([href*="duckduckgo.com"])');
    
    for (const link of allLinks) {
      // Get the URL and domain
      const url = link.href;
      const domain = extractDomain(url);
      
      // Skip if we've already processed this domain or URL, or if an indicator already exists
      if (!domain || processedDomains.has(domain) || processedURLs.has(url) || link.closest('.infodemic-indicator')) {
        continue;
      }
      
      // Find the container for this result (h3 or parent div)
      const container = link.closest('h3') || link.closest('div[data-hveid]') || 
                       link.closest('.g') || link.closest('.MjjYud') || link.closest('.b_algo') || link.closest('.result');
      
      if (!container || container.querySelector('.infodemic-indicator')) {
        continue;
      }
      
      // Process this URL
      processUrl(url, container);
      
      // Mark as processed
      processedDomains.add(domain);
      processedURLs.add(url);
    }
    
    // Set up mutation observer for dynamic content
    setupMutationObserver();
  }

  // Generic function to process a list of result containers
  function processResults(containers) {
    for (const container of containers) {
      // Skip if we already added an indicator to this container
      if (container.querySelector('.infodemic-indicator')) {
        continue;
      }
      
      // Find the first link in this container
      const link = container.querySelector('a[href^="http"]');
      if (!link) continue;
      
      const url = link.href;
      const domain = extractDomain(url);
      
      // Skip if already processed this domain
      if (!domain || processedDomains.has(domain) || processedURLs.has(url)) {
        continue;
      }
      
      // Process this URL
      processUrl(url, container);
      
      // Mark as processed
      processedDomains.add(domain);
      processedURLs.add(url);
    }
  }
  
  // Process a URL
  function processUrl(url, container) {
    chrome.runtime.sendMessage({ type: 'CHECK_URL', url }, (response) => {
      if (!response || !response.biasData || response.biasData.bias === 'unknown') {
        return;
      }
      
      // Find best place to insert the indicator
      let insertAfter = 
        container.querySelector('cite') || 
        container.querySelector('.UPmit') ||
        container.querySelector('.VuuXrf');
      
      if (!insertAfter) {
        // Find the domain element for this URL
        const domainText = extractDomain(url);
        if (domainText) {
          // Look for text nodes containing the domain
          const treeWalker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            { acceptNode: node => node.textContent.includes(domainText) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
          );
          
          const domainNode = treeWalker.nextNode();
          if (domainNode) {
            insertAfter = domainNode.parentElement;
          }
        }
      }
      
      // If we still don't have a target, use the link itself
      if (!insertAfter) {
        insertAfter = container.querySelector('a[href^="http"]');
      }
        if (insertAfter) {
        const indicator = createBiasIndicator(response.biasData);
        if (indicator) {
          insertAfter.insertAdjacentElement('afterend', indicator);
        }
      }
    });
  }
  
  // Set up mutation observer to detect dynamically loaded content
  function setupMutationObserver() {
    // Performance optimizations:
    // 1. Use a debounced function to process changes in batches
    // 2. Process only new nodes, not modified nodes
    // 3. Filter out irrelevant mutations
    
    // Create a processing queue to prevent duplicate processing
    let processingQueue = new Set();
    
    // Debounce function to process the queue less frequently
    const debouncedProcessQueue = debounce(() => {
      if (processingQueue.size === 0) return;
      
      console.log('Processing new content, items in queue:', processingQueue.size);
      
      // Convert to array and clear queue
      const elements = Array.from(processingQueue);
      processingQueue.clear();
      
      // Process elements in small batches to avoid blocking the UI
      for (let i = 0; i < elements.length; i += 5) {
        const batch = elements.slice(i, i + 5);
        setTimeout(() => {
          batch.forEach(element => {
            // Find all links that point to external websites
            const links = element.querySelectorAll('a[href^="http"]:not([href*="google.com"])');
            
            for (const link of links) {
              const url = link.href;
              const domain = extractDomain(url);
              
              // Find the container for this result (h3 or parent div)
              // Important: Check for existing indicator *before* adding to processed sets
              const container = link.closest('h3') || link.closest('div[data-hveid]') || 
                               link.closest('.g') || link.closest('.MjjYud');
              
              if (!container || container.querySelector('.infodemic-indicator')) {
                continue;
              }

              // Skip if we've already processed this domain or URL
              if (!domain || processedDomains.has(domain) || processedURLs.has(url)) {
                continue;
              }
              
              // Process this URL
              processUrl(url, container);
              
              // Mark as processed
              processedDomains.add(domain);
              processedURLs.add(url);
            }
          });
        }, i * 10); // Small delay between batches (10ms * batch index)
      }
    }, 500); // Wait 500ms after changes before processing
    
    // Create mutation observer
    const observer = new MutationObserver(mutations => {
      let hasRelevantChanges = false;
      
      mutations.forEach(mutation => {
        // We only care about added nodes, not attribute changes
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check each added node
          mutation.addedNodes.forEach(node => {
            // Skip non-element nodes or small text changes
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            
            // Skip small elements that likely aren't search results
            if (node.childNodes.length < 3) return;
            
            // Check if this might be a search result
            const hasHeading = node.querySelector('h3');
            const hasLink = node.querySelector('a[href^="http"]');
            
            if (hasHeading || hasLink) {
              processingQueue.add(node);
              hasRelevantChanges = true;
            }
          });
        }
      });
      
      // Process the queue if there are relevant changes
      if (hasRelevantChanges) {
        debouncedProcessQueue();
      }
    });
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false, // Don't need attribute changes
      characterData: false // Don't need text changes
    });
      // Store the observer to be able to disconnect it if needed
    window.infodemicFighterObserver = observer;
    
    // Register cleanup for the observer
    registerCleanup(() => {
      if (window.infodemicFighterObserver) {
        window.infodemicFighterObserver.disconnect();
        window.infodemicFighterObserver = null;
        console.log('Cleaned up mutation observer');
      }
    });
    
    // Safety mechanism: disconnect the observer after 2 minutes to prevent memory issues
    const timeoutId = setTimeout(() => {
      if (window.infodemicFighterObserver) {
        window.infodemicFighterObserver.disconnect();
        window.infodemicFighterObserver = null;
        console.log('Disconnected mutation observer after timeout');
      }
    }, 120000); // 2 minutes
    
    // Register cleanup for the timeout
    registerCleanup(() => {
      clearTimeout(timeoutId);
    });
  }
  
  // Create bias indicator using emoji
  function createBiasIndicator(biasData) {
    // Create main container
    const container = document.createElement('span');
    container.className = 'infodemic-indicator';
    container.style.display = 'inline-flex';
    container.style.alignItems = 'center';
    container.style.marginLeft = '40px'; // Increased margin to avoid overlapping with three dots menu
    container.style.marginRight = '6px';
    container.style.gap = '8px';
    container.style.fontSize = '14px';
    container.style.position = 'relative';
    container.style.cursor = 'pointer';
    container.style.zIndex = '1000';
    
    // Create pill container for styling
    const pillContainer = document.createElement('span');
    pillContainer.className = 'infodemic-pills';
    pillContainer.style.display = 'inline-flex';
    pillContainer.style.gap = '6px';
    pillContainer.style.transition = 'transform 0.2s ease';
    
  // Create bias pill if enabled and bias data is known
  if (settings.showBiasIndicator && biasData.bias !== 'unknown') {
    const biasPill = document.createElement('span');
    biasPill.className = `bias-indicator bias-${biasData.bias}`;
    biasPill.style.display = 'inline-flex';
    biasPill.style.alignItems = 'center';
    biasPill.style.justifyContent = 'center';
    biasPill.style.padding = '2px 4px';
    biasPill.style.fontWeight = 'bold';
    biasPill.style.fontSize = '14px';
    biasPill.style.backgroundColor = 'transparent';
    
    // Use directional arrows for bias indicators
    let biasEmoji = '';
    switch(biasData.bias) {
      case 'left': 
        biasEmoji = '◄'; // Left arrow for left
        biasPill.style.color = '#0066CC';
        break;
      case 'lean-left': 
        biasEmoji = '◄◯'; // Left arrow with circle for lean-left
        biasPill.style.color = '#4DA6FF';
        break;
      case 'center': 
        biasEmoji = '◯'; // Circle for center
        biasPill.style.color = '#666666';
        break;
      case 'lean-right': 
        biasEmoji = '◯►'; // Circle with right arrow for lean-right
        biasPill.style.color = '#FF8C00';
        break;
      case 'right': 
        biasEmoji = '►'; // Right arrow for right
        biasPill.style.color = '#CC0000';
        break;
    }
    if (biasEmoji) {
      biasPill.textContent = biasEmoji;
      biasPill.style.textShadow = '0 1px 1px rgba(0,0,0,0.2)';
      pillContainer.appendChild(biasPill);
    }
  }
    
  // Create reliability indicator if enabled and reliability data is known
  if (settings.showReliabilityIndicator && biasData.reliability !== 'unknown') {
    const reliabilityPill = document.createElement('span');
    reliabilityPill.className = `reliability-indicator reliability-${biasData.reliability}`;
    reliabilityPill.style.display = 'inline-flex';
    reliabilityPill.style.alignItems = 'center';
    reliabilityPill.style.justifyContent = 'center';
    reliabilityPill.style.padding = '2px 4px';
    reliabilityPill.style.fontWeight = 'bold';
    reliabilityPill.style.fontSize = '14px';
    reliabilityPill.style.backgroundColor = 'transparent';
    
    // Use simple symbols for reliability levels
    let reliabilityEmoji = '';
    switch(biasData.reliability) {
      case 'high': 
        reliabilityEmoji = '●';
        reliabilityPill.style.color = '#00AA00';
        break;
      case 'mostly-high': 
        reliabilityEmoji = '◐';
        reliabilityPill.style.color = '#66BB00';
        break;
      case 'medium': 
        reliabilityEmoji = '◑';
        reliabilityPill.style.color = '#FFA500';
        break;
      case 'low': 
        reliabilityEmoji = '○';
        reliabilityPill.style.color = '#FF0000';
        break;
    }
    if (reliabilityEmoji) {
      reliabilityPill.textContent = reliabilityEmoji;
      reliabilityPill.style.textShadow = '0 1px 1px rgba(0,0,0,0.2)';
      pillContainer.appendChild(reliabilityPill);
    }
  }
      // Add pill container to main container
    container.appendChild(pillContainer);

    // If no pills were added (both bias and reliability unknown), return null
    if (pillContainer.children.length === 0) {
      return null;
    }

    // Use native browser tooltip for bias info
    container.title = `${biasData.name || 'Unknown Source'}\nBias: ${formatBiasLabel(biasData.bias)}\nReliability: ${formatReliabilityLabel(biasData.reliability)}`;

    // Return the container with tooltip inside
    return container;
  }
  
  // Helper function for debouncing
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Extract domain from URL
  function extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch (e) {
      return null;
    }
  }

  // Format bias label for display
  function formatBiasLabel(bias) {
    switch(bias) {
      case 'left': return 'Left';
      case 'lean-left': return 'Lean Left';
      case 'center': return 'Center';
      case 'lean-right': return 'Lean Right';
      case 'right': return 'Right';
      default: return 'Unknown';
    }
  }

  // Format reliability label for display
  function formatReliabilityLabel(reliability) {
    switch(reliability) {
      case 'high': return 'High';
      case 'mostly-high': return 'Mostly High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return 'Unknown';
    }
  }

})();
