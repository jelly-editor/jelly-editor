use std::sync::{Arc, Mutex};

use tauri::{AppHandle, State};
use tokio::{
    net::TcpListener,
    sync::{oneshot, Mutex as AsyncMutex},
};

pub struct McpState {
    start_lock: AsyncMutex<()>,
    shutdown_tx: Mutex<Option<oneshot::Sender<()>>>,
    port: Arc<Mutex<Option<u16>>>,
    last_error: Arc<Mutex<Option<String>>>,
    generation: Arc<Mutex<u64>>,
    allowed_tools: Arc<Mutex<Vec<String>>>,
}

impl McpState {
    pub fn new() -> Self {
        Self {
            start_lock: AsyncMutex::new(()),
            shutdown_tx: Mutex::new(None),
            port: Arc::new(Mutex::new(None)),
            last_error: Arc::new(Mutex::new(None)),
            generation: Arc::new(Mutex::new(0)),
            allowed_tools: Arc::new(Mutex::new(vec![])),
        }
    }

    fn stop_inner(&self) {
        if let Some(tx) = self.shutdown_tx.lock().unwrap().take() {
            let _ = tx.send(());
        }
        *self.port.lock().unwrap() = None;
    }
}

#[derive(serde::Serialize)]
pub struct McpStatus {
    pub running: bool,
    pub port: Option<u16>,
    pub error: Option<String>,
}

#[tauri::command]
pub fn mcp_tools() -> Vec<crate::tools::ToolInfo> {
    crate::tools::tool_infos()
}

#[tauri::command]
pub async fn mcp_start(
    port: u16,
    allowed_tools: Vec<String>,
    state: State<'_, McpState>,
    app: AppHandle,
) -> Result<(), String> {
    let _guard = state.start_lock.lock().await;

    if *state.port.lock().unwrap() == Some(port) {
        *state.allowed_tools.lock().unwrap() = allowed_tools;
        *state.last_error.lock().unwrap() = None;
        return Ok(());
    }

    state.stop_inner();
    *state.last_error.lock().unwrap() = None;

    let addr = format!("127.0.0.1:{port}");
    let listener = match TcpListener::bind(&addr)
        .await
        .map_err(|e| format!("Failed to bind MCP server on {addr}: {e}"))
    {
        Ok(listener) => listener,
        Err(err) => {
            *state.last_error.lock().unwrap() = Some(err.clone());
            return Err(err);
        }
    };

    *state.allowed_tools.lock().unwrap() = allowed_tools;

    let (tx, rx) = oneshot::channel::<()>();
    *state.shutdown_tx.lock().unwrap() = Some(tx);
    *state.port.lock().unwrap() = Some(port);
    let generation = {
        let mut generation = state.generation.lock().unwrap();
        *generation += 1;
        *generation
    };

    let allowed = state.allowed_tools.clone();
    let running_port = state.port.clone();
    let last_error = state.last_error.clone();
    let current_generation = state.generation.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(err) = crate::server::serve(listener, app, allowed, rx).await {
            *last_error.lock().unwrap() = Some(err.clone());
            eprintln!("MCP server stopped with error: {err}");
        }
        if *current_generation.lock().unwrap() != generation {
            return;
        }
        let mut current = running_port.lock().unwrap();
        if *current == Some(port) {
            *current = None;
        }
    });

    Ok(())
}

#[tauri::command]
pub fn mcp_stop(state: State<'_, McpState>) {
    state.stop_inner();
}

#[tauri::command]
pub fn mcp_status(state: State<'_, McpState>) -> McpStatus {
    let port = *state.port.lock().unwrap();
    let error = state.last_error.lock().unwrap().clone();
    McpStatus {
        running: port.is_some(),
        port,
        error,
    }
}

#[tauri::command]
pub fn mcp_update_tools(tools: Vec<String>, state: State<'_, McpState>) {
    *state.allowed_tools.lock().unwrap() = tools;
}
