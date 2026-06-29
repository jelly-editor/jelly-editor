use std::sync::{Arc, Mutex};

use axum::{
    extract::State,
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::post,
    Json, Router,
};
use serde_json::{json, Value};
use tauri::AppHandle;
use tokio::{net::TcpListener, sync::oneshot};

#[derive(Clone)]
pub struct ServerState {
    app: AppHandle,
    allowed_tools: Arc<Mutex<Vec<String>>>,
}

pub async fn serve(
    listener: TcpListener,
    app: AppHandle,
    allowed_tools: Arc<Mutex<Vec<String>>>,
    shutdown: oneshot::Receiver<()>,
) -> Result<(), String> {
    let state = ServerState { app, allowed_tools };
    let router = Router::new()
        .route("/mcp", post(handle_post).get(handle_get))
        .with_state(state);

    axum::serve(listener, router)
        .with_graceful_shutdown(async {
            let _ = shutdown.await;
        })
        .await
        .map_err(|e| e.to_string())
}

async fn handle_get() -> Response {
    (
        StatusCode::METHOD_NOT_ALLOWED,
        [(header::ALLOW, "POST")],
        Json(json!({
            "jsonrpc": "2.0",
            "error": {
                "code": -32000,
                "message": "MCP requests must use POST"
            }
        })),
    )
        .into_response()
}

async fn handle_post(
    State(state): State<ServerState>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> Response {
    if !valid_origin(&headers) {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({
                "jsonrpc": "2.0",
                "error": {
                    "code": -32000,
                    "message": "Invalid Origin for local MCP server"
                }
            })),
        )
            .into_response();
    }

    if !body.is_object() {
        return json_error(None, -32600, "Invalid Request");
    }

    let id = body.get("id").cloned();
    let method = body.get("method").and_then(|m| m.as_str()).unwrap_or("");
    let params = body.get("params").cloned().unwrap_or(json!({}));

    if method.is_empty() {
        return json_error(id, -32600, "Invalid Request");
    }

    let response = dispatch(method, params, &state).await;

    match (id, response) {
        (None, DispatchResponse::Result(_)) => StatusCode::ACCEPTED.into_response(),
        (Some(id), DispatchResponse::Result(result)) => Json(json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": result,
        }))
        .into_response(),
        (Some(id), DispatchResponse::Error { code, message }) => {
            json_error(Some(id), code, &message)
        }
        (None, DispatchResponse::Error { code, message }) => json_error(None, code, &message),
    }
}

enum DispatchResponse {
    Result(Value),
    Error { code: i64, message: String },
}

async fn dispatch(method: &str, params: Value, state: &ServerState) -> DispatchResponse {
    match method {
        "initialize" => DispatchResponse::Result(json!({
            "protocolVersion": "2025-06-18",
            "capabilities": { "tools": {} },
            "serverInfo": { "name": "jelly", "version": "1.0.0" }
        })),
        "notifications/initialized" | "ping" => DispatchResponse::Result(json!({})),
        "tools/list" => {
            let allowed = state.allowed_tools.lock().unwrap().clone();
            let tools: Vec<Value> = crate::tools::all_tools()
                .into_iter()
                .filter(|t| {
                    let name = t["name"].as_str().unwrap_or("");
                    allowed.iter().any(|allowed| allowed == name)
                })
                .collect();
            DispatchResponse::Result(json!({ "tools": tools }))
        }
        "tools/call" => {
            let name = params.get("name").and_then(|n| n.as_str()).unwrap_or("");
            let args = params.get("arguments").cloned().unwrap_or(json!({}));
            let allowed = state.allowed_tools.lock().unwrap().clone();

            if !allowed.iter().any(|allowed| allowed == name) {
                return DispatchResponse::Result(json!({
                    "isError": true,
                    "content": [{ "type": "text", "text": format!("Tool '{name}' is not allowed") }]
                }));
            }

            let output = crate::tools::call_tool(name, args, &state.app).await;
            DispatchResponse::Result(json!({
                "isError": output.is_error,
                "content": [{ "type": "text", "text": output.text }]
            }))
        }
        _ => DispatchResponse::Error {
            code: -32601,
            message: format!("Method not found: {method}"),
        },
    }
}

fn json_error(id: Option<Value>, code: i64, message: &str) -> Response {
    Json(json!({
        "jsonrpc": "2.0",
        "id": id.unwrap_or(Value::Null),
        "error": {
            "code": code,
            "message": message,
        }
    }))
    .into_response()
}

fn valid_origin(headers: &HeaderMap) -> bool {
    let Some(origin) = headers.get(header::ORIGIN) else {
        return true;
    };
    let Ok(origin) = origin.to_str() else {
        return false;
    };

    if origin == "null" || origin.starts_with("tauri://") {
        return true;
    }

    let Some(rest) = origin
        .strip_prefix("http://")
        .or_else(|| origin.strip_prefix("https://"))
    else {
        return false;
    };
    let host = rest.split('/').next().unwrap_or(rest);
    let host = host.rsplit_once(':').map(|(host, _)| host).unwrap_or(host);
    matches!(host, "localhost" | "127.0.0.1" | "[::1]")
}

#[cfg(test)]
mod tests {
    use axum::http::{header, HeaderMap, HeaderValue};

    use super::valid_origin;

    #[test]
    fn origin_header_is_optional_for_non_browser_clients() {
        assert!(valid_origin(&HeaderMap::new()));
    }

    #[test]
    fn localhost_origins_are_allowed() {
        let mut headers = HeaderMap::new();
        headers.insert(
            header::ORIGIN,
            HeaderValue::from_static("http://localhost:3000"),
        );
        assert!(valid_origin(&headers));

        headers.insert(
            header::ORIGIN,
            HeaderValue::from_static("http://127.0.0.1:3000"),
        );
        assert!(valid_origin(&headers));
    }

    #[test]
    fn remote_origins_are_rejected() {
        let mut headers = HeaderMap::new();
        headers.insert(
            header::ORIGIN,
            HeaderValue::from_static("https://example.com"),
        );
        assert!(!valid_origin(&headers));
    }
}
