use serde::Serialize;

use crate::model::Entry;

#[derive(Serialize)]
pub struct GenericResponse {
    pub status: String,
    pub message: String,
}


#[derive(Serialize, Debug)]
pub struct Response {
    pub status: i32,
    pub body: Vec<Entry>,
}