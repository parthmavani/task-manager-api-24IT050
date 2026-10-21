const NodeCache = require('node-cache');

/**
 * Shared NodeCache instance for In-Memory Caching (Practical 9)
 * - stdTTL: Standard time-to-live in seconds (60s)
 * - checkperiod: Automatic delete check period for expired elements (120s)
 */
const cache = new NodeCache({
  stdTTL: 60,
  checkperiod: 120,
  useClones: true // prevent mutations to objects directly in memory
});

module.exports = cache;
