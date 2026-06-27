import type { DialogKind, DialogRequest, DialogService } from "@jelly/sdk";

export interface PendingDialog {
  id: number;
  request: DialogRequest;
  resolve: (choiceId: string) => void;
}

type ConfirmOpts = {
  title?: string;
  kind?: DialogKind;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

export class DialogStore implements DialogService {
  private queue: PendingDialog[] = [];
  private listeners = new Set<() => void>();
  private seq = 0;

  show(request: DialogRequest): Promise<string> {
    return new Promise<string>((resolve) => {
      this.queue = [...this.queue, { id: this.seq++, request, resolve }];
      this.notify();
    });
  }

  confirm(message: string, opts?: ConfirmOpts): Promise<boolean> {
    return this.show({
      title: opts?.title,
      message,
      kind: opts?.kind,
      dismissId: "cancel",
      buttons: [
        { id: "cancel", label: opts?.cancelLabel ?? "Cancel" },
        {
          id: "ok",
          label: opts?.confirmLabel ?? "OK",
          variant: opts?.danger ? "danger" : "primary",
        },
      ],
    }).then((id) => id === "ok");
  }

  current = (): PendingDialog | null => this.queue[0] ?? null;

  resolveCurrent(choiceId: string): void {
    const head = this.queue[0];
    if (!head) return;
    this.queue = this.queue.slice(1);
    this.notify();
    head.resolve(choiceId);
  }

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
