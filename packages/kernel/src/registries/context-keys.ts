/**
 * A small reactive map of boolean context keys (e.g. `workspaceOpen`,
 * `terminalFocused`) that gate keybindings via their `when` clause. Deliberately
 * tiny: the `when` grammar is just identifiers, `!`, `&&`, and `||` — enough to
 * disambiguate the common cases without dragging in a full expression engine.
 */
export class ContextKeyStore {
  private keys = new Map<string, boolean>();

  set(key: string, value: boolean): void {
    this.keys.set(key, value);
  }

  get(key: string): boolean {
    return this.keys.get(key) ?? false;
  }

  /** Evaluate a `when` expression. Empty/undefined means "always". */
  evaluate(when?: string): boolean {
    if (!when) return true;
    // OR has the lowest precedence, then AND, then unary ! on a single key.
    return when.split("||").some((or) =>
      or.split("&&").every((and) => this.term(and.trim())),
    );
  }

  private term(token: string): boolean {
    if (token.startsWith("!")) return !this.get(token.slice(1).trim());
    return this.get(token);
  }
}
