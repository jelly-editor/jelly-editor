import type { Disposable, Extension, ExtensionContext, IpcClient } from "@jelly/sdk";
import { CommandBus } from "../registries/commands";
import { ContextKeyStore } from "../registries/context-keys";
import { Emitter } from "../registries/events";
import { KeybindingStore } from "../registries/keybindings";
import { PaletteStore } from "../registries/palette";
import { SettingsStore } from "../registries/settings";
import { KeyDispatcher } from "./key-dispatch";
import { ActivityBarStore } from "../ui/activity-bar-store";
import { DialogStore } from "../ui/dialog-store";
import { KernelUIRegistry } from "../ui/registry";
import { SlotStore } from "../ui/slot-store";
import { Workbench } from "../ui/workbench";
import { createStubIpc } from "../ipc/stub";
import { createExtensionContext } from "./context";
import { disposeAll } from "./disposable";

export interface KernelOptions {
  /** The real bridge to the Rust core. Defaults to a stub that rejects all calls. */
  ipc?: IpcClient;
}

type Status = "loaded" | "active";

interface Registration {
  extension: Extension;
  status: Status;
  context?: ExtensionContext;
}

/**
 * The host machinery: a registry + command/event buses + the slot system +
 * extension lifecycle. Built-in and (future) runtime extensions both load
 * through here.
 */
export class Kernel {
  readonly commands = new CommandBus();
  readonly events = new Emitter();
  readonly slots = new SlotStore();
  readonly activityBar = new ActivityBarStore();
  readonly workbench = new Workbench();
  readonly ui = new KernelUIRegistry(this.slots, this.activityBar);
  readonly dialog = new DialogStore();
  readonly settings = new SettingsStore();
  readonly keybindings = new KeybindingStore();
  readonly palette = new PaletteStore();
  readonly contextKeys = new ContextKeyStore();
  readonly ipc: IpcClient;

  private registrations = new Map<string, Registration>();

  constructor(options: KernelOptions = {}) {
    this.ipc = options.ipc ?? createStubIpc();
    // The workbench flips between the welcome surface and the editor in
    // response to core workspace events — extensions only emit; they never
    // toggle the layout directly.
    this.events.on("workspace:opened", () => this.workbench.setWorkspaceOpen(true));
    this.events.on("workspace:closed", () => this.workbench.setWorkspaceOpen(false));

    // Mirror layout state into context keys so keybindings can gate on it
    // (e.g. ⌘S / ⌘W only act when a workspace/editor is open).
    this.contextKeys.set("workspaceOpen", this.workbench.getState().workspaceOpen);
    this.workbench.subscribe(() =>
      this.contextKeys.set("workspaceOpen", this.workbench.getState().workspaceOpen),
    );

    // Core commands for driving the workbench layout (used by status-bar items,
    // menus, etc. that want to reveal a panel without owning the layout).
    this.commands.seedDescriptors([
      { id: "workbench.togglePanel", title: "Toggle Panel", palette: false },
      { id: "workbench.showPanel", title: "Show Panel", palette: false },
    ]);
    this.commands.register("workbench.togglePanel", (id?: string) =>
      this.workbench.togglePanel(id),
    );
    this.commands.register("workbench.showPanel", (id?: string) =>
      this.workbench.setActivePanel(id ?? this.workbench.getState().activePanelId ?? "files"),
    );
  }

  /** Register an extension without activating it. */
  load(extension: Extension): void {
    const { id } = extension.manifest;
    if (this.registrations.has(id)) {
      throw new Error(`[kernel] extension already loaded: "${id}"`);
    }
    this.registrations.set(id, { extension, status: "loaded" });
  }

  /** Activate a loaded extension. Idempotent — activating twice is a no-op. */
  async activate(id: string): Promise<void> {
    const reg = this.registrations.get(id);
    if (!reg) throw new Error(`[kernel] cannot activate unknown extension: "${id}"`);
    if (reg.status === "active") return; // double-activate guard

    const ctx = createExtensionContext(this, reg.extension);
    // Seed command titles from manifest so list() works even before the
    // extension registers its handlers.
    const contributes = reg.extension.manifest.contributes;
    this.commands.seedDescriptors(contributes?.commands ?? []);
    // Register declared keybindings into the central store, tracked on the
    // extension's subscriptions so they're removed on deactivate.
    for (const kb of contributes?.keybindings ?? []) {
      ctx.subscriptions.push(this.keybindings.add(kb));
    }
    // mark active before awaiting so a re-entrant activate() can't slip through
    reg.status = "active";
    reg.context = ctx;
    await reg.extension.activate(ctx);
  }

  /** Tear an extension down: run its deactivate, then dispose its subscriptions. */
  async deactivate(id: string): Promise<void> {
    const reg = this.registrations.get(id);
    if (!reg || reg.status !== "active") return;
    try {
      await reg.extension.deactivate?.();
    } finally {
      if (reg.context) disposeAll(reg.context.subscriptions);
      reg.context = undefined;
      reg.status = "loaded";
    }
  }

  /**
   * Load persisted settings from disk and wire up write-through persistence.
   * Must be called before loadAll so extensions see saved values on first get().
   */
  async init(): Promise<void> {
    const saved = await this.ipc.settings.load().catch(() => ({} as Record<string, unknown>));
    this.settings.hydrate(saved);
    this.settings.setPersistHook((key, value) => {
      void this.ipc.settings.save(key, value);
    });

    // User keybinding overrides overlay manifest defaults. They reference
    // commands by id (not the not-yet-registered default entries), so loading
    // them here — before extensions activate — is safe.
    const overrides = await this.ipc.keybindings
      .load()
      .catch(() => ({} as Record<string, string>));
    this.keybindings.hydrateOverrides(overrides);
    this.keybindings.setPersistHook((all) => {
      void this.ipc.keybindings.save(all);
    });
  }

  /**
   * Attach the global key dispatcher to a window. Call once after extensions
   * load so manifest keybindings are already registered. Returns a Disposable
   * that detaches the listener.
   */
  installKeyDispatch(target: Window): Disposable {
    return new KeyDispatcher(this.keybindings, this.commands, this.contextKeys).attach(target);
  }

  /** Load then activate a batch, in order. */
  async loadAll(extensions: Extension[]): Promise<void> {
    for (const extension of extensions) this.load(extension);
    for (const extension of extensions) await this.activate(extension.manifest.id);
  }

  isActive(id: string): boolean {
    return this.registrations.get(id)?.status === "active";
  }

  /** Dispose every active extension. */
  async dispose(): Promise<void> {
    for (const id of [...this.registrations.keys()]) await this.deactivate(id);
  }
}

/** Convenience factory mirroring the typical `createX` host style. */
export function createKernel(options?: KernelOptions): Kernel {
  return new Kernel(options);
}
