/**
 * Browser-related utilities for URL handling and smart navigation
 */

/**
 * Resolves a string input into a valid URL or search engine query.
 * @param input The user's input (URL or search term)
 * @returns A formatted URL string
 */
export const resolveUrl = (input: string): string => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return '';

    // If it already has a protocol, return as is
    if (trimmedInput.startsWith('http://') || trimmedInput.startsWith('https://')) {
        return trimmedInput;
    }

    // Check if it's localhost
    if (trimmedInput.startsWith('localhost')) {
        return 'http://' + trimmedInput;
    }

    // Check if it's a domain name (contains a dot and no spaces)
    const domainRegex = /^[\w-]+\.[a-z]{2,}/i;
    if (domainRegex.test(trimmedInput) && !trimmedInput.includes(' ')) {
        return 'https://' + trimmedInput;
    }

    // Default to Google search
    return `https://www.google.com/search?q=${encodeURIComponent(trimmedInput)}`;
};

/**
 * Extracts a search query from a search engine URL if possible.
 */
export const extractSearchQuery = (url: string): string | null => {
    try {
        const parsed = new URL(url);
        if ((parsed.hostname.includes('google.') || parsed.hostname.includes('bing.')) && 
            (parsed.pathname.includes('/search') || parsed.pathname.includes('search'))) {
            return parsed.searchParams.get('q');
        }
    } catch { }
    return null;
};

/**
 * Normalizes a URL for comparison or storage.
 */
export const normalizeUrl = (u: string) => {
    try {
        const parsed = new URL(u);
        if (parsed.pathname === '/' || parsed.pathname === '') {
            return parsed.hostname;
        }
        return u;
    } catch {
        return u;
    }
};

/**
 * Detects the type of content at a URL based on patterns.
 * Matches on hostname only for shopping/product sites to avoid false positives
 * (e.g. github.com/releases, brew.sh/formula/store would wrongly become 'product').
 */
export const detectNodeType = (url: string): string => {
    let hostname = '';
    try {
        hostname = new URL(url).hostname.toLowerCase();
    } catch {
        hostname = url.toLowerCase();
    }
    const _lowerUrl = url.toLowerCase();

    // Shopping sites — hostname-only to avoid path false-positives
    const shoppingDomains = ['amazon.', 'ebay.', 'etsy.', 'aliexpress.', 'walmart.', 'shopify.', 'shop.'];
    if (shoppingDomains.some(d => hostname.includes(d))) {
        return 'product';
    }

    // Video sites — hostname-only
    const videoDomains = ['youtube.', 'youtu.be', 'vimeo.', 'twitch.', 'dailymotion.', 'tiktok.'];
    if (videoDomains.some(d => hostname.includes(d))) {
        return 'video';
    }

    // Developer / code sites — hostname-only
    const codeDomains = [
        'stackoverflow.com', 'github.com', 'gitlab.com', 'npmjs.com',
        'pypi.org', 'crates.io', 'pkg.go.dev', 'developer.mozilla.org',
        'developer.apple.com', 'developer.android.com', 'docs.microsoft.com',
        'learn.microsoft.com', 'devdocs.io', 'jsfiddle.net', 'codepen.io',
    ];
    if (codeDomains.some(d => hostname.includes(d))) {
        return 'code';
    }
    // Also catch *.docs.* and docs.* subdomains
    if (hostname.startsWith('docs.') || hostname.startsWith('api.') || hostname.startsWith('developer.')) {
        return 'code';
    }

    // Academic sites — hostname only + .edu TLD
    const academicDomains = ['arxiv.org', 'scholar.google.', 'pubmed.ncbi.', 'semanticscholar.org',
        'researchgate.net', 'jstor.org', 'springer.com', 'nature.com', 'sciencedirect.com'];
    if (academicDomains.some(d => hostname.includes(d)) || hostname.endsWith('.edu')) {
        return 'academic';
    }

    // Default to article
    return 'article';
};
