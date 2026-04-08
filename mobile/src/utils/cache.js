// Module-level cache — persists during JS session (not reset when navigating between screens)
// Pattern from CLAUDE.md: prevents API re-ordering causing visual flicker on navigation
const _caches = {};

/**
 * Get cached data for a key
 * @param {string} key
 * @returns {any|undefined}
 */
export function getCache(key) {
  return _caches[key];
}

/**
 * Set cached data for a key
 * @param {string} key
 * @param {any} data
 */
export function setCache(key, data) {
  _caches[key] = data;
}

/**
 * Clear cached data for a key
 * @param {string} key
 */
export function clearCache(key) {
  delete _caches[key];
}

/**
 * Clear all cached data
 */
export function clearAllCaches() {
  Object.keys(_caches).forEach((k) => delete _caches[k]);
}

/**
 * Check if cache exists for a key
 * @param {string} key
 * @returns {boolean}
 */
export function hasCache(key) {
  return key in _caches;
}
