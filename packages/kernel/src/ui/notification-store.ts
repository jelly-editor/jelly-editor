import type {
  NotificationHandle,
  NotificationOptions,
  NotificationRequest,
  NotificationService,
} from "@jelly/sdk";

export interface ActiveNotification {
  id: number;
  request: NotificationRequest;
}

export class NotificationStore implements NotificationService {
  private items: ActiveNotification[] = [];
  private listeners = new Set<() => void>();
  private seq = 0;

  show(request: NotificationRequest): NotificationHandle {
    const id = this.seq++;
    this.items = [...this.items, { id, request }];
    this.notify();
    return { dismiss: () => this.dismiss(id) };
  }

  info(message: string, opts?: NotificationOptions): NotificationHandle {
    return this.show({ ...opts, message, kind: "info" });
  }

  warn(message: string, opts?: NotificationOptions): NotificationHandle {
    return this.show({ ...opts, message, kind: "warning" });
  }

  error(message: string, opts?: NotificationOptions): NotificationHandle {
    return this.show({ ...opts, message, kind: "error" });
  }

  dismiss(id: number): void {
    const next = this.items.filter((n) => n.id !== id);
    if (next.length === this.items.length) return;
    this.items = next;
    this.notify();
  }

  /** Snapshot of active notifications, oldest first. */
  list = (): readonly ActiveNotification[] => this.items;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    for (const l of [...this.listeners]) l();
  }
}
