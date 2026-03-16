/**
 * Semantic theme colors for a canvas node.
 * Used for dynamic CSS variable injection.
 */
export interface NodeTheme {
    /** The main accent color (e.g., #ef4444) */
    primary: string;
    /** Subtle background tint with low opacity */
    background: string;
    /** Border color (usually primary with specific opacity) */
    border: string;
    /** Text color (tinted for better contrast) */
    text: string;
    /** Color for icons and active toolbar items */
    accent: string;
    /** Color used for selection/hover glow shadows */
    glow: string;
    /** Color for hover-state borders */
    hover: string;
}

export type ThemeColorName = 
    | 'red' 
    | 'orange' 
    | 'amber' 
    | 'green' 
    | 'emerald' 
    | 'teal' 
    | 'cyan' 
    | 'blue' 
    | 'indigo' 
    | 'violet' 
    | 'purple' 
    | 'fuchsia' 
    | 'pink' 
    | 'rose'
    | 'neutral';
