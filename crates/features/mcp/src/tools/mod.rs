mod notes;

use serde::Serialize;
use serde_json::Value;
use tauri::AppHandle;

#[derive(Clone, Serialize)]
pub struct ToolInfo {
    pub name: &'static str,
    pub label: &'static str,
    pub description: &'static str,
    pub group: &'static str,
}

pub struct ToolOutput {
    pub is_error: bool,
    pub text: String,
}

impl ToolOutput {
    pub fn ok(text: impl Into<String>) -> Self {
        Self {
            is_error: false,
            text: text.into(),
        }
    }

    pub fn error(text: impl Into<String>) -> Self {
        Self {
            is_error: true,
            text: text.into(),
        }
    }
}

pub fn all_tools() -> Vec<Value> {
    let mut tools = Vec::new();
    tools.extend(notes::definitions());
    tools
}

pub fn tool_infos() -> Vec<ToolInfo> {
    let mut tools = Vec::new();
    tools.extend(notes::infos());
    tools
}

pub async fn call_tool(name: &str, args: Value, app: &AppHandle) -> ToolOutput {
    if notes::has_tool(name) {
        return notes::call(name, args, app).await;
    }
    ToolOutput::error(format!("Unknown tool: {name}"))
}
