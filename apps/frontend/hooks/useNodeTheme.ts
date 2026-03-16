import { useMemo } from 'react';
import { NodeTheme } from '../types/nodeTheme';
import { getThemeFromColor, getThemeStyles } from '../theme/themeGenerator';

export interface UseNodeThemeResult {
    theme: NodeTheme;
    style: React.CSSProperties;
}

/**
 * Hook to resolve and memoize the current theme and CSS variable styles for a node.
 * @param color The base color name (e.g. 'blue-500')
 */
export function useNodeTheme(color?: string | null): UseNodeThemeResult {
    const theme = useMemo(() => getThemeFromColor(color), [color]);
    const style = useMemo(() => getThemeStyles(theme), [theme]);

    return { theme, style };
}
