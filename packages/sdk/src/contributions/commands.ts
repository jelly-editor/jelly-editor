import type { Disposable } from "../core/disposable";

export interface CommandDescriptor {
  id: string;
  title: string;
  /** Set to false to hide from the command palette. Default: true. */
  palette?: boolean;
  /** Display group, e.g. the contributing extension's name ("Git"). Seeded by
   *  the kernel; shown as a "Category: Title" prefix in the command palette. */
  category?: string;
}

export type CommandHandler = (...args: any[]) => unknown;

/**
 * Commands decouple intent from implementation. Anything invocable is a named
 * command; the activity bar, keybindings, and the future command palette all
 * dispatch by id.
 */
export interface CommandRegistry {
  register(id: string, handler: CommandHandler): Disposable;
  execute<T = unknown>(id: string, ...args: unknown[]): Promise<T>;
  has(id: string): boolean;
  list(): CommandDescriptor[];
}
