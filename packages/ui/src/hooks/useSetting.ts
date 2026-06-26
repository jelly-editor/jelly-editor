import type { ExtensionContext } from "@jelly/sdk";
import { useEffect, useState } from "react";

/**
 * Read a kernel setting reactively. Re-renders when the value changes (via
 * ctx.settings.onChange), falling back to `fallback` until it's defined. Lets
 * an extension consume shared settings/theme using only its ctx.
 */
export function useSetting<T>(ctx: ExtensionContext, key: string, fallback: T): T {
  const [value, setValue] = useState<T>(() => ctx.settings.get<T>(key) ?? fallback);

  useEffect(() => {
    // Resync in case the value changed between the initial read and subscribe.
    setValue(ctx.settings.get<T>(key) ?? fallback);
    const sub = ctx.settings.onChange(key, (v) => setValue((v as T) ?? fallback));
    return () => sub.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, key]);

  return value;
}
