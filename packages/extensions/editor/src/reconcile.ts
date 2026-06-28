/** What to do when an open file changes on disk outside the editor. */
export type ExternalChangeOutcome =
  | "ignore" // not open, no real change, or already handled
  | "reload" // no unsaved edits — adopt the disk version silently
  | "notify"; // unsaved edits exist — ask the user which to keep

/**
 * Pure decision for {@link ExternalChangeOutcome}. Kept free of ipc/store/UI so
 * the auto-reload-vs-notify rule is testable on its own.
 */
export function decideExternalChange(args: {
  /** Whether the file is open in a tab. */
  isOpen: boolean;
  /** Whether the tab has unsaved edits. */
  isDirty: boolean;
  /** Contents now on disk. */
  onDisk: string;
  /** Contents last saved/loaded by the editor, if known. */
  saved: string | undefined;
  /** Whether the user has already been notified for this path. */
  alreadyNotified: boolean;
}): ExternalChangeOutcome {
  if (!args.isOpen) return "ignore";
  if (args.onDisk === args.saved) return "ignore"; // no real change
  if (!args.isDirty) return "reload";
  if (args.alreadyNotified) return "ignore"; // don't stack notifications
  return "notify";
}
