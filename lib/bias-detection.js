// Enhanced bias detection module for Infodemic Fighter extension

/**
 * Bias detection algorithm
 * This module provides functions to detect political bias and reliability of websites
 */

// Cache for previously checked URLs
const biasCache = new Map();

/**
 * Check URL against bias database
 * @param {string} url - The URL to check
 * @returns {Promise<Object>} Promise resolving to bias data for the URL
 */
async function checkUrlBias(url) {
  try {
    // Check cache first
    const cacheKey = url.toLowerCase();
    if (biasCache.has(cacheKey)) {
      return biasCache.get(cacheKey);
    }
    
    // Extract domain from URL
    const domain = extractDomain(url);
    if (!domain) return getUnknownBiasData();
    
    // Get bias database
    const biasDatabase = await getBiasDatabase();
    
    // Direct domain match
    if (biasDatabase[domain]) {
      const result = biasDatabase[domain];
      biasCache.set(cacheKey, result);
      return result;
    }
    
    // Check for parent domain match (e.g., subdomain.example.com -> example.com)
    const parentDomain = extractParentDomain(domain);
    if (parentDomain && biasDatabase[parentDomain]) {
      const result = biasDatabase[parentDomain];
      biasCache.set(cacheKey, result);
      return result;
    }
    
    // Check for domain variants (e.g., example.com vs example.co.uk)
    const domainVariants = generateDomainVariants(domain);
    for (const variant of domainVariants) {
      if (biasDatabase[variant]) {
        const result = biasDatabase[variant];
        biasCache.set(cacheKey, result);
        return result;
      }
    }
    
    // Return unknown if not found
    const unknownResult = getUnknownBiasData(domain);
    biasCache.set(cacheKey, unknownResult);
    return unknownResult;
  } catch (error) {
    console.error('Error checking URL bias:', error);
    return getUnknownBiasData();
  }
}

/**
 * Extract domain from a URL
 * @param {string} url - The URL to extract domain from
 * @returns {string} The domain name
 */
function extractDomain(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.replace('www.', '');
  } catch (error) {
    console.error('Error extracting domain:', error);
    return '';
  }
}

/**
 * Extract parent domain from a domain
 * @param {string} domain - The domain to extract parent from
 * @returns {string|null} The parent domain or null if no parent
 */
function extractParentDomain(domain) {
  // Split domain by dots
  const parts = domain.split('.');
  
  // If domain has less than 3 parts, it's already a parent domain
  if (parts.length < 3) {
    return null;
  }
  
  // Join all parts except the first one
  return parts.slice(1).join('.');
}

/**
 * Generate domain variants to check
 * @param {string} domain - The domain to generate variants for
 * @returns {Array<string>} Array of domain variants
 */
function generateDomainVariants(domain) {
  // For simplicity, just check common variations
  // This could be expanded with more sophisticated logic
  const variants = [];
  
  // Remove subdomains
  const parts = domain.split('.');
  if (parts.length > 2) {
    variants.push(parts.slice(-2).join('.'));
  }
  
  // Check common international variants
  if (domain.includes('.co.')) {
    variants.push(domain.replace('.co.', '.com'));
  }
  
  return variants;
}

/**
 * Get bias database from local storage or fetch from file
 * @returns {Promise<Object>} Promise resolving to bias database
 */
async function getBiasDatabase() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['biasDatabase', 'lastUpdated'], (result) => {
      // If database exists and was updated in the last 24 hours, use it
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      if (result.biasDatabase && result.lastUpdated && (now - result.lastUpdated < oneDayMs)) {
        resolve(result.biasDatabase);
      } else {
        // Otherwise fetch from local data file
        fetch(chrome.runtime.getURL('data/media-bias-data.json'))
          .then(response => response.json())
          .then(data => {
            // Store in local storage for future use
            chrome.storage.local.set({
              biasDatabase: data.mediaBiasData,
              lastUpdated: now
            });
            resolve(data.mediaBiasData);
          })
          .catch(error => {
            console.error('Error fetching bias database:', error);
            // Return empty database if fetch fails
            resolve({});
          });
      }
    });
  });
}

/**
 * Get unknown bias data object
 * @param {string} domain - Optional domain name
 * @returns {Object} Unknown bias data
 */
function getUnknownBiasData(domain = 'unknown') {
  return {
    bias: 'unknown',
    reliability: 'unknown',
    name: domain
  };
}
