use crate::{
    db::DB,
    response::GenericResponse,
    WebResult,
};
use warp::{reject, reply::json, Reply};

pub async fn get_entries_handler(db: DB) -> WebResult<impl Reply> {
    let result_json = db.get_entries()
        .await
        .map_err(|e| reject::custom(e))?;

    Ok(json(&result_json))
}

pub async fn health_checker_handler() -> WebResult<impl Reply> {
    const MESSAGE: &str = "Build CRUD API with Rust and MongoDB";

    let response_json = &GenericResponse {
        status: "success".to_string(),
        message: MESSAGE.to_string(),
    };
    Ok(json(response_json))
}