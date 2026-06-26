//! Thin Tauri host. It owns no feature logic — it folds each feature crate's
//! `register` (which attaches that feature's managed state) and lists the
//! re-exported commands in a single `generate_handler!`. App-level chrome (the
//! macOS menu) is the only thing wired here directly.

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init());

    // Fold each feature's managed state into the builder.
    let builder = jelly_core::register(builder);
    let builder = jelly_fs::register(builder);
    let builder = jelly_watcher::register(builder);
    let builder = jelly_terminal::register(builder);

    builder
        .setup(|app| {
            let win = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "macos")]
            {
                use tauri::TitleBarStyle;
                win.set_title_bar_style(TitleBarStyle::Overlay).unwrap();

                // Custom menu: keep Cmd+Q (quit) and standard clipboard shortcuts,
                // but deliberately omit "Close Window" so Cmd+W does NOT close the
                // window. Cmd+W is handled in the frontend to close the active buffer.
                use tauri::menu::{MenuBuilder, SubmenuBuilder};

                let app_menu = SubmenuBuilder::new(app, "Jelly")
                    .about(None)
                    .separator()
                    .services()
                    .separator()
                    .hide()
                    .hide_others()
                    .show_all()
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

                let window_menu = SubmenuBuilder::new(app, "Window")
                    .minimize()
                    .fullscreen()
                    .build()?;

                let menu = MenuBuilder::new(app)
                    .items(&[&app_menu, &edit_menu, &window_menu])
                    .build()?;
                app.set_menu(menu)?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            jelly_core::workspace::open_workspace,
            jelly_core::workspace::get_recent_folders,
            jelly_core::workspace::remove_recent_folder,
            jelly_core::window::open_new_window,
            jelly_fs::commands::read_file,
            jelly_fs::commands::save_file,
            jelly_fs::commands::list_dir,
            jelly_fs::commands::create_file,
            jelly_fs::commands::create_dir,
            jelly_fs::commands::rename,
            jelly_fs::commands::delete,
            jelly_terminal::commands::create_terminal,
            jelly_terminal::commands::terminal_input,
            jelly_terminal::commands::terminal_resize,
            jelly_terminal::commands::close_terminal,
            jelly_git::commands::git_status,
            jelly_git::commands::git_diff,
            jelly_git::commands::git_stage,
            jelly_git::commands::git_unstage,
            jelly_git::commands::git_commit,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
