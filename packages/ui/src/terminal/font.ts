// Terminal font stack. We prefer a Nerd Font (for powerline/icon glyphs) and
// fall back to JetBrains Mono, then a generic monospace.
//
// Rather than detect installed fonts (unreliable: Nerd Font "Mono" variants
// share the same advance width as the system monospace, so width-probing gives
// false negatives), we list the candidates directly in the CSS font-family.
// The browser ignores any that aren't installed, uses the first one present for
// text, and — because xterm's DOM renderer does per-glyph fallback — pulls icon
// glyphs from whichever listed Nerd Font has them.

// Mono (fixed-width) Nerd Font families, in priority order. The first installed
// one is used for terminal text. Add yours here if it's missing.
const NERD_FONTS = [
  "0xProto Nerd Font Mono",
  "JetBrainsMono Nerd Font Mono",
  "JetBrainsMono Nerd Font",
  "FiraCode Nerd Font Mono",
  "Hack Nerd Font Mono",
  "CaskaydiaCove Nerd Font Mono",
  "CaskaydiaMono Nerd Font",
  "MesloLGS Nerd Font Mono",
  "MesloLGS NF",
  "SauceCodePro Nerd Font Mono",
  "IosevkaTerm Nerd Font",
  "Iosevka Nerd Font Mono",
  "UbuntuMono Nerd Font",
  "RobotoMono Nerd Font Mono",
  "DejaVuSansMono Nerd Font Mono",
  "Terminess Nerd Font",
  "Hasklug Nerd Font Mono",
  "BlexMono Nerd Font Mono",
  "VictorMono Nerd Font Mono",
  "CommitMono Nerd Font",
  "GeistMono Nerd Font",
  "ZedMono Nerd Font",
];

// Glyph-only patch fonts — a last-resort source of icons when the text font
// isn't a Nerd Font.
const SYMBOL_FALLBACKS = ["Symbols Nerd Font Mono", "Symbols Nerd Font"];

const quote = (f: string) => `"${f}"`;

/** The terminal's font-family string: Nerd Fonts first, then JetBrains Mono,
 *  icon-only fallbacks, and a generic monospace. */
export function terminalFontFamily(): string {
  return [
    ...NERD_FONTS.map(quote),
    quote("JetBrains Mono"),
    ...SYMBOL_FALLBACKS.map(quote),
    "monospace",
  ].join(", ");
}
