// DuckDuckGo search engine specific module
// Handles detection and processing of DuckDuckGo search results

// Default settings for DuckDuckGo search engine
const duckduckgoSettings = {
  showBiasIndicator: true,
  showReliabilityIndicator: true,
};

/**
 * Create a bias indicator element
 * @param {Object} biasData - The bias data containing bias, reliability, and name
 * @returns {HTMLElement} The indicator element
 */
function createBiasIndicator(biasData) {
  console.log('🔧 Creating DuckDuckGo bias indicator for:', biasData);

  // Create main container
  const container = document.createElement('span');
  container.className = 'infodemic-indicator';
  container.style.display = 'inline-flex';
  container.style.alignItems = 'center';
  container.style.marginLeft = '24px';
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
  if (duckduckgoSettings.showBiasIndicator && biasData.bias !== 'unknown') {
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
  if (duckduckgoSettings.showReliabilityIndicator && biasData.reliability !== 'unknown') {
    const reliabilityPill = document.createElement('span');
    reliabilityPill.className = `reliability-indicator reliability-${biasData.reliability}`;
    reliabilityPill.style.display = 'inline-flex';
    reliabilityPill.style.alignItems = 'center';
    reliabilityPill.style.justifyContent = 'center';
    reliabilityPill.style.padding = '2px 4px';
    reliabilityPill.style.fontWeight = 'bold';
    reliabilityPill.style.fontSize = '14px';
    reliabilityPill.style.backgroundColor = 'transparent';      // Use simple geometric symbols for reliability levels (won't appear upside down)
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

  // Format bias and reliability labels for tooltip
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

  // Add tooltip
  container.title = `${biasData.name || 'Unknown Source'}\nBias: ${formatBiasLabel(biasData.bias)}\nReliability: ${formatReliabilityLabel(biasData.reliability)}`;

  return container;
}

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
      if (response && response.biasData) {        // Create and insert bias indicator
        const indicator = createBiasIndicator(response.biasData);
        if (indicator) {
          // Find the right place to insert the indicator
          const titleElement = linkElement.closest('h2') || linkElement;
          titleElement.insertAdjacentElement('afterend', indicator);
        }
      }
    });
  });
  
  return true;
}
