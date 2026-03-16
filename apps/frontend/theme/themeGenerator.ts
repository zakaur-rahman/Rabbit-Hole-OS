import { NodeTheme, ThemeColorName } from '../types/nodeTheme';
import { NODE_THEMES, DEFAULT_THEME } from './nodeThemes';

/**
 * Resolves a full theme object from a color name (Tailwind-style) or raw hex.
 * Currently supports mapping the 14 defined standard colors.
 */
export function getThemeFromColor(colorName?: string | null): NodeTheme {
    if (!colorName) return DEFAULT_THEME;

    // Clean up Tailwind classes like 'blue-500' to just 'blue'
    const name = colorName.split('-')[0].toLowerCase() as ThemeColorName;
    
    return NODE_THEMES[name] || DEFAULT_THEME;
}

/**
 * Generates a reactive style object for injection into a component's [style] prop.
 */
export function getThemeStyles(theme: NodeTheme): React.CSSProperties {
    return {
        '--node-primary': theme.primary,
        '--node-bg': theme.background,
        '--node-border': theme.border,
        '--node-text': theme.text,
        '--node-accent': theme.accent,
        '--node-glow': theme.glow,
        '--node-hover': theme.hover,
    } as React.CSSProperties;
}
