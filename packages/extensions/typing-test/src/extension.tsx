import type { Extension, ExtensionContext } from "@jelly/sdk";
import { lazy, Suspense } from "react";

const TypingTestView = lazy(() =>
  import("./ui/TypingTestView").then((m) => ({ default: m.TypingTestView })),
);

function LoadingSpinner() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg">
      <svg
        className="animate-spin"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M12 2a10 10 0 0 1 10 10" className="text-accent" />
        <circle cx="12" cy="12" r="10" className="text-text-muted/20" />
      </svg>
    </div>
  );
}

export const typingTestExtension: Extension = {
  manifest: {
    id: "jelly.typing-test",
    name: "Typing Test",
    version: "1.0.0",
    contributes: {
      commands: [
        { id: "typingtest.open", title: "Typing Test", palette: true },
      ],
    },
  },

  activate(ctx: ExtensionContext) {
    // Register the view type with the editor so it renders inside a tab pane,
    // keeping the terminal bottom group visible below it.
    void ctx.commands.execute(
      "editor.registerView",
      "typingtest",
      (_viewId: string, { active }: { active: boolean }) => (
        <Suspense fallback={<LoadingSpinner />}>
          <TypingTestView ctx={ctx} active={active} />
        </Suspense>
      ),
    );

    ctx.subscriptions.push(
      ctx.commands.register("typingtest.open", () => {
        void ctx.commands.execute("editor.openView", "typingtest", "main", "Typing Test");
      }),
    );

    setTimeout(() => {
      void ctx.commands.execute("games.register", {
        id: "typingtest",
        name: "Typing Test",
        description: "Test your typing speed and accuracy",
        openCommand: "typingtest.open",
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/></svg>`,
      });
    }, 0);
  },
};
