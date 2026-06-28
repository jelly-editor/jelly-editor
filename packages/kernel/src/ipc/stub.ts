import type { IpcClient } from "@jelly/sdk";

/**
 * A placeholder IpcClient whose every call rejects. The host injects the real
 * client (@jelly/ipc) when constructing the kernel; this only exists so the
 * kernel is usable in tests and never has to import @tauri-apps/api itself.
 */
export function createStubIpc(): IpcClient {
  const fail = (method: string) => async (): Promise<never> => {
    throw new Error(
      `[kernel] ipc.${method} called but no IpcClient was provided to the kernel`,
    );
  };

  return {
    fs: {
      read: fail("fs.read"),
      save: fail("fs.save"),
      list: fail("fs.list"),
      listFiles: fail("fs.listFiles"),
      create: fail("fs.create"),
      createDir: fail("fs.createDir"),
      rename: fail("fs.rename"),
      copy: fail("fs.copy"),
      delete: fail("fs.delete"),
      notifyChanged: fail("fs.notifyChanged"),
      reveal: fail("fs.reveal"),
    },
    clipboard: {
      write: fail("clipboard.write"),
      read: fail("clipboard.read"),
      clear: fail("clipboard.clear"),
    },
    drag: {
      start: fail("drag.start"),
      updateModifiers: fail("drag.updateModifiers"),
      readSession: fail("drag.readSession"),
      clearSession: fail("drag.clearSession"),
      onDrop: fail("drag.onDrop"),
    },
    git: {
      status: fail("git.status"),
      diff: fail("git.diff"),
      stage: fail("git.stage"),
      unstage: fail("git.unstage"),
      discard: fail("git.discard"),
      commit: fail("git.commit"),
    },
    search: {
      start: fail("search.start"),
      cancel: fail("search.cancel"),
      replace: fail("search.replace"),
    },
    terminal: {
      create: fail("terminal.create"),
      input: fail("terminal.input"),
      resize: fail("terminal.resize"),
      close: fail("terminal.close"),
    },
    workspace: {
      open: fail("workspace.open"),
      recent: fail("workspace.recent"),
      removeRecent: fail("workspace.removeRecent"),
    },
    settings: {
      load: fail("settings.load"),
      save: fail("settings.save"),
    },
    storage: {
      load: fail("storage.load"),
      set: fail("storage.set"),
      delete: fail("storage.delete"),
    },
    keybindings: {
      load: fail("keybindings.load"),
      save: fail("keybindings.save"),
    },
    updater: {
      check: fail("updater.check"),
      installAndRestart: fail("updater.installAndRestart"),
    },
  };
}
