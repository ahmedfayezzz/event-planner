/**
 * EventPilot Brand Colors
 * Shared constants for email templates, QR codes, and other branded assets
 */
export const BRAND = {
  // Primary: Midnight Blue
  primary: "#001421", // Midnight Blue (Pantone 296C)
  primaryDark: "#333F48", // Pantone 7546

  // Accent: Sand / Dune
  accent: "#B27F59", // Sand
  accentLight: "#CDA991", // Dune

  // Backgrounds
  background: "#FFFFFF", // Pearl
  cardBg: "#FFFFFF", // Clean white card
  footerBg: "#CDA991", // Dune

  // Text Colors
  textDark: "#000000", // Black
  textMuted: "#333F48", // Pantone 7546
  textLight: "#8C684A", // Dark Sand

  // Borders
  border: "#F2EFEA", // Soft pearl-tinted border
} as const;

export type BrandColors = typeof BRAND;
