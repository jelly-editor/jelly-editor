import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface ChangelogItem {
  scope?: string;
  message: string;
}

export interface ChangelogSection {
  title: string;
  items: ChangelogItem[];
}

export interface ChangelogRelease {
  version: string;
  date?: string;
  url?: string;
  sections: ChangelogSection[];
}

/**
 * Converts inline markdown backticks and links to clean HTML.
 */
function formatMessage(message: string): string {
  return message
    .replace(/`([^`]+)`/g, '<code class="rounded bg-surface-2 px-1 py-0.5 font-mono text-[11.5px] text-ink-muted">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-jelly-violet/90 hover:text-jelly-violet hover:underline transition-colors font-medium">$1</a>');
}

/**
 * Parses a single release body (the markdown text) into sections of categories and list items.
 */
export function parseReleaseBody(body: string): ChangelogSection[] {
  const lines = body.split("\n");
  const sections: ChangelogSection[] = [];
  let currentSection: ChangelogSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check category header e.g. ### Features, ### Bug Fixes
    const categoryMatch = line.match(/^###\s+(.+)$/);
    if (categoryMatch) {
      currentSection = {
        title: categoryMatch[1],
        items: [],
      };
      sections.push(currentSection);
      continue;
    }

    // Check item lists starting with * or - or +
    const itemMatch = line.match(/^[*+-]\s+(.*)$/);
    if (itemMatch) {
      const fullText = itemMatch[1];
      const scopeMatch = fullText.match(/^\*\*([^*]+):\*\*\s*(.*)$/);

      let item: ChangelogItem;
      if (scopeMatch) {
        item = {
          scope: scopeMatch[1],
          message: formatMessage(scopeMatch[2]),
        };
      } else {
        item = {
          message: formatMessage(fullText),
        };
      }

      if (currentSection) {
        currentSection.items.push(item);
      } else {
        // Fallback section if list items appear before a category header
        if (sections.length === 0) {
          currentSection = { title: "Changes", items: [] };
          sections.push(currentSection);
        }
        sections[0].items.push(item);
      }
    }
  }

  return sections;
}

/**
 * Parses the full CHANGELOG.md file into releases.
 */
export function parseChangelog(content: string): ChangelogRelease[] {
  const lines = content.split("\n");
  const releases: ChangelogRelease[] = [];
  let currentRelease: ChangelogRelease | null = null;
  let currentSection: ChangelogSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Matches e.g. ## [0.1.3](url) (2026-06-27) or ## 0.1.3 (2026-06-27) or ## [0.1.3] (2026-06-27)
    const versionMatch = line.match(/^##\s+\[?([0-9a-zA-Z.-]+)\]?(?:\(([^)]+)\))?\s*(?:\(([^)]+)\))?/);
    if (versionMatch) {
      currentRelease = {
        version: versionMatch[1],
        url: versionMatch[2],
        date: versionMatch[3],
        sections: [],
      };
      releases.push(currentRelease);
      currentSection = null;
      continue;
    }

    if (!currentRelease) continue;

    // Matches e.g. ### Features
    const categoryMatch = line.match(/^###\s+(.+)$/);
    if (categoryMatch) {
      currentSection = {
        title: categoryMatch[1],
        items: [],
      };
      currentRelease.sections.push(currentSection);
      continue;
    }

    // Matches list items
    const itemMatch = line.match(/^[*+-]\s+(.*)$/);
    if (itemMatch) {
      const fullText = itemMatch[1];
      const scopeMatch = fullText.match(/^\*\*([^*]+):\*\*\s*(.*)$/);

      let item: ChangelogItem;
      if (scopeMatch) {
        item = {
          scope: scopeMatch[1],
          message: formatMessage(scopeMatch[2]),
        };
      } else {
        item = {
          message: formatMessage(fullText),
        };
      }

      if (currentSection) {
        currentSection.items.push(item);
      } else {
        if (currentRelease.sections.length === 0) {
          currentSection = { title: "Changes", items: [] };
          currentRelease.sections.push(currentSection);
        }
        currentRelease.sections[0].items.push(item);
      }
    }
  }

  return releases;
}

export interface ChangelogResponse {
  releases: ChangelogRelease[];
  hasMore: boolean;
}

/**
 * Fetches the releases from GitHub API with local CHANGELOG.md as fallback.
 * Limits the results to the top 20 releases and returns if there are more.
 */
export async function getChangelog(): Promise<ChangelogResponse> {
  try {
    const res = await fetch("https://api.github.com/repos/jelly-editor/jelly-editor/releases?per_page=21", {
      headers: {
        "User-Agent": "jelly-website-builder",
        Accept: "application/vnd.github+json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const hasMore = data.length > 20;
        const limitedData = data.slice(0, 20);
        const releases = limitedData.map((release: any) => {
          const version = release.tag_name.replace(/^v/, "");
          const date = release.published_at ? release.published_at.slice(0, 10) : "";
          return {
            version,
            date,
            url: release.html_url,
            sections: parseReleaseBody(release.body || ""),
          };
        });
        return { releases, hasMore };
      }
    }
    console.warn("GitHub Releases API returned non-OK status:", res.status);
  } catch (err) {
    console.error("Failed to fetch changelog from GitHub, falling back to local file:", err);
  }

  // Fallback: Read local CHANGELOG.md
  try {
    const pathsToTry = [
      path.resolve(process.cwd(), "../../CHANGELOG.md"),
      path.resolve(process.cwd(), "CHANGELOG.md"),
    ];

    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      pathsToTry.push(path.resolve(__dirname, "../../../../CHANGELOG.md"));
    } catch {}

    for (const localPath of pathsToTry) {
      if (fs.existsSync(localPath)) {
        const content = fs.readFileSync(localPath, "utf-8");
        const parsed = parseChangelog(content);
        const hasMore = parsed.length > 20;
        const releases = parsed.slice(0, 20);
        return { releases, hasMore };
      }
    }
  } catch (err) {
    console.error("Failed to read local CHANGELOG.md fallback:", err);
  }

  return { releases: [], hasMore: false };
}
