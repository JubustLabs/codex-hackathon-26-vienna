// Shared palette — matches the app styles.css so the video and UI feel like one product.

export const theme = {
  bg: "#f2ead8",
  bgDeep: "#ebe0c7",
  bgInk: "#1a1710",
  panel: "#fffdf7",
  panelGlass: "rgba(255, 253, 247, 0.88)",
  ink: "#1f1a12",
  inkSoft: "#3d352a",
  muted: "#756b5b",
  muted2: "#8b8270",
  accent: "#b84a2d",
  accentDeep: "#8c3520",
  accentSoft: "#f1d2ba",
  accentGlow: "rgba(184, 74, 45, 0.45)",
  success: "#2a7a50",
  warn: "#b88223",
  danger: "#b43535",
  goal: "#3c6fb0",
  constraint: "#8c6b1f",
  option: "#6e4b9e",
  tradeoff: "#4a5968",
  risk: "#b43535",
  openQuestion: "#2a7a80",
  agreement: "#2a7a50",
  unresolved: "#c46a1e",
} as const;

export const font = {
  serif:
    "Fraunces, 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif",
  sans: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "'SF Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
} as const;
