//! Thin Tauri host. It owns no feature logic — it folds each feature crate's
//! `register` (which attaches that feature's managed state) and lists the
//! re-exported commands in a single `generate_handler!`.

mod menu;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "macos")]
    let _ = fix_path_env::fix();

    let cli_path: Option<String> = {
        let args: Vec<String> = std::env::args().collect();
        args.get(1).cloned()
    };

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_drag::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            let path = args.get(1).map(|p| {
                if std::path::Path::new(p).is_absolute() {
                    p.clone()
                } else {
                    std::path::Path::new(&cwd)
                        .join(p)
                        .to_string_lossy()
                        .to_string()
                }
            });

            if let Some(p) = path {
                let _ = jelly_core::window::open_window_for_path(app, &p);
            } else {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.set_focus();
                }
            }
        }));

    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init());

    let builder = jelly_core::register(builder);
    let builder = jelly_fs::register(builder);
    let builder = jelly_watcher::register(builder);
    let builder = jelly_terminal::register(builder);
    let builder = jelly_search::register(builder);
    let builder = jelly_mcp::register(builder);

    builder
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let app = window.app_handle().clone();
                if app.webview_windows().len() <= 1 {
                    api.prevent_close();
                    let win = window.clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = jelly_core::window::open_new_window(app).await;
                        let _ = win.close();
                    });
                }
            }
        })
        .setup(move |app| {
            let win = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "macos")]
            {
                use tauri::TitleBarStyle;
                win.set_title_bar_style(TitleBarStyle::Overlay).unwrap();
            }

            menu::install(app)?;

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
                        state
                            .0
                            .lock()
                            .unwrap()
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
            jelly_fs::clipboard::clipboard_write,
            jelly_fs::clipboard::clipboard_read,
            jelly_fs::clipboard::clipboard_clear,
            jelly_fs::drag::drag_session_write,
            jelly_fs::drag::drag_session_read,
            jelly_fs::drag::drag_session_update_modifiers,
            jelly_fs::drag::drag_session_clear,
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
            jelly_mcp::commands::mcp_start,
            jelly_mcp::commands::mcp_stop,
            jelly_mcp::commands::mcp_status,
            jelly_mcp::commands::mcp_tools,
            jelly_mcp::commands::mcp_update_tools,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
