/** Anything that holds resources and can be torn down. */
export interface Disposable {
  dispose(): void;
}
