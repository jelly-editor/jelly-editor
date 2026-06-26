/**
 * @jelly/sdk — the contract.
 *
 * Types and interfaces only; no implementation. The kernel implements these,
 * extensions consume them. Depends on nothing at runtime (the React `import
 * type` in the UI types is erased at build time).
 */
export type * from "./core";
export type * from "./contributions";
export type * from "./ui";
export type * from "./ipc";
export type * from "./storage";
export type * from "./extension";
