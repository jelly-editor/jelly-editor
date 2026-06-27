import { useCurrentDialog, useKernel } from "@jelly/kernel";
import { AlertDialog } from "@jelly/ui";

export function DialogHost() {
  const kernel = useKernel();
  const current = useCurrentDialog();
  if (!current) return null;
  return (
    <AlertDialog
      key={current.id}
      request={current.request}
      onChoose={(id) => kernel.dialog.resolveCurrent(id)}
    />
  );
}
