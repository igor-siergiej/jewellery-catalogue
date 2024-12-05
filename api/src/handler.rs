use crate::{
    db::DB, minio_bucket::MinioBucket, model::Material, response::GenericResponse, WebResult,
};
use warp::{filters::multipart::FormData, reject, reply::json, Reply};

pub async fn get_designs_handler(db: DB) -> WebResult<impl Reply> {
    let result_json = db.get_designs().await.map_err(|e| reject::custom(e))?;

    Ok(json(&result_json))
}

pub async fn get_materials_handler(db: DB) -> WebResult<impl Reply> {
    let result_json = db.get_materials().await.map_err(|e| reject::custom(e))?;

    Ok(json(&result_json))
}

pub async fn add_materials_handler(material: Material, db: DB) -> WebResult<impl Reply> {
    println!("MEOW");
    let result_json = db
        .add_material(material)
        .await
        .map_err(|e| reject::custom(e))?;

    Ok(json(&result_json))
}

pub async fn add_image(
    file_name: String,
    form: FormData,
    bucket: MinioBucket,
) -> WebResult<impl Reply> {
    let result_json = bucket.add_image(file_name, form).await.unwrap();

    Ok(result_json)
}

pub async fn health_checker_handler() -> WebResult<impl Reply> {
    const MESSAGE: &str = "Alive and Kicking!";

    let response_json = &GenericResponse {
        status: "success".to_string(),
        message: MESSAGE.to_string(),
    };
    Ok(json(response_json))
}
