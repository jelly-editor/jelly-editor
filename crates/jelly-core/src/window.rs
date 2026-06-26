use tauri::{AppHandle, WebviewUrl, WebviewWindowBuilder};

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
