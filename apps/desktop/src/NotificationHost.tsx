import { useKernel, useNotifications } from "@jelly/kernel";
import { Notifications } from "@jelly/ui";

export function NotificationHost() {
  const kernel = useKernel();
  const items = useNotifications();
  return (
    <Notifications
      items={[...items]}
      onDismiss={(id) => kernel.notifications.dismiss(id)}
      onAction={(id, action) => {
        kernel.notifications.dismiss(id);
        void action.run?.();
      }}
    />
  );
}
