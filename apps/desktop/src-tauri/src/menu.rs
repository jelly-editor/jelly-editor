use tauri::{
    menu::{MenuBuilder, MenuItem, MenuItemBuilder, SubmenuBuilder},
    App, Emitter,
};

const REPORT_ISSUE_ID: &str = "app.reportIssue";
const REPORT_ISSUE_URL: &str = "https://github.com/jelly-editor/jelly-editor/issues/new";

pub fn install(app: &mut App) -> tauri::Result<()> {
    let command_item = |id: &str, text: &str, accelerator: &str| -> tauri::Result<MenuItem<_>> {
        MenuItemBuilder::with_id(id, text)
            .accelerator(accelerator)
            .build(app)
    };
    let plain_item = |id: &str, text: &str| -> tauri::Result<MenuItem<_>> {
        MenuItemBuilder::with_id(id, text).build(app)
    };

    let new_window = command_item("window.new", "New Window", "CmdOrCtrl+Shift+N")?;
    let open_folder = command_item("workspace.openFolder", "Open Folder...", "CmdOrCtrl+O")?;
    let save = command_item("editor.save", "Save", "CmdOrCtrl+S")?;
    let close_tab = command_item("editor.closeActiveTab", "Close Tab", "CmdOrCtrl+W")?;
    let preferences = command_item("settings.toggle", "Settings...", "CmdOrCtrl+,")?;
    let command_palette = command_item(
        "commandPalette.toggle",
        "Command Palette...",
        "CmdOrCtrl+Shift+P",
    )?;
    let keyboard_shortcuts = plain_item("commandPalette.shortcuts", "Keyboard Shortcuts")?;
    let app_check_updates = plain_item("settings.checkForUpdates", "Check for Updates...")?;
    let help_check_updates = plain_item("settings.checkForUpdates", "Check for Updates...")?;

    #[cfg(target_os = "macos")]
    let report_issue = plain_item(REPORT_ISSUE_ID, "Report Issue...")?;

    #[cfg(target_os = "macos")]
    let app_menu = SubmenuBuilder::new(app, "Jelly")
        .about(None)
        .separator()
        .item(&report_issue)
        .item(&app_check_updates)
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&new_window)
        .separator()
        .item(&open_folder)
        .separator()
        .item(&save)
        .separator()
        .item(&close_tab)
        .separator()
        .item(&preferences)
        .build()?;

    #[cfg(not(target_os = "macos"))]
    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&new_window)
        .separator()
        .item(&open_folder)
        .separator()
        .item(&save)
        .separator()
        .item(&close_tab)
        .separator()
        .item(&preferences)
        .separator()
        .item(&app_check_updates)
        .separator()
        .quit()
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&command_palette)
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .fullscreen()
        .build()?;

    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&keyboard_shortcuts)
        .separator()
        .item(&help_check_updates)
        .build()?;

    #[cfg(target_os = "macos")]
    let menu = MenuBuilder::new(app)
        .items(&[
            &app_menu,
            &file_menu,
            &edit_menu,
            &view_menu,
            &window_menu,
            &help_menu,
        ])
        .build()?;

    #[cfg(not(target_os = "macos"))]
    let menu = MenuBuilder::new(app)
        .items(&[&file_menu, &edit_menu, &view_menu, &window_menu, &help_menu])
        .build()?;

    app.set_menu(menu)?;
    app.on_menu_event(|app, event| match event.id().as_ref() {
        REPORT_ISSUE_ID => {
            let _ = tauri_plugin_opener::open_url(REPORT_ISSUE_URL, None::<&str>);
        }
        id if id.contains('.') => {
            let _ = app.emit("menu:command", id);
        }
        _ => {}
    });

    Ok(())
}
