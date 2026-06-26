use std::{fs, path::PathBuf};

use serde::{de::DeserializeOwned, Serialize};

pub fn jelly_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| String::from("."));
    PathBuf::from(home).join(".jelly")
}

pub fn load_json<T: DeserializeOwned>(filename: &str) -> Option<T> {
    let content = fs::read_to_string(jelly_dir().join(filename)).ok()?;
    serde_json::from_str(&content).ok()
}

pub fn save_json<T: Serialize>(filename: &str, value: &T) {
    let dir = jelly_dir();
    let _ = fs::create_dir_all(&dir);
    if let Ok(json) = serde_json::to_string_pretty(value) {
        let _ = fs::write(dir.join(filename), json);
    }
}
