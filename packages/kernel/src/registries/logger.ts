import type { Logger } from "@jelly/sdk";

/** Console logger that prefixes every line with the extension id. */
export class PrefixedLogger implements Logger {
  constructor(private readonly prefix: string) {}

  debug(...args: unknown[]): void {
    console.debug(`[${this.prefix}]`, ...args);
  }

  info(...args: unknown[]): void {
    console.info(`[${this.prefix}]`, ...args);
  }

  warn(...args: unknown[]): void {
    console.warn(`[${this.prefix}]`, ...args);
  }

  error(...args: unknown[]): void {
    console.error(`[${this.prefix}]`, ...args);
  }
}
