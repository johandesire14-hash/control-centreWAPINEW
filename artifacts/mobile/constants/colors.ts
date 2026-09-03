/**
 * Semantic design tokens — WapiGarage
 * Style: clean, modern, minimal (inspired by premium automotive apps)
 * Primary green kept, warm beige replaced with clean neutral grays.
 */

const colors = {
  light: {
    // Legacy aliases
    text: "#1C1C1E",
    tint: "#1D7159",

    // Core surfaces
    background: "#F2F3F5",
    foreground: "#1C1C1E",

    // Cards / elevated surfaces
    card: "#FFFFFF",
    cardForeground: "#1C1C1E",

    // Primary action color (buttons, links, active states)
    primary: "#1D7159",
    primaryForeground: "#FFFFFF",

    // Secondary / less-emphasis interactive surfaces
    secondary: "#EBEBF0",
    secondaryForeground: "#1C1C1E",

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: "#EBEBF0",
    // 5.0:1+ on the light background for readable small text.
    mutedForeground: "#6B6B70",

    // Accent highlights (stars, badges)
    accent: "#E4B93A",
    accentForeground: "#1C1C1E",

    // Destructive actions
    destructive: "#FF3B30",
    destructiveForeground: "#FFFFFF",

    // Borders and input outlines
    border: "#E5E5EA",
    input: "#EBEBF0",

    // Extra semantic tokens
    success: "#1D7159",
    // Darkened for text use; accent remains available for filled highlights.
    warning: "#8A6200",

    // Tab bar (dark floating pill)
    tabBar: "#1C1C1E",
    tabBarActive: "#FFFFFF",
    tabBarInactive: "#B0B0B5",
  },

  dark: {
    text: "#FFFFFF",
    tint: "#34a17a",
    background: "#0A0A0A",
    foreground: "#FFFFFF",
    card: "#1C1C1E",
    cardForeground: "#FFFFFF",
    primary: "#34a17a",
    primaryForeground: "#0A0A0A",
    secondary: "#2C2C2E",
    secondaryForeground: "#FFFFFF",
    muted: "#2C2C2E",
    accent: "#E4B93A",
    accentForeground: "#1C1C1E",
    destructive: "#FF453A",
    destructiveForeground: "#FFFFFF",
    border: "#38383A",
    input: "#2C2C2E",
    success: "#34a17a",
    // High-contrast secondary text on the dark background.
    mutedForeground: "#B0B0B5",
    warning: "#F2C94C",
    tabBar: "#1C1C1E",
    tabBarActive: "#FFFFFF",
    tabBarInactive: "#B0B0B5",
  },

  radius: 20,
  radiusSm: 14,
};

export default colors;
