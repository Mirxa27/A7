import fetch from 'node-fetch';
import { CacheService } from './cache.js';
// IP Geolocation using ip-api.com (free, no key required for non-commercial)
export async function geolocateIP(ip) {
    const cacheKey = `ipgeo:${ip}`;
    const cached = CacheService.getOsint(cacheKey);
    if (cached)
        return { ...cached, _cached: true };
    try {
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,continent,continentCode,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,as,asname,reverse,mobile,proxy,hosting`);
        const data = await response.json();
        if (data.status === 'success') {
            CacheService.setOsint(cacheKey, data, 86400); // Cache for 24 hours
            return data;
        }
        throw new Error(data.message || 'IP geolocation failed');
    }
    catch (error) {
        console.error('IP geolocation error:', error);
        throw error;
    }
}
// Enhanced username search with more platforms
export async function searchUsernameEnhanced(username) {
    const cacheKey = `username:${username.toLowerCase()}`;
    const cached = CacheService.getOsint(cacheKey);
    if (cached)
        return { ...cached, _cached: true };
    const platforms = [
        // Social Media
        { name: 'GitHub', url: `https://github.com/${username}`, checkUrl: `https://api.github.com/users/${username}`, type: 'dev' },
        { name: 'Twitter/X', url: `https://twitter.com/${username}`, type: 'social' },
        { name: 'Instagram', url: `https://instagram.com/${username}`, type: 'social' },
        { name: 'LinkedIn', url: `https://linkedin.com/in/${username}`, type: 'professional' },
        { name: 'Facebook', url: `https://facebook.com/${username}`, type: 'social' },
        { name: 'TikTok', url: `https://tiktok.com/@${username}`, type: 'social' },
        { name: 'YouTube', url: `https://youtube.com/@${username}`, type: 'social' },
        { name: 'Reddit', url: `https://reddit.com/user/${username}`, type: 'forum' },
        { name: 'Pinterest', url: `https://pinterest.com/${username}`, type: 'social' },
        { name: 'Snapchat', url: `https://snapchat.com/add/${username}`, type: 'social' },
        // Developer Platforms
        { name: 'GitLab', url: `https://gitlab.com/${username}`, type: 'dev' },
        { name: 'Bitbucket', url: `https://bitbucket.org/${username}`, type: 'dev' },
        { name: 'StackOverflow', url: `https://stackoverflow.com/users/${username}`, type: 'dev' },
        { name: 'Dev.to', url: `https://dev.to/${username}`, type: 'dev' },
        { name: 'CodePen', url: `https://codepen.io/${username}`, type: 'dev' },
        { name: 'Replit', url: `https://replit.com/@${username}`, type: 'dev' },
        { name: 'HackerRank', url: `https://hackerrank.com/${username}`, type: 'dev' },
        { name: 'LeetCode', url: `https://leetcode.com/${username}`, type: 'dev' },
        // Forums & Communities
        { name: 'HackerNews', url: `https://news.ycombinator.com/user?id=${username}`, type: 'forum' },
        { name: 'Medium', url: `https://medium.com/@${username}`, type: 'blog' },
        { name: 'Quora', url: `https://quora.com/profile/${username}`, type: 'forum' },
        { name: 'Twitch', url: `https://twitch.tv/${username}`, type: 'streaming' },
        { name: 'Discord', url: `https://discord.com/users/${username}`, type: 'social' },
        { name: 'Telegram', url: `https://t.me/${username}`, type: 'messaging' },
        // Professional
        { name: 'AngelList', url: `https://angel.co/${username}`, type: 'professional' },
        { name: 'Behance', url: `https://behance.net/${username}`, type: 'creative' },
        { name: 'Dribbble', url: `https://dribbble.com/${username}`, type: 'creative' },
        { name: 'Fiverr', url: `https://fiverr.com/${username}`, type: 'freelance' },
        { name: 'Upwork', url: `https://upwork.com/freelancers/${username}`, type: 'freelance' },
        // Other
        { name: 'Spotify', url: `https://open.spotify.com/user/${username}`, type: 'music' },
        { name: 'SoundCloud', url: `https://soundcloud.com/${username}`, type: 'music' },
        { name: 'Vimeo', url: `https://vimeo.com/${username}`, type: 'video' },
        { name: 'Flickr', url: `https://flickr.com/people/${username}`, type: 'photo' },
        { name: 'Gravatar', url: `https://gravatar.com/${username}`, checkUrl: `https://en.gravatar.com/${username}.json`, type: 'profile' },
    ];
    const results = await Promise.allSettled(platforms.map(async (platform) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
            // Try HEAD request first
            let response = await fetch(platform.url, {
                method: 'HEAD',
                redirect: 'manual',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            // Check various success indicators
            const exists = response.status === 200 ||
                response.status === 301 ||
                response.status === 302 ||
                (response.status === 0 && platform.url.includes('instagram')); // Instagram blocks HEAD
            return {
                name: platform.name,
                url: platform.url,
                type: platform.type,
                exists,
                statusCode: response.status,
                checkedAt: new Date().toISOString()
            };
        }
        catch (error) {
            clearTimeout(timeoutId);
            return {
                name: platform.name,
                url: platform.url,
                type: platform.type,
                exists: false,
                error: error.name === 'AbortError' ? 'timeout' : 'request_failed',
                checkedAt: new Date().toISOString()
            };
        }
    }));
    const processed = results.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        }
        return {
            name: platforms[index].name,
            url: platforms[index].url,
            type: platforms[index].type,
            exists: false,
            error: 'promise_rejected',
            checkedAt: new Date().toISOString()
        };
    });
    const summary = {
        total: platforms.length,
        found: processed.filter(r => r.exists).length,
        byType: processed.reduce((acc, curr) => {
            if (curr.exists) {
                acc[curr.type] = (acc[curr.type] || 0) + 1;
            }
            return acc;
        }, {})
    };
    const result = {
        username,
        timestamp: new Date().toISOString(),
        platforms: processed,
        summary
    };
    CacheService.setOsint(cacheKey, result, 3600); // Cache for 1 hour
    return result;
}
// Email breach check using Have I Been Pwned (requires API key)
export async function checkEmailBreaches(email, apiKey) {
    if (!apiKey) {
        return {
            email,
            checked: false,
            message: 'HIBP API key not configured'
        };
    }
    const cacheKey = `breach:${email.toLowerCase()}`;
    const cached = CacheService.getOsint(cacheKey);
    if (cached)
        return { ...cached, _cached: true };
    try {
        const response = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`, {
            headers: {
                'hibp-api-key': apiKey,
                'User-Agent': 'Agent7-OSINT-Platform'
            }
        });
        if (response.status === 404) {
            const result = { email, breached: false, breaches: [] };
            CacheService.setOsint(cacheKey, result, 86400);
            return result;
        }
        if (!response.ok) {
            throw new Error(`HIBP API error: ${response.status}`);
        }
        const breaches = await response.json();
        const result = {
            email,
            breached: true,
            breachCount: breaches.length,
            breaches: breaches.map((b) => ({
                name: b.Name,
                title: b.Title,
                domain: b.Domain,
                breachDate: b.BreachDate,
                addedDate: b.AddedDate,
                description: b.Description,
                dataClasses: b.DataClasses,
                isVerified: b.IsVerified,
                isFabricated: b.IsFabricated,
                isSensitive: b.IsSensitive,
                isRetired: b.IsRetired,
                isSpamList: b.IsSpamList
            }))
        };
        CacheService.setOsint(cacheKey, result, 86400);
        return result;
    }
    catch (error) {
        console.error('Email breach check error:', error);
        return {
            email,
            checked: false,
            error: error.message
        };
    }
}
// Subdomain enumeration using crt.sh (Certificate Transparency)
export async function enumerateSubdomains(domain) {
    const cacheKey = `subdomains:${domain.toLowerCase()}`;
    const cached = CacheService.getOsint(cacheKey);
    if (cached)
        return { ...cached, _cached: true };
    try {
        const response = await fetch(`https://crt.sh/?q=%.${domain}&output=json`);
        if (!response.ok) {
            throw new Error('crt.sh API error');
        }
        const data = await response.json();
        // Extract unique subdomains
        const subdomains = [...new Set(data.map((entry) => entry.name_value)
                .filter((name) => name && name.endsWith(domain))
                .map((name) => name.trim().toLowerCase()))].sort();
        const result = {
            domain,
            timestamp: new Date().toISOString(),
            subdomains,
            count: subdomains.length,
            sources: ['Certificate Transparency (crt.sh)']
        };
        CacheService.setOsint(cacheKey, result, 21600); // Cache for 6 hours
        return result;
    }
    catch (error) {
        console.error('Subdomain enumeration error:', error);
        throw error;
    }
}
// SSL Certificate information
export async function getSSLInfo(domain) {
    const cacheKey = `ssl:${domain.toLowerCase()}`;
    const cached = CacheService.getOsint(cacheKey);
    if (cached)
        return { ...cached, _cached: true };
    try {
        // Using SSL Labs API (requires consideration of rate limits)
        const response = await fetch(`https://api.ssllabs.com/api/v3/analyze?host=${domain}&startNew=off&all=done`, {
            headers: {
                'User-Agent': 'Agent7-OSINT-Platform'
            }
        });
        if (!response.ok) {
            throw new Error('SSL Labs API error');
        }
        const data = await response.json();
        const result = {
            domain,
            timestamp: new Date().toISOString(),
            status: data.status,
            endpoints: data.endpoints?.map((ep) => ({
                ip: ep.ipAddress,
                grade: ep.grade,
                hasWarnings: ep.hasWarnings,
                isExceptional: ep.isExceptional,
                details: {
                    protocol: ep.details?.protocol,
                    cipher: ep.details?.cipher,
                    cert: {
                        subject: ep.details?.cert?.subject,
                        issuer: ep.details?.cert?.issuer,
                        validFrom: ep.details?.cert?.notBefore,
                        validTo: ep.details?.cert?.notAfter,
                        keyAlg: ep.details?.cert?.keyAlg,
                        keySize: ep.details?.cert?.keySize
                    }
                }
            })) || [],
            host: data.host,
            port: data.port
        };
        CacheService.setOsint(cacheKey, result, 21600); // Cache for 6 hours
        return result;
    }
    catch (error) {
        console.error('SSL info error:', error);
        return {
            domain,
            timestamp: new Date().toISOString(),
            error: error.message,
            note: 'SSL Labs API may be rate limited'
        };
    }
}
