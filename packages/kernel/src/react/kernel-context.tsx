import { createContext, useContext, type ReactNode } from "react";
import type { Kernel } from "../core/kernel";

const KernelContext = createContext<Kernel | null>(null);

export interface KernelProviderProps {
  kernel: Kernel;
  children: ReactNode;
}

/** Makes the kernel available to the slot system and any extension UI below it. */
export function KernelProvider({ kernel, children }: KernelProviderProps) {
  return <KernelContext.Provider value={kernel}>{children}</KernelContext.Provider>;
}

/** Access the running kernel. Throws if used outside a <KernelProvider/>. */
export function useKernel(): Kernel {
  const kernel = useContext(KernelContext);
  if (!kernel) {
    throw new Error("[kernel] useKernel() must be used within a <KernelProvider/>");
  }
  return kernel;
}
