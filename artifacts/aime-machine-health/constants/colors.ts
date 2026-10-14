/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  // "Workshop paper": warm off-white, graphite ink, one engineering-blue brand colour.
  light: {
    text: '#1A1D21',
    tint: '#1F3A5F',
    background: '#F4F1EA',
    foreground: '#1A1D21',
    card: '#FBFAF6',
    cardForeground: '#1A1D21',
    primary: '#1F3A5F',
    primaryForeground: '#FFFFFF',
    secondary: '#E8E4D9',
    secondaryForeground: '#2A2F36',
    muted: '#EDE9DE',
    mutedForeground: '#6A6A62',
    accent: '#E6ECF4',
    accentForeground: '#1F3A5F',
    destructive: '#B3372E',
    destructiveForeground: '#FFFFFF',
    border: '#D9D4C5',
    input: '#BDB8A8',
    success: '#2F7A4F',
    warning: '#A8620A',
    critical: '#B3372E',
    info: '#35608F',
    marker: '#F2B705',
  },

  dark: {
    text: '#ECE9E1',
    tint: '#8FB3E8',
    background: '#101316',
    foreground: '#ECE9E1',
    card: '#181C20',
    cardForeground: '#ECE9E1',
    primary: '#8FB3E8',
    primaryForeground: '#0E1620',
    secondary: '#232930',
    secondaryForeground: '#E3E0D6',
    muted: '#1E2329',
    mutedForeground: '#9A9A90',
    accent: '#1E2A3A',
    accentForeground: '#BBD3F3',
    destructive: '#F08379',
    destructiveForeground: '#220E0C',
    border: '#2C3238',
    input: '#3B424A',
    success: '#6FC592',
    warning: '#E8B05A',
    critical: '#F08379',
    info: '#8DB5E2',
    marker: '#F2B705',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 10,
};

export default colors;
