use dotenv::dotenv;
use mongodb::{bson::doc, options::{ClientOptions, ServerApi, ServerApiVersion}, Client};
use std::env;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
struct Data {
    question: String,
    answer: i32
}

#[tokio::main]
async fn main() -> Result<(), mongodb::error::Error> {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE URL is not in .env file");

    println!("{}", database_url);

    let client = Client::with_uri_str(database_url).await?;

    let database_name = env::var("DATABASE_NAME").expect("DATABASE NAME is not in .env file");
    let db = client.database(&database_name);
    
    db.run_command(doc! { "ping": 1 }, None).await?;
    println!("Pinged your deployment. You successfully connected to MongoDB!");

    Ok(())
  
    
    // // get the reference to the Collection
    // let user_collection_name = env::var("USER_COLLECTION_NAME").expect("COLLECTION NAME is not in .env file");
    // let user_collection = db.collection(&user_collection_name);

    
}