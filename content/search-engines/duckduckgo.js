// DuckDuckGo search engine specific module
// Handles detection and processing of DuckDuckGo search results

/**
 * Process DuckDuckGo search results
 * @returns {boolean} True if DuckDuckGo search results were found and processed
 */
function processDuckDuckGoSearch() {
  // Get all search result elements
  const searchResults = document.querySelectorAll('.result, .web-result');
  
  if (searchResults.length === 0) {
    console.log('No DuckDuckGo search results found');
    return false;
  }
  
  console.log(`Found ${searchResults.length} DuckDuckGo search results`);
  
  // Process each search result
  searchResults.forEach((resultElement) => {
    // Skip if already processed
    if (resultElement.querySelector('.infodemic-indicator')) return;
    
    // Find the link element - DuckDuckGo typically has the main link in an <a> with class 'result__a'
    const linkElement = resultElement.querySelector('.result__a') || 
                        resultElement.querySelector('.result__url') || 
                        resultElement.querySelector('a');
    if (!linkElement) return;
    
    const url = linkElement.href;
    if (!url) return;
    
    // Check URL against bias database
    chrome.runtime.sendMessage({ type: 'CHECK_URL', url }, (response) => {
      if (response && response.biasData) {
        // Create and insert bias indicator
        const indicator = createBiasIndicator(response.biasData);
        
        // Find the right place to insert the indicator
        const titleElement = linkElement.closest('h2') || linkElement;
        titleElement.insertAdjacentElement('afterend', indicator);
      }
    });
  });
  
  return true;
}
