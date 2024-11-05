use serde::Serialize;

use crate::model::Design;

#[derive(Serialize)]
pub struct GenericResponse {
    pub status: String,
    pub message: String,
}

#[derive(Serialize, Debug)]
pub struct GetDesignsResponse {
    pub status: i32,
    pub body: Vec<Design>,
}
