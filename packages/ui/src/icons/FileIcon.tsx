import { useTheme } from "../hooks/useTheme";

interface Props {
  name: string;
  isDir: boolean;
  isOpen?: boolean;
}

const EXT_ICON: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript-react",
  js: "javascript",
  jsx: "javascript-react",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  rs: "rust",
  toml: "toml",
  py: "python",
  go: "go",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  cs: "_file",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  html: "html",
  css: "css",
  scss: "sass",
  sass: "sass",
  less: "less",
  vue: "vue",
  svelte: "svelte",
  md: "markdown",
  mdx: "markdown",
  txt: "text",
  yml: "yaml",
  yaml: "yaml",
  xml: "xml",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "bash",
  lua: "lua",
  svg: "svg",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  ico: "image",
  lock: "lock",
  env: "env",
};

const FILENAME_ICON: Record<string, string> = {
  "package.json": "package-json",
  "tsconfig.json": "typescript-config",
  "cargo.toml": "cargo",
  "cargo.lock": "cargo-lock",
  "readme.md": "markdown",
  "license": "text",
};

function iconFor(name: string): string {
  const lower = name.toLowerCase();
  if (lower in FILENAME_ICON) return FILENAME_ICON[lower];
  const ext = lower.includes(".") ? lower.split(".").pop()! : "";
  return EXT_ICON[ext] ?? "_file";
}

export function FileIcon({ name, isDir, isOpen = false }: Props) {
  const theme = useTheme();
  const flavor = theme === "light" ? "latte" : "mocha";
  const icon = isDir ? (isOpen ? "_folder_open" : "_folder") : iconFor(name);
  return (
    <span className="flex items-center justify-center w-[15px] h-[15px] shrink-0">
      <img src={`/icons/${flavor}/${icon}.svg`} width={15} height={15} alt="" />
    </span>
  );
}
