import { ipc } from "@jelly/ipc";
import type { ExtensionContext, GitStatus } from "@jelly/sdk";
import { refreshGitStatus } from "./refresh";
import { useGitStore } from "./store";

const HEAVY_DIRS = [
  "node_modules",
  "target",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  "__pycache__",
  ".venv",
  "venv",
  "vendor",
];

const SUPPRESS_KEY = "git.ignoreWarning.suppressed";

function suppressed(ctx: ExtensionContext): Record<string, true> {
  return ctx.settings.get<Record<string, true>>(SUPPRESS_KEY) ?? {};
}

function heavyUntrackedDirs(status: GitStatus): string[] {
  const found = new Set<string>();
  for (const file of status.untracked) {
    const top = file.path.split("/")[0];
    if (HEAVY_DIRS.includes(top)) found.add(top);
  }
  return [...found];
}

async function appendToGitignore(workspace: string, dirs: string[]): Promise<void> {
  const path = `${workspace}/.gitignore`;
  let current = "";
  try {
    current = await ipc.fs.read(path);
  } catch {
    current = "";
  }
  const existing = new Set(current.split(/\r?\n/).map((line) => line.trim()));
  const toAdd = dirs.filter((d) => !existing.has(d) && !existing.has(`${d}/`));
  if (toAdd.length === 0) return;

  const prefix = current.length > 0 && !current.endsWith("\n") ? "\n" : "";
  await ipc.fs.save(path, `${current}${prefix}${toAdd.join("\n")}\n`);
}

/**
 * Returns a checker (run after each status refresh) that warns once per
 * workspace when heavy untracked dirs like `node_modules` are present, offering
 * to add them to `.gitignore`. Honors a persisted per-workspace dismissal.
 */
export function createIgnoreWarningChecker(ctx: ExtensionContext): () => void {
  const promptedThisSession = new Set<string>();

  return () => {
    const { workspacePath, untracked, isRepo } = useGitStore.getState();
    if (!workspacePath || !isRepo) return;
    if (promptedThisSession.has(workspacePath) || suppressed(ctx)[workspacePath]) return;

    const dirs = heavyUntrackedDirs({ untracked } as GitStatus);
    if (dirs.length === 0) return;

    promptedThisSession.add(workspacePath);
    const workspace = workspacePath;
    const quoted = dirs.map((d) => `"${d}"`).join(", ");

    ctx.notifications.warn(
      `This repository has many untracked files in ${quoted}. Add ${dirs.length > 1 ? "them" : "it"} to .gitignore to keep Git fast?`,
      {
        source: "Git",
        actions: [
          {
            label: "Add to .gitignore",
            variant: "primary",
            run: async () => {
              await appendToGitignore(workspace, dirs);
              refreshGitStatus();
              void ctx.commands.execute("files.refresh");
            },
          },
          { label: "Not Now" },
          {
            label: "Don't Show Again",
            run: () => {
              ctx.settings.set(SUPPRESS_KEY, { ...suppressed(ctx), [workspace]: true });
            },
          },
        ],
      },
    );
  };
}
