use crate::{
    db::DB,
    model::{BaseMaterialType, Material, MaterialType, MetalType, Wire, WireType},
    response::GenericResponse,
    WebResult,
};
use warp::{reject, reply::json, Reply};

use serde_json::{Result, Value};

pub async fn get_designs_handler(db: DB) -> WebResult<impl Reply> {
    let result_json = db.get_designs().await.map_err(|e| reject::custom(e))?;

    Ok(json(&result_json))
}

pub async fn add_materials_handler(material: Material, db: DB) -> WebResult<impl Reply> {
    let result_json = db
        .add_material(material)
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
