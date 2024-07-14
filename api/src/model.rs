use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Design {
    material: String,
    price: String,
    name: String
}
