use std::collections::HashMap;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::sync::Mutex;

use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder};

/// Pending initial paths for newly created workspace windows.
/// Keyed by window label; consumed on first read by the frontend.
pub struct InitialPaths(pub Mutex<HashMap<String, String>>);

fn window_label_for_path(path: &str) -> String {
    let mut h = DefaultHasher::new();
    path.hash(&mut h);
    format!("workspace_{:016x}", h.finish())
}

/// Open a window for `path`, or focus the existing one.
/// The resolved path is stored so the frontend can fetch it via `get_initial_path_for`.
pub fn open_window_for_path(app: &AppHandle, path: &str) -> Result<(), String> {
    let abs = std::fs::canonicalize(path)
        .map_err(|e| format!("Cannot open '{}': {}", path, e))?;
    let abs_str = abs.to_string_lossy().to_string();
    let label = window_label_for_path(&abs_str);

    if let Some(win) = app.get_webview_window(&label) {
        win.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Store path before creating the window so it is ready the moment the
    // frontend boots and calls `get_initial_path_for`.
    if let Some(state) = app.try_state::<InitialPaths>() {
        state.0.lock().unwrap().insert(label.clone(), abs_str);
    }

    let win = WebviewWindowBuilder::new(app, &label, WebviewUrl::App("/".into()))
        .title("")
        .inner_size(1200.0, 800.0)
        .build()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        use tauri::TitleBarStyle;
        win.set_title_bar_style(TitleBarStyle::Overlay)
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Called by the frontend on boot with its own window label (from `getCurrent().label`).
/// Returns and removes the queued initial path, if any.
#[tauri::command]
pub fn get_initial_path_for(label: String, paths: State<InitialPaths>) -> Option<String> {
    paths.0.lock().unwrap().remove(&label)
}

#[tauri::command]
pub async fn open_new_window(app: AppHandle) -> Result<(), String> {
    let label = format!(
        "welcome_{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis()
    );

    let win = WebviewWindowBuilder::new(&app, label, WebviewUrl::App("/".into()))
        .title("")
        .inner_size(1200.0, 800.0)
        .build()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        use tauri::TitleBarStyle;
        win.set_title_bar_style(TitleBarStyle::Overlay)
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
