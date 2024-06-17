use dotenv::dotenv;
use mongodb::{bson::{doc, document}, options::{ClientOptions, ServerApi, ServerApiVersion}, Client, Collection};
use std::env;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
struct Entry {
    test: String,
    number: i32
}

use warp::{reply::json, Filter, Rejection, Reply};

type WebResult<T> = std::result::Result<T, Rejection>;

#[derive(Serialize)]
pub struct GenericResponse {
    pub status: String,
    pub message: String,
}

pub async fn health_checker_handler() -> WebResult<impl Reply> {
    const MESSAGE: &str = "Build Simple CRUD API with Rust";

    let response_json = &GenericResponse {
        status: "success".to_string(),
        message: MESSAGE.to_string(),
    };
    Ok(json(response_json))
}

#[tokio::main]
async fn main() {
    if std::env::var_os("RUST_LOG").is_none() {
        std::env::set_var("RUST_LOG", "api=info");
    }
    pretty_env_logger::init();

    let health_checker = warp::path!("api" / "healthchecker")
        .and(warp::get())
        .and_then(health_checker_handler);

    let routes = health_checker.with(warp::log("api"));

    println!("🚀 Server started successfully");
    warp::serve(routes).run(([0, 0, 0, 0], 3001)).await;
} 


// #[tokio::main]
// async fn main() -> Result<(), mongodb::error::Error> {
//     dotenv().ok();

//     let database_url = env::var("DATABASE_URL").expect("DATABASE URL is not in .env file");

//     println!("{}", database_url);

//     let client = Client::with_uri_str(database_url).await?;

//     let database_name = env::var("DATABASE_NAME").expect("DATABASE NAME is not in .env file");
//     let db = client.database(&database_name);
    
//     db.run_command(doc! { "ping": 1 }, None).await?;
//     println!("Pinged your deployment. You successfully connected to MongoDB!");

    
  
//     let user_collection_name = env::var("USER_COLLECTION_NAME").expect("COLLECTION NAME is not in .env file");
//     let user_collection: Collection<Entry> = db.collection(&user_collection_name);

//     let filter = doc! {"test": "name3"};
//     let result = user_collection.find_one(filter, None).await?;

//     println!("does user collection work? {}", user_collection.name());

//     match result {
//         Some(ref document) => {
//             let test = document.test.clone();
//             let number = document.number;

//             println!("Found entry with test {} and number {}", test, number);
//         }
//         None => println!("No Worky")
//     }

//     Ok(())
// }