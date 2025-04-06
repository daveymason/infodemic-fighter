// Bing search engine specific module
// Handles detection and processing of Bing search results

/**
 * Process Bing search results
 * @returns {boolean} True if Bing search results were found and processed
 */
function processBingSearch() {
  // Get all search result elements
  const searchResults = document.querySelectorAll('.b_algo, .b_attribution');
  
  if (searchResults.length === 0) {
    console.log('No Bing search results found');
    return false;
  }
  
  console.log(`Found ${searchResults.length} Bing search results`);
  
  // Process each search result
  searchResults.forEach((resultElement) => {
    // Skip if already processed
    if (resultElement.querySelector('.infodemic-indicator')) return;
    
    // Find the link element - Bing typically has the main link in an <a> inside an h2
    const linkElement = resultElement.querySelector('h2 a') || resultElement.querySelector('a');
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
