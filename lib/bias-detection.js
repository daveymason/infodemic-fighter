// Enhanced bias detection module for Infodemic Fighter extension

/**
 * Bias detection algorithm
 * This module provides functions to detect political bias and reliability of websites
 */

// In-memory cache for previously checked URLs during the current session
const biasCache = new Map();

// Cache management constants
const CACHE_KEY_PREFIX = 'bias_domain_';
const CACHE_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Check URL against bias database
 * @param {string} url - The URL to check
 * @returns {Promise<Object>} Promise resolving to bias data for the URL
 */
async function checkUrlBias(url) {
  try {
    // Create a unique cache key from URL
    const domain = extractDomain(url);
    if (!domain) return getUnknownBiasData();
    
    // First check in-memory cache for fastest access
    const memCacheKey = url.toLowerCase();
    if (biasCache.has(memCacheKey)) {
      return biasCache.get(memCacheKey);
    }
    
    // Then check persistent cache in storage
    const storageResult = await checkStorageCache(domain);
    if (storageResult) {
      // Store in memory cache for future requests
      biasCache.set(memCacheKey, storageResult);
      return storageResult;
    }
    
    // If not in any cache, get from bias database
    const biasDatabase = await getBiasDatabase();
    
    // Direct domain match
    let result;
    if (biasDatabase[domain]) {
      result = biasDatabase[domain];
    } else {
      // Check for parent domain match
      const parentDomain = extractParentDomain(domain);
      if (parentDomain && biasDatabase[parentDomain]) {
        result = biasDatabase[parentDomain];
      } else {
        // Check for domain variants
        const domainVariants = generateDomainVariants(domain);
        for (const variant of domainVariants) {
          if (biasDatabase[variant]) {
            result = biasDatabase[variant];
            break;
          }
        }
      }
    }
    
    // If no match found, return unknown
    if (!result) {
      result = getUnknownBiasData(domain);
    }
    
    // Cache the result in both memory and chrome.storage
    biasCache.set(memCacheKey, result);
    await cacheInStorage(domain, result);
    
    return result;
  } catch (error) {
    console.error('Error checking URL bias:', error);
    return getUnknownBiasData();
  }
}

/**
 * Check if domain info exists in storage cache
 * @param {string} domain - Domain to check
 * @returns {Promise<Object|null>} Cached bias data or null if not found/expired
 */
async function checkStorageCache(domain) {
  return new Promise((resolve) => {
    const cacheKey = CACHE_KEY_PREFIX + domain;
    
    chrome.storage.local.get([cacheKey], (result) => {
      if (result && result[cacheKey]) {
        const cachedData = result[cacheKey];
        
        // Check if cache has expired
        if (cachedData.timestamp && Date.now() - cachedData.timestamp < CACHE_EXPIRY_TIME) {
          resolve(cachedData.data);
          return;
        }
        
        // If expired, remove from storage
        chrome.storage.local.remove([cacheKey]);
      }
      
      // No valid cache found
      resolve(null);
    });
  });
}

/**
 * Cache bias data in storage
 * @param {string} domain - Domain to cache
 * @param {Object} biasData - Bias data to cache
 * @returns {Promise<void>}
 */
async function cacheInStorage(domain, biasData) {
  return new Promise((resolve) => {
    const cacheKey = CACHE_KEY_PREFIX + domain;
    const cache = {
      [cacheKey]: {
        data: biasData,
        timestamp: Date.now()
      }
    };
    
    chrome.storage.local.set(cache, () => {
      resolve();
    });
  });
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
