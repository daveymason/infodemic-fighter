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
    processGoogleNewsResults();
  } else if (url.includes('bing.com/search')) {
    console.log('Bing search detected');
    processBingSearch();
  } else if (url.includes('duckduckgo.com')) {
    console.log('DuckDuckGo search detected');
    processDuckDuckGoSearch();
  }
}

// Replace the current processGoogleSearch function with this improved version:
function processGoogleSearch() {
  console.log('Processing Google search results');
  
  // Get ALL div elements that might contain search results
  const allDivs = document.querySelectorAll('div');
  const potentialResults = [];
  
  // Find divs that contain links but don't have our indicators yet
  for (const div of allDivs) {
    if (
      // Skip if already processed
      !div.querySelector('.infodemic-indicator') && 
      // Must have links
      div.querySelector('a[href^="http"]') &&
      // Should have some of Google's typical search result classes or attributes
      (div.hasAttribute('data-hveid') || 
       div.classList.contains('g') || 
       div.classList.contains('xpd') ||
       div.classList.contains('MjjYud') ||
       div.classList.contains('Jb0Zif') ||
       div.classList.contains('ULSxyf') ||
       div.classList.contains('v7W49e') ||
       div.classList.contains('srKDX') ||
       div.classList.contains('tF2Cxc'))
    ) {
      potentialResults.push(div);
    }
  }
  
  console.log(`Found ${potentialResults.length} potential Google search results`);
  
  // Process all links regardless of container
  const allLinks = document.querySelectorAll('a[href^="http"]:not([href*="google.com"]):not(:has(+ .infodemic-indicator))');
  console.log(`Found ${allLinks.length} raw links to process`);
  
  // Process potential containers first
  if (potentialResults.length > 0) {
    processBatch(potentialResults, 0, 5);
  }
  
  // Also process any direct links that might be missed
  processRawLinks(allLinks);
  
  // Set up observer for dynamic loading
  setupMutationObserver();
}

// New function to process all links directly
function processRawLinks(links) {
  for (const link of links) {
    // Skip links that are already part of a processed result
    if (hasAncestorWithIndicator(link)) continue;
    
    // Get the URL
    const url = link.href;
    if (!url) continue;
    
    // Skip Google internal links
    if (url.includes('google.com')) continue;
    
    console.log('Processing raw link:', url);
    
    // Check URL against bias database
    chrome.runtime.sendMessage({ type: 'CHECK_URL', url }, (response) => {
      if (response && response.biasData && response.biasData.bias !== 'unknown') {
        console.log('Got bias data for raw link:', url, response.biasData);
        
        // Create and insert bias indicator
        const indicator = createBiasIndicator(response.biasData);
        
        // Try to insert at meaningful locations
        try {
          // Try to find a better place to insert - look for citation or heading
          const resultElement = findParentResultElement(link);
          if (resultElement) {
            const insertTarget = 
              resultElement.querySelector('cite') || 
              resultElement.querySelector('.VuuXrf') ||
              resultElement.querySelector('h3') ||
              link;
              
            insertTarget.insertAdjacentElement('afterend', indicator);
          } else {
            // Just insert after the link itself
            link.insertAdjacentElement('afterend', indicator);
          }
        } catch (e) {
          console.error('Error inserting indicator for raw link:', e);
        }
      }
    });
  }
}

// Helper to check if an element has an ancestor with an indicator already
function hasAncestorWithIndicator(element) {
  let current = element.parentElement;
  const maxLevels = 6;
  let level = 0;
  
  while (current && level < maxLevels) {
    if (current.querySelector('.infodemic-indicator')) {
      return true;
    }
    current = current.parentElement;
    level++;
  }
  
  return false;
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
  if (resultElement.querySelector('.infodemic-indicator')) {
    console.log('Result already processed, skipping');
    return;
  }
  
  // Try to find source text first - this helps with AP News and other sources
  const sourceElements = [
    resultElement.querySelector('.VuuXrf'),
    resultElement.querySelector('.qLRx3b'),
    resultElement.querySelector('cite'),
    resultElement.querySelector('.UPmit')
  ].filter(Boolean);
  
  if (sourceElements.length > 0) {
    const sourceText = sourceElements[0].textContent.trim();
    console.log('Found source text:', sourceText);
    
    // Check if we have AP News or similar cases
    if (sourceText.includes('AP News') || sourceText.includes('Associated Press')) {
      console.log('Found AP News reference');
      
      // Create indicator directly
      const apBiasData = {
        bias: 'center',
        reliability: 'high',
        name: 'Associated Press'
      };
      
      const indicator = createBiasIndicator(apBiasData);
      sourceElements[0].insertAdjacentElement('afterend', indicator);
      return;
    }
    
    // Try checking the source text against our database
    chrome.runtime.sendMessage({ type: 'CHECK_SOURCE', source: sourceText }, (response) => {
      if (response && response.biasData && response.biasData.bias !== 'unknown') {
        console.log('Got bias data for source:', response.biasData);
        const indicator = createBiasIndicator(response.biasData);
        sourceElements[0].insertAdjacentElement('afterend', indicator);
        return;
      } else {
        // Fall back to URL-based detection
        processSearchResultUsingUrl(resultElement);
      }
    });
  } else {
    // Fall back to URL-based detection
    processSearchResultUsingUrl(resultElement);
  }
}

