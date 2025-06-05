// Google search engine specific module
// Handles detection and processing of Google search results

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

// Global settings variable for use within this module
let googleSettings = {
  enabled: true,
  showBiasIndicator: true,
  showReliabilityIndicator: true,
  colorScheme: 'default'
};

// Get settings from the parent content script
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
    if (response && response.settings) {
      googleSettings = response.settings;
    }
  });
}

// Create bias indicator using emoji (copy from content.js)
function createBiasIndicator(biasData) {
  // Create main container
  const container = document.createElement('span');
  container.className = 'infodemic-indicator';
  container.style.display = 'inline-flex';
  container.style.alignItems = 'center';
  container.style.marginLeft = '40px';
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
  if (googleSettings.showBiasIndicator && biasData.bias !== 'unknown') {
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
  if (googleSettings.showReliabilityIndicator && biasData.reliability !== 'unknown') {
    const reliabilityPill = document.createElement('span');
    reliabilityPill.className = `reliability-indicator reliability-${biasData.reliability}`;
    reliabilityPill.style.display = 'inline-flex';
    reliabilityPill.style.alignItems = 'center';
    reliabilityPill.style.justifyContent = 'center';
    reliabilityPill.style.padding = '2px 4px';
    reliabilityPill.style.fontWeight = 'bold';
    reliabilityPill.style.fontSize = '14px';
    reliabilityPill.style.backgroundColor = 'transparent';
    
    // Use simple geometric symbols for reliability levels (won't appear upside down)
    let reliabilityEmoji = '';
    switch(biasData.reliability) {
      case 'high': 
        reliabilityEmoji = '●'; // Filled circle for high reliability
        reliabilityPill.style.color = '#00AA00';
        break;
      case 'mostly-high': 
        reliabilityEmoji = '◐'; // Half-filled circle for mostly-high reliability
        reliabilityPill.style.color = '#66BB00';
        break;
      case 'medium': 
        reliabilityEmoji = '◑'; // Different half-filled circle for medium reliability
        reliabilityPill.style.color = '#FFA500';
        break;
      case 'low': 
        reliabilityEmoji = '○'; // Empty circle for low reliability
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
  const formatBiasLabel = (bias) => {
    switch(bias) {
      case 'left': return 'Left';
      case 'lean-left': return 'Lean Left';
      case 'center': return 'Center';
      case 'lean-right': return 'Lean Right';
      case 'right': return 'Right';
      default: return 'Unknown';
    }
  };

  const formatReliabilityLabel = (reliability) => {
    switch(reliability) {
      case 'high': return 'High';
      case 'mostly-high': return 'Mostly High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return 'Unknown';
    }
  };

  container.title = `${biasData.name || 'Unknown Source'}\nBias: ${formatBiasLabel(biasData.bias)}\nReliability: ${formatReliabilityLabel(biasData.reliability)}`;

  // Return the container with tooltip inside
  return container;
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
    
    console.log('Processing new Google content, items in queue:', processingQueue.size);
    
    // Convert to array and clear queue
    const elements = Array.from(processingQueue);
    processingQueue.clear();
    
    // Process elements in small batches to avoid blocking the UI
    for (let i = 0; i < elements.length; i += 5) {
      const batch = elements.slice(i, i + 5);
      setTimeout(() => {
        batch.forEach(element => {
          // Look for Google search result containers
          const containers = [
            ...element.querySelectorAll('.g:not(:has(.infodemic-indicator))'),
            ...element.querySelectorAll('.MjjYud:not(:has(.infodemic-indicator))'),
            ...element.querySelectorAll('[data-hveid]:not(:has(.infodemic-indicator))')
          ];
          
          containers.forEach(container => {
            const link = container.querySelector('a[href^="http"]');
            if (link && link.href) {
              processSearchResult(container);
            }
          });
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
          
          // Check if this might be a Google search result
          const hasGoogleResult = node.querySelector('.g') || 
                                 node.querySelector('.MjjYud') || 
                                 node.querySelector('[data-hveid]') ||
                                 node.matches('.g') ||
                                 node.matches('.MjjYud') ||
                                 node.matches('[data-hveid]');
          
          if (hasGoogleResult) {
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
  window.infodemicFighterGoogleObserver = observer;
  
  // Safety mechanism: disconnect the observer after 2 minutes to prevent memory issues
  setTimeout(() => {
    if (window.infodemicFighterGoogleObserver) {
      window.infodemicFighterGoogleObserver.disconnect();
      console.log('Disconnected Google mutation observer after timeout');
    }
  }, 120000); // 2 minutes
}

/**
 * Process Google search results
 * @returns {boolean} True if Google search results were found and processed
 */
function processGoogleSearch() {
  console.log('Processing Google search results');
  
  // Get all search result elements using comprehensive selectors
  // Google frequently changes their structure, so we need to be thorough
  const searchResults = [
    ...document.querySelectorAll('.g:not(:has(.infodemic-indicator))'),
    ...document.querySelectorAll('.srKDX:not(:has(.infodemic-indicator))'),
    ...document.querySelectorAll('.xpd:not(:has(.infodemic-indicator))'),
    ...document.querySelectorAll('div.MjjYud:not(:has(.infodemic-indicator))'),
    ...document.querySelectorAll('.v7W49e:not(:has(.infodemic-indicator))'),
    ...document.querySelectorAll('[data-hveid]:not(:has(.infodemic-indicator))'), 
    ...document.querySelectorAll('.tF2Cxc:not(:has(.infodemic-indicator))'),
    ...document.querySelectorAll('.hlcw0c:not(:has(.infodemic-indicator))'),
    ...document.querySelectorAll('.jtfYYd:not(:has(.infodemic-indicator))')
  ];
  
  console.log(`Found ${searchResults.length} Google search results to process`);
  
  if (searchResults.length > 0) {
    // Process in batches to avoid freezing the UI
    processBatch(searchResults, 0, 5);
  }
  
  // Try to directly check news elements
  processGoogleNewsResults();
  
  // Set up observer for dynamic loading
  setupMutationObserver();
  
  return searchResults.length > 0;
}

// Special handler for Google News results
function processGoogleNewsResults() {
  console.log('🔍 Looking for Google News format results');
  
  const newsResults = [
    ...document.querySelectorAll('.ftSUBd:not(:has(.infodemic-indicator))'),
    ...document.querySelectorAll('.WlydOe:not(:has(.infodemic-indicator))'),
    ...document.querySelectorAll('.DBQmFf:not(:has(.infodemic-indicator))'),
    ...document.querySelectorAll('.SoaBEf:not(:has(.infodemic-indicator))'), // Additional news selector
    ...document.querySelectorAll('.VwiC3b:not(:has(.infodemic-indicator))'), // Additional news selector
  ];
  
  console.log(`📰 Found ${newsResults.length} Google News results to process`);
  
  if (newsResults.length > 0) {
    // Process each news result
    newsResults.forEach((result, index) => {
      console.log(`📰 Processing news result ${index + 1}:`, result);
      
      // Find the source element first
      const sourceElement = 
        result.querySelector('.CEMjEf') || 
        result.querySelector('.cCCCLc') || 
        result.querySelector('.UPmit') ||
        result.querySelector('.fAgajc') || // Additional source selector
        result.querySelector('.STG9Jf') || // Additional source selector
        result.querySelector('.zBAuLc');   // Additional source selector
        
      if (sourceElement) {
        const sourceText = sourceElement.textContent.trim();
        console.log(`📰 Processing news result with source: "${sourceText}"`);
        
        // Check if we can find the source in our database
        const sourceTextLower = sourceText.toLowerCase();
        
        // Send the source text itself for checking
        chrome.runtime.sendMessage({ type: 'CHECK_SOURCE', source: sourceTextLower }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('🔴 Chrome runtime error for source check:', chrome.runtime.lastError);
            return;
          }
          
          console.log(`📨 Response for source "${sourceText}":`, response);
          
          if (response && response.biasData) {
            console.log('✅ Got bias data for source:', response.biasData);
              // Create and insert the indicator
            const indicator = createBiasIndicator(response.biasData);
            if (indicator) {
              sourceElement.insertAdjacentElement('afterend', indicator);
              console.log('✅ News indicator inserted for:', response.biasData.name);
            }
          } else {
            console.log(`🟡 No bias data found for source: "${sourceText}"`);
          }
        });
      } else {
        console.log('📰 No source element found, falling back to link-based approach');
        
        // Fall back to link-based approach
        const linkElement = result.querySelector('a');
        if (linkElement && linkElement.href) {
          console.log('📰 Processing news result via link:', linkElement.href);
          processSearchResult(result);
        } else {
          console.log('🔴 No link found in news result');
        }
      }
    });
  }
}

/**
 * Process a single Google search result element
 * @param {Element} result - The search result element
 */
function processSearchResult(result) {
  // Skip if already processed
  if (result.querySelector('.infodemic-indicator')) {
    console.log('🟡 Skipping already processed result');
    return;
  }

  // Find the first link in the result
  const link = result.querySelector('a[href^="http"]');
  if (!link) {
    console.log('🔴 No link found in search result:', result);
    return;
  }

  const url = link.href;
  if (!url) {
    console.log('🔴 No URL found in link:', link);
    return;
  }

  console.log('🔍 Processing search result URL:', url);

  // Ask background for bias data
  chrome.runtime.sendMessage({ type: 'CHECK_URL', url }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('🔴 Chrome runtime error:', chrome.runtime.lastError);
      return;
    }
    
    console.log('📨 Response from background for URL:', url, response);
    
    if (response && response.biasData) {
      console.log('✅ Got bias data:', response.biasData);
      
      // Create and insert bias indicator
      const indicator = createBiasIndicator(response.biasData);
      if (indicator) {
        // Insert after the link or at the end of the result
        link.insertAdjacentElement('afterend', indicator);
        console.log('✅ Indicator inserted for:', response.biasData.name);
      } else {
        console.log('🔴 Failed to create indicator for:', response.biasData);
      }
    } else {
      console.log('🟡 No bias data found for URL:', url);
    }
  });
}

/**
 * Process search results in batches to avoid UI freezing
 * @param {Array} results - Array of search result elements
 * @param {number} start - Start index
 * @param {number} batchSize - Number of results per batch
 */
function processBatch(results, start, batchSize) {
  const end = Math.min(start + batchSize, results.length);
  for (let i = start; i < end; i++) {
    processSearchResult(results[i]);
  }
  if (end < results.length) {
    setTimeout(() => processBatch(results, end, batchSize), 50); // Small delay for UI responsiveness
  }
}
