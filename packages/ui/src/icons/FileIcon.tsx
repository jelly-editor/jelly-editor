// A curated, lightweight file-icon set in the spirit of vscode-material-icon-theme.
// Each file type maps to a tint; a handful of well-known files get a dedicated
// glyph. Kept inline (no asset bundle) to stay light for a minimal editor.

interface Props {
  name: string;
  isDir: boolean;
  isOpen?: boolean;
}

const EXT_COLOR: Record<string, string> = {
  ts: "#3178c6",
  tsx: "#3178c6",
  js: "#f1dd3f",
  jsx: "#f1dd3f",
  mjs: "#f1dd3f",
  cjs: "#f1dd3f",
  json: "#cbcb41",
  rs: "#dea584",
  toml: "#9c4221",
  py: "#3572a5",
  go: "#00add8",
  rb: "#cc342d",
  java: "#b07219",
  c: "#555555",
  h: "#555555",
  cpp: "#f34b7d",
  cs: "#178600",
  php: "#4f5d95",
  swift: "#f05138",
  kt: "#a97bff",
  html: "#e34c26",
  css: "#563d7c",
  scss: "#c6538c",
  sass: "#c6538c",
  less: "#1d365d",
  vue: "#41b883",
  svelte: "#ff3e00",
  md: "#7aa2f7",
  mdx: "#7aa2f7",
  txt: "#9aa0a6",
  yml: "#cb171e",
  yaml: "#cb171e",
  xml: "#f1662a",
  sh: "#89e051",
  bash: "#89e051",
  zsh: "#89e051",
  fish: "#89e051",
  sql: "#e38c00",
  png: "#a074c4",
  jpg: "#a074c4",
  jpeg: "#a074c4",
  gif: "#a074c4",
  svg: "#ffb13b",
  webp: "#a074c4",
  ico: "#a074c4",
  lock: "#8a8a8a",
  env: "#e8d44d",
};

// Files matched by exact (lowercased) name rather than extension.
const FILENAME_COLOR: Record<string, string> = {
  "package.json": "#8bc34a",
  "tsconfig.json": "#3178c6",
  "cargo.toml": "#dea584",
  "cargo.lock": "#8a8a8a",
  ".gitignore": "#f54d27",
  dockerfile: "#2496ed",
  "readme.md": "#42a5f5",
  "license": "#cbcb41",
};

function colorFor(name: string): string {
  const lower = name.toLowerCase();
  if (lower in FILENAME_COLOR) return FILENAME_COLOR[lower];
  const ext = lower.includes(".") ? lower.split(".").pop()! : "";
  return EXT_COLOR[ext] ?? "var(--color-text-muted)";
}

function FolderIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {isOpen ? (
        <path d="M3 8a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2H7a2 2 0 0 0-1.94 1.515L3.5 18" />
      ) : (
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      )}
    </svg>
  );
}

function DocIcon({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
    </svg>
  );
}

export function FileIcon({ name, isDir, isOpen = false }: Props) {
  return (
    <span className="flex items-center justify-center w-[15px] h-[15px] shrink-0">
      {isDir ? <FolderIcon isOpen={isOpen} /> : <DocIcon color={colorFor(name)} />}
    </span>
  );
}
