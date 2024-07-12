use crate::model::Entry;
use crate::response::Response;
use mongodb::{Client, Collection};
use std::env;
use crate::{error::Error::*, Result};

#[derive(Clone, Debug)]
pub struct DB {
    pub entry_collection: Collection<Entry>
}

impl DB {
    pub async fn init() -> Result<Self> {

        let database_url = env::var("DATABASE_URL").expect("DATABASE URL is not in .env file");
        let database_name = env::var("DATABASE_NAME").expect("DATABASE NAME is not in .env file");
        
        let client = Client::with_uri_str(database_url).await?;

        let database = client.database(&database_name);

        let entry_collection: Collection<Entry> = database.collection("entries");

        println!("✅ Database connected successfully");

        Ok(Self {
            entry_collection
        })
    }

    pub async fn get_entries(&self) -> Result<Response> {
        let mut cursor = self.entry_collection.find(None, None).await.map_err(MongoQueryError)?;

        let mut entries: Vec<Entry> = Vec::new();

        while cursor.advance().await? {
            entries.push(cursor.deserialize_current()?)
        }

        let response_json = Response {
            status: 200,
            body: entries,
        };

        Ok(response_json)
    }
}
