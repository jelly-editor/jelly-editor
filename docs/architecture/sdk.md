# `@jelly/sdk` — The Contract

The SDK is the stable surface. It contains **no implementation**, only types and interfaces.
The kernel implements them; extensions consume them. Freezing this is what lets future
runtime add-ons compile against a known target.

```ts
export interface Extension {
  manifest: ExtensionManifest;
  activate(ctx: ExtensionContext): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}

export interface ExtensionManifest {
  id: string;                 // "jelly.files"  (reverse-dns, globally unique)
  name: string;
  version: string;
  contributes?: {             // declarative contributions (statically inspectable)
    commands?: CommandDescriptor[];
    views?: ViewDescriptor[];
    keybindings?: KeybindingDescriptor[];
    settings?: SettingsSchema;
  };
}

export interface ExtensionContext {
  commands:    CommandRegistry;     // register/execute named commands
  ui:          UIRegistry;          // mount React into named slots
  events:      EventBus;            // subscribe/emit cross-cutting events
  ipc:         IpcClient;           // typed, capability-scoped bridge to Rust core
  settings:    SettingsRegistry;    // declare schema + read/write
  keybindings: KeybindingRegistry;  // bind keys → command ids
  storage:     KeyValueStore;       // per-extension persisted state
  log:         Logger;
  subscriptions: Disposable[];      // anything pushed here is auto-disposed on deactivate
}

export interface Disposable { dispose(): void; }
```

The individual registries on `ExtensionContext` are each documented in their own sections:

- [`CommandRegistry` and `KeybindingRegistry`](./command-system.md)
- [`UIRegistry` and `EventBus`](./ui-slots.md)
- [`IpcClient`](./ipc.md)
