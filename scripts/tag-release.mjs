// Release tagger. Run by CI (the changesets "publish" step) only after a
// "Version Packages" PR is merged, i.e. when no changesets remain. Reads the
// bumped desktop app version and pushes a `v<version>` tag, which triggers the
// build workflow (.github/workflows/build.yml).
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(
  readFileSync(new URL("../apps/desktop/package.json", import.meta.url), "utf8"),
);
const tag = `v${version}`;

const existing = execSync("git tag --list", { encoding: "utf8" })
  .split("\n")
  .map((t) => t.trim());

if (existing.includes(tag)) {
  console.log(`Tag ${tag} already exists — nothing to release.`);
  process.exit(0);
}

execSync(`git tag ${tag}`, { stdio: "inherit" });
execSync(`git push origin ${tag}`, { stdio: "inherit" });
console.log(`Pushed ${tag} — build workflow will publish the release.`);
