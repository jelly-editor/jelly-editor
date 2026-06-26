import type { CommandDescriptor, CommandHandler, CommandRegistry, Disposable } from "@jelly/sdk";
import { toDisposable } from "../core/disposable";

/** In-memory command bus: register by id, execute by id. */
export class CommandBus implements CommandRegistry {
  private handlers = new Map<string, CommandHandler>();
  private titles = new Map<string, string>();

  /** Seed display titles from an extension manifest's contributes.commands list. */
  seedDescriptors(commands: CommandDescriptor[]): void {
    for (const cmd of commands) {
      this.titles.set(cmd.id, cmd.title);
    }
  }

  register(id: string, handler: CommandHandler): Disposable {
    if (this.handlers.has(id)) {
      throw new Error(`[kernel] command already registered: "${id}"`);
    }
    this.handlers.set(id, handler);
    return toDisposable(() => {
      // only remove if it's still the handler we installed
      if (this.handlers.get(id) === handler) this.handlers.delete(id);
    });
  }

  async execute<T = unknown>(id: string, ...args: unknown[]): Promise<T> {
    const handler = this.handlers.get(id);
    if (!handler) throw new Error(`[kernel] no command registered: "${id}"`);
    return (await handler(...args)) as T;
  }

  has(id: string): boolean {
    return this.handlers.has(id);
  }

  list(): CommandDescriptor[] {
    return [...this.titles.entries()].map(([id, title]) => ({ id, title }));
  }
}
