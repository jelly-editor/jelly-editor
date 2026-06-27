# UI Slots and Event Bus

## UI registry & slots

The kernel owns a fixed set of **layout slots**. Extensions mount React nodes into them;
they never know the overall layout. This is what replaces the hardcoded `EditorView`.

```
Slots:
  titlebar            activitybar          statusbar.left / statusbar.right
  sidebar.panel       editor.surface       panel.tab  (terminal area)
  modal               context-menu
```

```ts
interface UIRegistry {
  contributeActivityBarItem(item: ActivityBarItem): Disposable;
  contributeSidebarPanel(panel: SidebarPanel): Disposable;   // shows when its activity item is active
  contributeStatusBarItem(item: StatusBarItem): Disposable;
  contributeEditorSurface(surface: EditorSurface): Disposable; // e.g. code editor, diff view
  contributePanelTab(tab: PanelTab): Disposable;             // e.g. terminal
  mountSlot(slot: SlotId, node: ReactNode, opts?: SlotOpts): Disposable;
}
```

---

## Event bus

Cross-extension and core→frontend signals, by name. Replaces direct calls between
features (e.g. "a file was saved" → git refreshes its status without git importing files).

```ts
interface EventBus {
  on<T>(event: string, handler: (payload: T) => void): Disposable;
  emit<T>(event: string, payload: T): void;
}
```

Core events emitted by the host bridge (from Rust → kernel → bus):

```
workspace:opened            file:changed_externally     file:saved
git:status_changed          terminal:output             terminal:exit
```
