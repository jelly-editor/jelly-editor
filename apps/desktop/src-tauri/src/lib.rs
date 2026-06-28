//! Thin Tauri host. It owns no feature logic — it folds each feature crate's
//! `register` (which attaches that feature's managed state) and lists the
//! re-exported commands in a single `generate_handler!`. App-level chrome (the
//! macOS menu) is the only thing wired here directly.

use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "macos")]
    let _ = fix_path_env::fix();

    // Resolve the first CLI argument (if any) as the path to open. We do this
    // before building the app so we can act on it inside `.setup()`.
    let cli_path: Option<String> = {
        let args: Vec<String> = std::env::args().collect();
        // args[0] is the binary; args[1] might be a path.
        args.get(1).cloned()
    };

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // When a second `jelly` process is launched while one is already running,
        // forward its arguments to the existing instance and exit the new one.
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            // args[0] = binary path; args[1] = optional folder path
            let path = args.get(1).map(|p| {
                if std::path::Path::new(p).is_absolute() {
                    p.clone()
                } else {
                    // Resolve relative to the new instance's working directory.
                    std::path::Path::new(&cwd).join(p).to_string_lossy().to_string()
                }
            });

            if let Some(p) = path {
                let _ = jelly_core::window::open_window_for_path(app, &p);
            } else {
                // No path — just bring any existing window to the front.
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.set_focus();
                }
            }
        }));

    // Auto-update (desktop only): plugin-updater fetches/installs signed
    // releases, plugin-process relaunches the app after an update.
    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init());

    // Fold each feature's managed state into the builder.
    let builder = jelly_core::register(builder);
    let builder = jelly_fs::register(builder);
    let builder = jelly_watcher::register(builder);
    let builder = jelly_terminal::register(builder);
    let builder = jelly_search::register(builder);

    builder
        .setup(move |app| {
            let win = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "macos")]
            {
                use tauri::TitleBarStyle;
                win.set_title_bar_style(TitleBarStyle::Overlay).unwrap();

                // Custom menu: keep Cmd+Q (quit) and standard clipboard shortcuts,
                // but deliberately omit "Close Window" so Cmd+W does NOT close the
                // window. Cmd+W is handled in the frontend to close the active buffer.
                use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};

                let check_updates = MenuItemBuilder::with_id(
                    "check_for_updates",
                    "Check for Updates...",
                )
                .build(app)?;

                let app_menu = SubmenuBuilder::new(app, "Jelly")
                    .about(None)
                    .item(&check_updates)
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
                app.on_menu_event(|app, event| {
                    if event.id().as_ref() == "check_for_updates" {
                        let _ = app.emit("menu:check_for_updates", ());
                    }
                });
            }

            // If a path was passed on the CLI, open it in the main window by
            // queuing it as the initial path for that window label ("main").
            if let Some(path) = cli_path {
                let resolved = if std::path::Path::new(&path).is_absolute() {
                    path.clone()
                } else {
                    std::env::current_dir()
                        .ok()
                        .map(|cwd| cwd.join(&path).to_string_lossy().to_string())
                        .unwrap_or(path)
                };

                if let Ok(abs) = std::fs::canonicalize(&resolved) {
                    if let Some(state) = app.try_state::<jelly_core::InitialPaths>() {
                        state.0.lock().unwrap()
                            .insert("main".to_string(), abs.to_string_lossy().to_string());
                    }
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            jelly_core::cli::install_shell_command,
            jelly_core::workspace::open_workspace,
            jelly_core::workspace::get_recent_folders,
            jelly_core::workspace::remove_recent_folder,
            jelly_core::settings::load_settings,
            jelly_core::settings::save_setting,
            jelly_core::state::load_state,
            jelly_core::state::save_state,
            jelly_core::state::delete_state,
            jelly_core::keybindings::load_keybindings,
            jelly_core::keybindings::save_keybindings,
            jelly_core::window::open_new_window,
            jelly_core::window::get_initial_path_for,
            jelly_fs::commands::read_file,
            jelly_fs::commands::save_file,
            jelly_fs::commands::list_dir,
            jelly_fs::commands::list_files,
            jelly_fs::commands::create_file,
            jelly_fs::commands::create_dir,
            jelly_fs::commands::rename,
            jelly_fs::commands::copy,
            jelly_fs::commands::delete,
            jelly_terminal::commands::create_terminal,
            jelly_terminal::commands::terminal_input,
            jelly_terminal::commands::terminal_resize,
            jelly_terminal::commands::close_terminal,
            jelly_git::commands::git_status,
            jelly_git::commands::git_diff,
            jelly_git::commands::git_stage,
            jelly_git::commands::git_unstage,
            jelly_git::commands::git_discard,
            jelly_git::commands::git_commit,
            jelly_search::commands::start_search,
            jelly_search::commands::cancel_search,
            jelly_search::commands::replace_in_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
