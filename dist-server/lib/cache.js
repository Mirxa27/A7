import NodeCache from 'node-cache';
// Cache configuration
const osintCache = new NodeCache({
    stdTTL: 3600, // 1 hour default TTL
    checkperiod: 600, // Check for expired keys every 10 minutes
    useClones: false
});
const aiCache = new NodeCache({
    stdTTL: 1800, // 30 minutes for AI responses
    checkperiod: 300,
    useClones: false
});
export class CacheService {
    // OSINT caching
    static getOsint(key) {
        return osintCache.get(key);
    }
    static setOsint(key, value, ttl = 3600) {
        osintCache.set(key, value, ttl);
    }
    static deleteOsint(key) {
        osintCache.del(key);
    }
    static flushOsint() {
        osintCache.flushAll();
    }
    // AI response caching
    static getAI(key) {
        return aiCache.get(key);
    }
    static setAI(key, value, ttl = 1800) {
        aiCache.set(key, value, ttl);
    }
    // Generic cache methods
    static get(key, type = 'osint') {
        return type === 'osint' ? osintCache.get(key) : aiCache.get(key);
    }
    static set(key, value, type = 'osint', ttl) {
        if (type === 'osint') {
            osintCache.set(key, value, ttl || 3600);
        }
        else {
            aiCache.set(key, value, ttl || 1800);
        }
    }
    // Cache statistics
    static getStats() {
        return {
            osint: osintCache.getStats(),
            ai: aiCache.getStats()
        };
    }
    // Generate cache key from request
    static generateKey(prefix, params) {
        const sortedParams = Object.keys(params)
            .sort()
            .map(k => `${k}=${params[k]}`)
            .join('&');
        return `${prefix}:${Buffer.from(sortedParams).toString('base64')}`;
    }
    // Decorator for caching function results
    static withCache(type, keyGenerator, ttl) {
        return function (target, propertyKey, descriptor) {
            const originalMethod = descriptor.value;
            descriptor.value = async function (...args) {
                const cacheKey = keyGenerator(...args);
                const cached = CacheService.get(cacheKey, type);
                if (cached !== undefined) {
                    console.log(`[CACHE] Hit for ${propertyKey}: ${cacheKey}`);
                    return { ...cached, _cached: true, _cachedAt: new Date().toISOString() };
                }
                console.log(`[CACHE] Miss for ${propertyKey}: ${cacheKey}`);
                const result = await originalMethod.apply(this, args);
                CacheService.set(cacheKey, result, type, ttl);
                return result;
            };
            return descriptor;
        };
    }
}
// Export cache instances for direct access
export { osintCache, aiCache };
