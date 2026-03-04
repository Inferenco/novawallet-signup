import { TABLE_COLORS } from '../config/games';

export interface PokerTheme {
    backgroundGradient: [string, string, string];
    felt: string;
    rail: string;
    accent: string;
    accentGlow: string;
    accentGlass: string;
    accentGlassBorder: string;
    panelBg: string;
    panelBorder: string;
    surface: string;
    surfaceBorder: string;
    text: string;
    textSecondary: string;
    tableFeltLight: string;
}

/**
 * Derive a full UI theme from the table's color index.
 * Generates background gradients and surface colors that complement the felt.
 */
export function deriveThemeFromColor(colorIndex: number): PokerTheme {
    // Get base table colors
    const base = TABLE_COLORS[colorIndex] || TABLE_COLORS[0];

    // Helper to darken a hex color (very naive implementation for speed)
    // For a robust app we might use a library like 'color', but simple hex manipulation works for these specific darker tones
    const darken = (hex: string, amount: number): string => {
        let useHex = hex;
        if (hex.startsWith('#')) {
            useHex = hex.slice(1);
        }
        if (useHex.length === 3) {
            useHex = useHex.split('').map(c => c + c).join('');
        }

        const num = parseInt(useHex, 16);
        let r = (num >> 16);
        let g = ((num >> 8) & 0x00FF);
        let b = (num & 0x0000FF);

        r = Math.max(0, Math.min(255, r - amount));
        g = Math.max(0, Math.min(255, g - amount));
        b = Math.max(0, Math.min(255, b - amount));

        return `#${(b | (g << 8) | (r << 16)).toString(16).padStart(6, '0')}`;
    };

    // Helper to convert hex to rgba
    const hexToRgba = (hex: string, alpha: number): string => {
        let useHex = hex.replace('#', '');
        if (useHex.length === 3) {
            useHex = useHex.split('').map(c => c + c).join('');
        }
        const num = parseInt(useHex, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Construct the background gradient
    // Start: darker felt for a deeper background (moderate contrast)
    // End: Darker version of rail to blend into edges
    const bgStart = darken(base.felt, 20); // Was 10, now 20 (darker)
    const bgEnd = darken(base.rail, 15);   // Was 10, now 15 (darker)

    return {
        backgroundGradient: [bgStart, bgEnd, '#020202'], // Almost black bottom
        felt: base.felt,
        rail: base.rail,
        accent: base.accent,
        accentGlow: base.accent,
        accentGlass: hexToRgba(base.accent, 0.3),
        accentGlassBorder: hexToRgba(base.accent, 0.5),

        // Panel colors: "Dark Metallic" aesthetic
        // Use a very dark version of the rail (or just black with slight tint)
        panelBg: '#121212', // Standard dark material background, or could use darken(base.rail, 10)
        panelBorder: 'rgba(255, 255, 255, 0.1)', // Subtle "metallic" rim, not colored accent

        surface: 'rgba(20, 20, 30, 0.8)',
        surfaceBorder: base.accent,
        text: '#FFFFFF',
        textSecondary: 'rgba(255, 255, 255, 0.7)',

        // Table specific: Lighten the felt for the table surface to pop against the dark background
        tableFeltLight: darken(base.felt, -15), // Lighten by 15 (moderate light)
    };
}
