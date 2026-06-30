import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ICONS = [
  "_file",
  "_folder",
  "_folder_open",
  "typescript",
  "typescript-react",
  "typescript-config",
  "javascript",
  "javascript-react",
  "json",
  "package-json",
  "rust",
  "cargo",
  "cargo-lock",
  "python",
  "go",
  "java",
  "c",
  "cpp",
  "php",
  "swift",
  "kotlin",
  "html",
  "css",
  "sass",
  "less",
  "vue",
  "svelte",
  "markdown",
  "text",
  "yaml",
  "xml",
  "bash",
  "image",
  "svg",
  "lock",
  "env",
  "lua",
  "toml",
];

const FLAVORS = ["mocha", "latte"] as const;
const BASE = "https://raw.githubusercontent.com/catppuccin/vscode-icons/main/icons";
const OUT = join(import.meta.dir, "../public/icons");

if (existsSync(join(OUT, "mocha", "_file.svg"))) {
  console.log("catppuccin icons already synced");
  process.exit(0);
}

for (const flavor of FLAVORS) {
  await mkdir(join(OUT, flavor), { recursive: true });
  for (const icon of ICONS) {
    const url = `${BASE}/${flavor}/${icon}.svg`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`skip ${flavor}/${icon} (${res.status})`);
      continue;
    }
    await writeFile(join(OUT, flavor, `${icon}.svg`), await res.text());
    process.stdout.write(`✓ ${flavor}/${icon}.svg\n`);
  }
}
