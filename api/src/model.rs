use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Design {
    material: String,
    price: String,
    name: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(untagged)]
pub enum Material {
    Wire(Wire),
    Bead(Bead),
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Wire {
    #[serde(flatten)]
    pub base_material_type: BaseMaterialType,
    pub wire_type: WireType,
    pub metal_type: MetalType,
    pub length: i32,
    pub price_per_meter: i32,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Bead {
    #[serde(flatten)]
    pub base_material_type: BaseMaterialType,
    pub colour: String,
    pub quantity: i32,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub enum MaterialType {
    WIRE,
    BEAD,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BaseMaterialType {
    pub name: String,
    pub brand: String,
    pub diameter: i32,
    pub purchase_url: String,
    #[serde(rename = "type")]
    pub material_type: MaterialType,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub enum WireType {
    FULL,
    FILLED,
    PLATED,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub enum MetalType {
    BRASS,
    COPPER,
    SILVER,
    GOLD,
}
