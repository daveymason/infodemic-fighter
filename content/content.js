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

  // Remove FontAwesome dependency per TODO.md
  
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
      
      // Add a click event on the container to close when clicking outside
      const popupContainer = document.getElementById('infodemic-container');
      if (popupContainer) {
        popupContainer.addEventListener('click', function(e) {
          if (e.target === popupContainer) {
            removeExistingPopup();
          }
        });
      }
      
      // Auto close after 15 seconds
      clearTimeout(autoCloseTimer);
      autoCloseTimer = setTimeout(removeExistingPopup, 15000);
      
      // Add a window click listener to close the popup
      setTimeout(() => {
        if (popupActive) {
          window.addEventListener('click', windowClickHandler);
        }
      }, 100);
      
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
      clearTimeout(autoCloseTimer);
      
      // Remove window click handler
      window.removeEventListener('click', windowClickHandler);
    } catch (error) {
      console.error('Error removing popup:', error);
    }
  }
  
  // Handler for window clicks (to dismiss popup when clicking outside)
  function windowClickHandler(event) {
    const popup = document.getElementById('infodemic-popup');
    if (popup && !popup.contains(event.target)) {
      removeExistingPopup();
    }
  }

  // Detect which search engine we're on
  function detectSearchEngine() {
    const url = window.location.href;
    
    if (url.includes('google.com/search')) {
      processGoogleSearch();
    } else if (url.includes('bing.com/search')) {
      processBingSearch();
    } else if (url.includes('duckduckgo.com')) {
      processDuckDuckGoSearch();
    }
  }

  // Process Google search results
  function processGoogleSearch() {
    console.log('Processing Google search results');
    
    // Find all links that point to external websites
    const allLinks = document.querySelectorAll('a[href^="http"]:not([href*="google.com"])');
    
    for (const link of allLinks) {
      // Get the URL and domain
      const url = link.href;
      const domain = extractDomain(url);
      
      // Skip if we've already processed this domain or URL
      if (!domain || processedDomains.has(domain) || processedURLs.has(url)) {
        continue;
      }
      
      // Find the container for this result (h3 or parent div)
      const container = link.closest('h3') || link.closest('div[data-hveid]') || 
                       link.closest('.g') || link.closest('.MjjYud');
      
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

  // Process Bing search results
  function processBingSearch() {
    const searchResults = document.querySelectorAll('.b_algo');
    processResults(searchResults);
  }

  // Process DuckDuckGo search results
  function processDuckDuckGoSearch() {
    const searchResults = document.querySelectorAll('.result');
    processResults(searchResults);
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
        insertAfter.insertAdjacentElement('afterend', indicator);
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
              
              // Skip if we've already processed this domain or URL
              if (!domain || processedDomains.has(domain) || processedURLs.has(url)) {
                continue;
              }
              
              // Find the container for this result (h3 or parent div)
              const container = link.closest('h3') || link.closest('div[data-hveid]') || 
                               link.closest('.g') || link.closest('.MjjYud');
              
              if (!container || container.querySelector('.infodemic-indicator')) {
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
    
    // Safety mechanism: disconnect the observer after 2 minutes to prevent memory issues
    setTimeout(() => {
      if (window.infodemicFighterObserver) {
        window.infodemicFighterObserver.disconnect();
        console.log('Disconnected mutation observer after timeout');
      }
    }, 120000); // 2 minutes
  }
  
  // Create bias indicator using emoji
  function createBiasIndicator(biasData) {
    // Create main container
    const container = document.createElement('span');
    container.className = 'infodemic-indicator';
    container.style.display = 'inline-flex';
    container.style.alignItems = 'center';
    container.style.marginLeft = '21px'; // Increased margin for better spacing from search results
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
    
    // Create bias pill if enabled
    if (settings.showBiasIndicator) {
      const biasPill = document.createElement('span');
      biasPill.className = `bias-indicator bias-${biasData.bias}`;
      biasPill.style.display = 'inline-flex';
      biasPill.style.alignItems = 'center';
      biasPill.style.justifyContent = 'center';
      biasPill.style.padding = '2px 4px';
      biasPill.style.fontWeight = 'bold';
      biasPill.style.fontSize = '14px';
      biasPill.style.backgroundColor = 'transparent';
      
      // Use clearer symbols instead of tiny arrows
      let biasEmoji = '❓'; // Default
      switch(biasData.bias) {
        case 'left': 
          biasEmoji = '◄';
          biasPill.style.color = '#0000FF';
          break;
        case 'lean-left': 
          biasEmoji = '◄◯';
          biasPill.style.color = '#6495ED';
          break;
        case 'center': 
          biasEmoji = '◯';
          biasPill.style.color = '#808080';
          break;
        case 'lean-right': 
          biasEmoji = '◯►';
          biasPill.style.color = '#FFA500';
          break;
        case 'right': 
          biasEmoji = '►';
          biasPill.style.color = '#FF0000';
          break;
      }
      biasPill.textContent = biasEmoji;
      biasPill.style.textShadow = '0 1px 1px rgba(0,0,0,0.2)';
      pillContainer.appendChild(biasPill);
    }
    
    // Create reliability indicator if enabled
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
      
      // Use emoji for reliability
      let reliabilityEmoji = '❓'; // Default
      switch(biasData.reliability) {
        case 'high': 
          reliabilityEmoji = '✓';
          reliabilityPill.style.color = '#4CAF50';
          break;
        case 'medium': 
          reliabilityEmoji = '!';
          reliabilityPill.style.color = '#FF9800';
          break;
        case 'low': 
          reliabilityEmoji = '✗';
          reliabilityPill.style.color = '#F44336';
          break;
      }
      reliabilityPill.textContent = reliabilityEmoji;
      reliabilityPill.style.textShadow = '0 1px 1px rgba(0,0,0,0.2)';
      pillContainer.appendChild(reliabilityPill);
    }
    
    // Add pill container to main container
    container.appendChild(pillContainer);

    // Use native browser tooltip for bias info
    container.title = `${biasData.name || 'Unknown Source'}\nBias: ${formatBiasLabel(biasData.bias)}\nReliability: ${formatReliabilityLabel(biasData.reliability)}`;

    // Return the container with tooltip inside
    return container;
  }
})();
