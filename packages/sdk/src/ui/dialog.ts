/** Visual emphasis of the whole dialog (drives the accent dot/colour). */
export type DialogKind = "info" | "warning" | "error";

export interface DialogButton {
  /** Value `show()` resolves to when this button is chosen. */
  id: string;
  label: string;
  /** `primary` is also triggered by Enter; `danger` is destructive. */
  variant?: "default" | "primary" | "danger";
}

export interface DialogRequest {
  title?: string;
  message: string;
  kind?: DialogKind;
  buttons: DialogButton[];
  /** Returned when dismissed via Esc/backdrop. Defaults to the last button's id. */
  dismissId?: string;
}

/**
 * In-app modal dialogs, rendered by the host. The single replacement for native
 * `alert`/`confirm` so every extension shares one themed surface.
 */
export interface DialogService {
  /** Show a modal; resolves with the chosen button id (or `dismissId` on Esc/backdrop). */
  show(request: DialogRequest): Promise<string>;
  /** Convenience OK/Cancel prompt; resolves `true` when confirmed. */
  confirm(
    message: string,
    opts?: {
      title?: string;
      kind?: DialogKind;
      confirmLabel?: string;
      cancelLabel?: string;
      danger?: boolean;
    },
  ): Promise<boolean>;
}
