use crate::model::Design;
use crate::response::Response;
use mongodb::{Client, Collection};
use std::env;
use crate::{error::Error::*, Result};

#[derive(Clone, Debug)]
pub struct DB {
    pub design_collection: Collection<Design>
}

impl DB {
    pub async fn init() -> Result<Self> {

        let database_url = env::var("DATABASE_URL").expect("DATABASE URL is not in .env file");
        let database_name = env::var("DATABASE_NAME").expect("DATABASE NAME is not in .env file");
        
        let client = Client::with_uri_str(database_url).await?;

        let database = client.database(&database_name);

        let design_collection: Collection<Design> = database.collection("designs");

        println!("✅ Database connected successfully");

        Ok(Self {
            design_collection
        })
    }

    pub async fn get_designs(&self) -> Result<Response> {
        let mut cursor = self.design_collection.find(None, None).await.map_err(MongoQueryError)?;

        let mut design: Vec<Design> = Vec::new();

        while cursor.advance().await? {
            design.push(cursor.deserialize_current()?)
        }

        let response_json = Response {
            status: 200,
            body: design,
        };

        Ok(response_json)
    }
}
