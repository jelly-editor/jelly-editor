use std::path::PathBuf;

/// Result of a successful shell command installation.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallResult {
    /// Path of the installed script, e.g. `~/.local/bin/jelly`.
    pub script_path: String,
    /// Shell config file that was updated, if PATH was added.
    pub shell_config: Option<String>,
    /// Whether the PATH line was freshly added (false = already present).
    pub path_added: bool,
}

/// Write `~/.local/bin/jelly` and ensure `~/.local/bin` is on PATH in the
/// user's shell config. Works without elevated privileges.
#[tauri::command]
pub fn install_shell_command() -> Result<InstallResult, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;

    // ~/.local/bin is the XDG-conventional user bin directory.
    let bin_dir = home_dir()?.join(".local").join("bin");
    std::fs::create_dir_all(&bin_dir).map_err(|e| e.to_string())?;

    let script_path = bin_dir.join("jelly");
    let exe_str = exe.to_string_lossy();
    let script = format!("#!/usr/bin/env bash\nexec \"{exe_str}\" \"$@\"\n");
    std::fs::write(&script_path, &script).map_err(|e| e.to_string())?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&script_path, std::fs::Permissions::from_mode(0o755))
            .map_err(|e| e.to_string())?;
    }

    // Add ~/.local/bin to PATH in the appropriate shell config.
    let (shell_config, path_added) = ensure_path_in_shell_config(&bin_dir)?;

    Ok(InstallResult {
        script_path: script_path.to_string_lossy().to_string(),
        shell_config,
        path_added,
    })
}

/// Detect the user's login shell and append a PATH export to the right rc file
/// if the directory isn't already mentioned in it.
fn ensure_path_in_shell_config(bin_dir: &std::path::Path) -> Result<(Option<String>, bool), String> {
    let home = home_dir()?;
    let shell = std::env::var("SHELL").unwrap_or_default();
    let bin_str = bin_dir.to_string_lossy();

    // Pick rc file and the line to append based on the detected shell.
    let (rc_path, export_line): (PathBuf, String) = if shell.contains("fish") {
        (
            home.join(".config").join("fish").join("config.fish"),
            format!("fish_add_path \"{bin_str}\""),
        )
    } else if shell.contains("zsh") {
        (
            home.join(".zshrc"),
            format!("export PATH=\"{bin_str}:$PATH\""),
        )
    } else {
        // Default to bash.
        (
            home.join(".bashrc"),
            format!("export PATH=\"{bin_str}:$PATH\""),
        )
    };

    let rc_str = rc_path.to_string_lossy().to_string();

    // Read existing content; if the bin dir is already mentioned, skip.
    let existing = std::fs::read_to_string(&rc_path).unwrap_or_default();
    if existing.contains(bin_str.as_ref()) {
        return Ok((Some(rc_str), false));
    }

    // Append the export line with a blank line separator.
    let addition = format!("\n# Added by Jelly\n{export_line}\n");
    std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&rc_path)
        .and_then(|mut f| {
            use std::io::Write;
            f.write_all(addition.as_bytes())
        })
        .map_err(|e| format!("Could not update {rc_str}: {e}"))?;

    Ok((Some(rc_str), true))
}

fn home_dir() -> Result<PathBuf, String> {
    std::env::var("HOME")
        .map(PathBuf::from)
        .map_err(|_| "HOME environment variable not set".to_string())
}
