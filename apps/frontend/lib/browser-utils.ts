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
 */
export const detectNodeType = (url: string): string => {
    const lowerUrl = url.toLowerCase();

    // Shopping sites
    if (lowerUrl.includes('amazon.') || lowerUrl.includes('ebay.') ||
        lowerUrl.includes('shop') || lowerUrl.includes('product') ||
        lowerUrl.includes('buy') || lowerUrl.includes('store')) {
        return 'product';
    }

    // Video sites
    if (lowerUrl.includes('youtube.') || lowerUrl.includes('vimeo.') ||
        lowerUrl.includes('video') || lowerUrl.includes('watch')) {
        return 'video';
    }

    // Developer/Code sites
    if (lowerUrl.includes('stackoverflow.') || lowerUrl.includes('github.') ||
        lowerUrl.includes('gitlab.') || lowerUrl.includes('docs.') ||
        lowerUrl.includes('developer.') || lowerUrl.includes('api.')) {
        return 'code';
    }

    // Academic sites
    if (lowerUrl.includes('scholar.') || lowerUrl.includes('arxiv.') ||
        lowerUrl.includes('journal') || lowerUrl.includes('research') ||
        lowerUrl.includes('academic') || lowerUrl.includes('.edu')) {
        return 'academic';
    }

    // Default to article
    return 'article';
};
