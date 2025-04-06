// Google search engine specific module
// Handles detection and processing of Google search results

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
  console.log('Looking for Google News format results');
  
  const newsResults = [
    ...document.querySelectorAll('.ftSUBd:not(:has(.infodemic-indicator))'),
    ...document.querySelectorAll('.WlydOe:not(:has(.infodemic-indicator))'),
    ...document.querySelectorAll('.DBQmFf:not(:has(.infodemic-indicator))')
  ];
  
  console.log(`Found ${newsResults.length} Google News results to process`);
  
  if (newsResults.length > 0) {
    // Process each news result
    newsResults.forEach(result => {
      // Find the source element first
      const sourceElement = 
        result.querySelector('.CEMjEf') || 
        result.querySelector('.cCCCLc') || 
        result.querySelector('.UPmit');
        
      if (sourceElement) {
        console.log('Processing news result with source:', sourceElement.textContent);
        
        // Check if we can find the source in our database
        const sourceText = sourceElement.textContent.trim().toLowerCase();
        
        // Send the source text itself for checking
        chrome.runtime.sendMessage({ type: 'CHECK_SOURCE', source: sourceText }, (response) => {
          if (response && response.biasData) {
            console.log('Got bias data for source:', response.biasData);
            
            // Create and insert the indicator
            const indicator = createBiasIndicator(response.biasData);
            sourceElement.insertAdjacentElement('afterend', indicator);
          }
        });
      } else {
        // Fall back to link-based approach
        const linkElement = result.querySelector('a');
        if (linkElement && linkElement.href) {
          processSearchResult(result);
        }
      }
    });
  }
}
