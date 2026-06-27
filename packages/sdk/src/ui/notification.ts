/** Visual emphasis of a notification (drives the icon and accent colour). */
export type NotificationKind = "info" | "warning" | "error";

export interface NotificationAction {
  label: string;
  /** Invoked when chosen; the notification is dismissed afterwards. */
  run?: () => void | Promise<void>;
  /** `primary` is visually emphasised (filled accent). */
  variant?: "default" | "primary";
}

export interface NotificationRequest {
  message: string;
  kind?: NotificationKind;
  /** Short attribution shown bottom-left, e.g. "Git". */
  source?: string;
  actions?: NotificationAction[];
  /** Auto-dismiss after this many ms. Omit to keep until dismissed. */
  timeout?: number;
}

/** Returned by `show`, letting the caller dismiss the toast programmatically. */
export interface NotificationHandle {
  dismiss(): void;
}

/** Convenience options for the `info`/`warn`/`error` shortcuts. */
export type NotificationOptions = Omit<NotificationRequest, "message" | "kind">;

/**
 * Transient, non-modal messages stacked in the bottom-right. Unlike `dialog`
 * (a single modal that blocks), several notifications can be visible at once and
 * each action carries its own callback.
 */
export interface NotificationService {
  show(request: NotificationRequest): NotificationHandle;
  info(message: string, opts?: NotificationOptions): NotificationHandle;
  warn(message: string, opts?: NotificationOptions): NotificationHandle;
  error(message: string, opts?: NotificationOptions): NotificationHandle;
}