// Process search result using URL
function processSearchResultUsingUrl(resultElement) {
  // Try multiple selectors to find link elements
  const linkElements = [
    resultElement.querySelector('a[href^="http"]:not([href*="google.com"])'),
    resultElement.querySelector('a.zReHs'),
    resultElement.querySelector('a[jsname="UWckNb"]'),
    ...resultElement.querySelectorAll('a[href^="https://"]'),
    ...resultElement.querySelectorAll('a[href^="http://"]')
  ].filter(Boolean);
  
  if (linkElements.length === 0) {
    console.log('No link elements found in result');
    return;
  }
  
  // Get the main link (usually the first one)
  const linkElement = linkElements[0];
  const url = linkElement.href;
  if (!url) {
    console.log('No URL found in link element');
    return;
  }
  
  // Special case for AP News
  if (url.includes('apnews.com')) {
    console.log('Found AP News URL:', url);
    
    // Create indicator directly
    const apBiasData = {
      bias: 'center',
      reliability: 'high',
      name: 'Associated Press'
    };
    
    const indicator = createBiasIndicator(apBiasData);
    
    // Find best place to insert
    const insertTargets = [
      resultElement.querySelector('cite'),
      resultElement.querySelector('.VuuXrf'),
      resultElement.querySelector('.qLRx3b'),
      linkElement.closest('h3'),
      linkElement
    ].filter(Boolean);
    
    if (insertTargets.length > 0) {
      insertTargets[0].insertAdjacentElement('afterend', indicator);
    }
    
    return;
  }
  
  console.log('Processing search result with URL:', url);
  
  // Check URL against bias database
  chrome.runtime.sendMessage({ type: 'CHECK_URL', url }, (response) => {
    if (!response || !response.biasData) {
      console.log('No bias data returned for URL:', url);
      return;
    }
    
    console.log('Got bias data for', url, ':', response.biasData);
    
    // Only create indicator if we have meaningful bias data
    if (response.biasData.bias !== 'unknown' || response.biasData.name !== 'unknown') {
      // Create and insert bias indicator
      const indicator = createBiasIndicator(response.biasData);
      
      // Try multiple potential places to insert the indicator
      let inserted = false;
      
      // Potential target elements in order of preference
      const possibleTargets = [
        resultElement.querySelector('cite'),
        resultElement.querySelector('.UPmit'),
        resultElement.querySelector('.VuuXrf'), 
        resultElement.querySelector('.qLRx3b'),
        resultElement.querySelector('.tjvcx'),
        resultElement.querySelector('span[role="text"]'),
        linkElement.closest('h3'),
        linkElement
      ].filter(Boolean);
      
      for (const target of possibleTargets) {
        try {
          target.insertAdjacentElement('afterend', indicator);
          console.log('Successfully inserted indicator after', target);
          inserted = true;
          break;
        } catch (e) {
          console.log('Failed to insert after target, trying next');
        }
      }
      
      // If none of the targets worked, try parent elements
      if (!inserted) {
        try {
          const parent = linkElement.parentElement;
          if (parent) {
            parent.insertAdjacentElement('beforeend', indicator);
            console.log('Inserted indicator at end of parent element');
          }
        } catch (e) {
          console.error('Failed to insert indicator:', e);
        }
      }
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
        biasPill.textContent = 'L';
        break;
      case 'lean-left':
        biasPill.style.backgroundColor = '#6495ED';
        biasPill.style.color = '#FFFFFF';
        biasPill.textContent = 'CL';
        break;
      case 'center':
        biasPill.style.backgroundColor = '#808080';
        biasPill.style.color = '#FFFFFF';
        biasPill.textContent = 'C';
        break;
      case 'lean-right':
        biasPill.style.backgroundColor = '#FFA500';
        biasPill.style.color = '#FFFFFF';
        biasPill.textContent = 'CR';
        break;
      case 'right':
        biasPill.style.backgroundColor = '#FF0000';
        biasPill.style.color = '#FFFFFF';
        biasPill.textContent = 'R';
        break;
      default:
        biasPill.style.backgroundColor = '#D3D3D3';
        biasPill.style.color = '#333333';
        biasPill.textContent = '?';
    }
    
    container.appendChild(biasPill);
  }
  
  // Show reliability indicator if enabled
  if (settings.showReliabilityIndicator && biasData.reliability !== 'unknown') {
    const reliabilityPill = document.createElement('div');
    reliabilityPill.className = `reliability-pill reliability-${biasData.reliability}`;
    reliabilityPill.style.padding = '2px 6px';
    reliabilityPill.style.borderRadius = '12px';
    reliabilityPill.style.fontSize = '12px';
    reliabilityPill.style.fontWeight = 'bold';
    
    switch(biasData.reliability) {
      case 'high':
        reliabilityPill.style.backgroundColor = '#4CAF50';
        reliabilityPill.style.color = '#FFFFFF';
        reliabilityPill.textContent = 'H';
        break;
      case 'medium':
        reliabilityPill.style.backgroundColor = '#FF9800';
        reliabilityPill.style.color = '#FFFFFF';
        reliabilityPill.textContent = 'M';
        break;
      case 'low':
        reliabilityPill.style.backgroundColor = '#F44336';
        reliabilityPill.style.color = '#FFFFFF';
        reliabilityPill.textContent = 'L';
        break;
    }
    
    container.appendChild(reliabilityPill);
  }
  
  // Add tooltip functionality
  const tooltip = document.createElement('div');
  tooltip.className = 'infodemic-tooltip-text';
  tooltip.style.visibility = 'hidden';
  tooltip.style.position = 'absolute';
  tooltip.style.zIndex = '10000';
  tooltip.style.backgroundColor = 'white';
  tooltip.style.color = 'black';
  tooltip.style.border = '1px solid #ddd';
  tooltip.style.padding = '10px';
  tooltip.style.borderRadius = '4px';
  tooltip.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  tooltip.style.width = '200px';
  tooltip.style.fontSize = '12px';
  tooltip.style.top = '-80px';
  tooltip.style.left = '0';
  
  tooltip.innerHTML = `
    <div style="font-weight:bold;margin-bottom:5px;border-bottom:1px solid #eee;padding-bottom:5px;">
      ${biasData.name || 'Unknown Source'}
    </div>
    <div>
      <div><strong>Political Bias:</strong> ${formatBiasLabel(biasData.bias)}</div>
      <div><strong>Reliability:</strong> ${formatReliabilityLabel(biasData.reliability)}</div>
    </div>
  `;
  
  container.appendChild(tooltip);
  
  container.addEventListener('mouseenter', () => {
    tooltip.style.visibility = 'visible';
  });
  
  container.addEventListener('mouseleave', () => {
    tooltip.style.visibility = 'hidden';
  });
  
  return container;
}

// Format bias label for display
function formatBiasLabel(bias) {
  switch(bias) {
    case 'left': return 'Left';
    case 'lean-left': return 'Center-Left';
    case 'center': return 'Center';
    case 'lean-right': return 'Center-Right';
    case 'right': return 'Right';
    default: return 'Unknown';
  }
}

// Format reliability label for display
function formatReliabilityLabel(reliability) {
  switch(reliability) {
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
    default: return 'Unknown';
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

// Set up mutation observer to handle dynamically loaded content
function setupMutationObserver() {
  console.log('Setting up mutation observer');
  
  // Track if we're currently processing to prevent infinite loops
  let isProcessing = false;
  
  // Use a debounce function to limit how often we process
  const debouncedProcess = debounce(() => {
    if (isProcessing) return;
    
    isProcessing = true;
    console.log('Processing new search results from mutation observer');
    
    // Get the search engine type
    const url = window.location.href;
    if (url.includes('google.com')) {
      processGoogleSearch();
      processGoogleNewsResults();
    } else if (url.includes('bing.com')) {
      processBingSearch();
    } else if (url.includes('duckduckgo.com')) {
      processDuckDuckGoSearch();
    }
    
    isProcessing = false;
  }, 1000);
  
  // Create the observer with the debounced callback
  const observer = new MutationObserver((mutations) => {
    // Only process if there are actual content changes
    const hasContentChanges = mutations.some(mutation => 
      mutation.type === 'childList' && 
      mutation.addedNodes.length > 0 &&
      !Array.from(mutation.addedNodes).some(node => 
        node.classList && node.classList.contains('infodemic-indicator')
      )
    );
    
    if (hasContentChanges) {
      console.log('Detected DOM changes, scheduling processing');
      debouncedProcess();
      
      // Check specifically for AP News links in the new content
      setTimeout(() => {
        const newApLinks = document.querySelectorAll('a[href*="apnews.com"]:not(:has(+ .infodemic-indicator))');
        if (newApLinks.length > 0) {
          console.log(`Found ${newApLinks.length} new AP News links`);
          
          newApLinks.forEach(link => {
            const resultElement = findParentResultElement(link);
            if (resultElement && !resultElement.querySelector('.infodemic-indicator')) {
              console.log('Processing new AP News link');
              
              const apBiasData = {
                bias: 'center',
                reliability: 'high',
                name: 'Associated Press'
              };
              
              const indicator = createBiasIndicator(apBiasData);
              
              // Insert after the closest cite or link text
              const insertTarget = 
                resultElement.querySelector('cite') || 
                resultElement.querySelector('.VuuXrf') ||
                link;
                
              insertTarget.insertAdjacentElement('afterend', indicator);
            }
          });
        }
      }, 500);
    }
  });
  
  // Target specific containers based on search engine
  let targetContainers = [];
  
  if (window.location.href.includes('google.com')) {
    targetContainers = [
      document.querySelector('#search'),
      document.querySelector('#rso'),
      document.querySelector('#center_col'),
      document.querySelector('div[role="main"]'),
      document.querySelector('#rcnt')
    ].filter(Boolean);
  } else if (window.location.href.includes('bing.com')) {
    targetContainers = [
      document.querySelector('#b_results'),
      document.querySelector('#b_content')
    ].filter(Boolean);
  } else if (window.location.href.includes('duckduckgo.com')) {
    targetContainers = [
      document.querySelector('.serp__results'),
      document.querySelector('#links')
    ].filter(Boolean);
  }
  
  if (targetContainers.length > 0) {
    for (const container of targetContainers) {
      console.log('Adding observer to container:', container);
      observer.observe(container, { 
        childList: true, 
        subtree: true 
      });
    }
  } else {
    // Fallback to observing the main content areas
    const mainContainers = [
      document.querySelector('main'),
      document.querySelector('#main'),
      document.body
    ].filter(Boolean);
    
    for (const container of mainContainers) {
      console.log('Adding fallback observer to:', container);
      observer.observe(container, { 
        childList: true, 
        subtree: true 
      });
    }
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

// Inside the DOMContentLoaded event handler, add:
// Manual check for AP News URLs and other special cases
const apNewsLinks = [
  ...document.querySelectorAll('a[href*="apnews.com"]'),
  ...document.querySelectorAll('a[href*="ap.org"]')
];

if (apNewsLinks.length > 0) {
  console.log(`Found ${apNewsLinks.length} AP News links`);
  
  apNewsLinks.forEach(link => {
    const resultElement = findParentResultElement(link);
    if (resultElement && !resultElement.querySelector('.infodemic-indicator')) {
      console.log('Processing AP News link');
      
      const apBiasData = {
        bias: 'center',
        reliability: 'high',
        name: 'Associated Press'
      };
      
      const indicator = createBiasIndicator(apBiasData);
      
      // Insert after the closest cite or link text
      const insertTarget = 
        resultElement.querySelector('cite') || 
        resultElement.querySelector('.VuuXrf') ||
        link;
        
      insertTarget.insertAdjacentElement('afterend', indicator);
    }
  });
}

// Helper function to find parent result element
function findParentResultElement(element) {
  let current = element;
  const maxLevels = 6;
  let level = 0;
  
  while (current && level < maxLevels) {
    if (
      current.classList.contains('g') ||
      current.classList.contains('srKDX') ||
      current.classList.contains('xpd') ||
      current.classList.contains('MjjYud') ||
      current.classList.contains('v7W49e') ||
      current.hasAttribute('data-hveid')
    ) {
      return current;
    }
    current = current.parentElement;
    level++;
  }
  
  return null;
}

// Add this function to your existing code
function processGoogleNewsResults() {
  console.log('Looking for Google News format results');
  
  // Try to find news blocks in various formats
  const newsContainers = [
    ...document.querySelectorAll('div.UDZeY'),
    ...document.querySelectorAll('div.WlydOe'),
    ...document.querySelectorAll('div[jscontroller="d0DtYd"]'),
    ...document.querySelectorAll('g-card'),
    ...document.querySelectorAll('div.kCrYT'),
    ...document.querySelectorAll('div.DBQmFf')
  ];
  
  console.log(`Found ${newsContainers.length} news containers`);
  
  // Process each news container
  for (const container of newsContainers) {
    // Skip if already processed
    if (container.querySelector('.infodemic-indicator')) continue;
    
    // Find all links in this container
    const links = container.querySelectorAll('a[href^="http"]');
    
    for (const link of links) {
      const url = link.href;
      if (!url || url.includes('google.com')) continue;
      
      console.log('Processing news link:', url);
      
      // Check URL against bias database
      chrome.runtime.sendMessage({ type: 'CHECK_URL', url }, (response) => {
        if (response && response.biasData && response.biasData.bias !== 'unknown') {
          console.log('Got bias data for news link:', url, response.biasData);
          
          // Create and insert bias indicator
          const indicator = createBiasIndicator(response.biasData);
          
          // Try to find source elements specific to news format
          const sourceElement = 
            container.querySelector('.CEMjEf') || 
            container.querySelector('.BNeawe.UPmit.AP7Wnd') ||
            container.querySelector('.UPmit') ||
            container.querySelector('.TVtOme') ||
            container.querySelector('span[role="text"]');
            
          if (sourceElement) {
            sourceElement.insertAdjacentElement('afterend', indicator);
          } else {
            // If no source element, insert after the link's text container
            const textContainer = link.querySelector('div') || link;
            textContainer.insertAdjacentElement('afterend', indicator);
          }
        }
      });
    }
  }
}

// Add this to your existing code (around line 629, after the findParentResultElement function)
document.addEventListener('DOMContentLoaded', () => {
  // Only run if extension is enabled
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
    if (response && response.settings && response.settings.enabled) {
      console.log('DOM fully loaded, running comprehensive scan');
      
      // Wait a bit for any async content to load
      setTimeout(() => {
        // Process in stages to ensure everything is caught
        
        // 1. Try normal search engine detection
        detectSearchEngine();
        
        // 2. Process Google News format if present
        processGoogleNewsResults();
        
        // 3. Direct processing of all links as a fallback
        const allLinks = document.querySelectorAll('a[href^="http"]:not([href*="google.com"]):not(:has(+ .infodemic-indicator))');
        processRawLinks(allLinks);
        
        // 4. Set up more aggressive mutation observer
        setupEnhancedMutationObserver();
      }, 1000);
    }
  });
});

// Function to setup a more aggressive mutation observer
function setupEnhancedMutationObserver() {
  // Create a more aggressive observer that watches for any link changes
  const linkObserver = new MutationObserver((mutations) => {
    // Check if new links were added
    const newLinks = [];
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          // For element nodes, look for links
          if (node.nodeType === 1) { // Element node
            // Check if this node is a link
            if (node.tagName === 'A' && node.href && node.href.startsWith('http') && !node.href.includes('google.com')) {
              newLinks.push(node);
            }
            
            // Check for links in this node
            const childLinks = node.querySelectorAll('a[href^="http"]:not([href*="google.com"])');
            if (childLinks.length > 0) {
              childLinks.forEach(link => newLinks.push(link));
            }
          }
        });
      }
    });
    
    if (newLinks.length > 0) {
      console.log(`Enhanced observer found ${newLinks.length} new links`);
      // Process these new links
      processRawLinks(newLinks);
    }
  });
  
  // Observe the entire document for any changes that might add links
  linkObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}
