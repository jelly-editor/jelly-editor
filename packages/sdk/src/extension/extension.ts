import type { ExtensionContext } from "./context";
import type { ExtensionManifest } from "./manifest";

export interface Extension {
  manifest: ExtensionManifest;
  activate(ctx: ExtensionContext): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}
