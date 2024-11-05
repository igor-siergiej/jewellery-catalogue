use crate::model::{Design, Material};
use crate::response::{GenericResponse, GetDesignsResponse, GetMaterialsResponse};
use crate::{error::Error::*, Result};
use mongodb::{Client, Collection};
use std::env;

#[derive(Clone, Debug)]
pub struct DB {
    pub design_collection: Collection<Design>,
    pub material_collection: Collection<Material>,
}

impl DB {
    pub async fn init() -> Result<Self> {
        let database_url = env::var("DATABASE_URL").expect("DATABASE URL is not in .env file");
        let database_name = env::var("DATABASE_NAME").expect("DATABASE NAME is not in .env file");

        let client = Client::with_uri_str(database_url).await?;

        let database = client.database(&database_name);

        let design_collection: Collection<Design> = database.collection("designs");
        let material_collection: Collection<Material> = database.collection("materials");

        println!("✅ Database connected successfully");

        Ok(Self {
            design_collection,
            material_collection,
        })
    }

    pub async fn get_designs(&self) -> Result<GetDesignsResponse> {
        let mut cursor = self
            .design_collection
            .find(None, None)
            .await
            .map_err(MongoQueryError)?;

        let mut design: Vec<Design> = Vec::new();

        while cursor.advance().await? {
            design.push(cursor.deserialize_current()?)
        }

        let response_json = GetDesignsResponse {
            status: 200,
            body: design,
        };

        Ok(response_json)
    }

    pub async fn get_materials(&self) -> Result<GetMaterialsResponse> {
        let mut cursor = self
            .material_collection
            .find(None, None)
            .await
            .map_err(MongoQueryError)?;

        let mut materials: Vec<Material> = Vec::new();

        while cursor.advance().await? {
            materials.push(cursor.deserialize_current()?)
        }

        let response_json = GetMaterialsResponse {
            status: 200,
            body: materials,
        };

        Ok(response_json)
    }

    pub async fn add_material(&self, material: Material) -> Result<GenericResponse> {
        self.material_collection.insert_one(material, None).await?;

        let response_json = GenericResponse {
            status: "success".into(),
            message: String::from("Added Material successfully"),
        };

        Ok(response_json)
    }
}
