// Google search engine specific module
// Handles detection and processing of Google search results

/**
 * Process Google search results
 * @returns {boolean} True if Google search results were found and processed
 */
function processGoogleSearch() {
  console.log('Processing Google search results');
  
  // Select Google search result elements
  const searchResults = document.querySelectorAll('div.g, div.yuRUbf, div[data-sokoban-container]');
  console.log(`Found ${searchResults.length} Google search results`);
  
  if (searchResults.length === 0) {
    console.log('No Google search results found');
    return false;
  }
  
  searchResults.forEach(result => {
    // Skip if already processed
    if (result.querySelector('.infodemic-indicator')) return;
    
    // Find the link element
    const linkElement = result.querySelector('a');
    if (!linkElement) return;
    
    // Get URL
    const url = linkElement.href;
    if (!url) return;
    
    console.log('Processing URL:', url);
    
    // Check URL against bias database
    chrome.runtime.sendMessage({ 
      type: 'CHECK_URL', 
      url: url 
    }, (response) => {
      console.log('Got bias data response:', response);
      if (response && response.biasData) {
        // Add indicator to search result
        const indicator = createBiasIndicator(response.biasData);
        
        // Find a good place to insert the indicator
        const targetElement = result.querySelector('cite') || 
                             result.querySelector('.VuuXrf') || 
                             result.querySelector('.UPmit');
        
        if (targetElement) {
          console.log('Found target element to attach indicator');
          targetElement.parentNode.insertBefore(indicator, targetElement.nextSibling);
        }
      }
    });
  });
  
  return true;
}
