mod db;
mod error;
mod handler;
mod minio_bucket;
mod model;
mod response;

use db::DB;
use dotenv::dotenv;
use minio_bucket::MinioBucket;
use std::convert::Infallible;
use warp::{filters::body::json, http::Method, Filter, Rejection};

type Result<T> = std::result::Result<T, error::Error>;
type WebResult<T> = std::result::Result<T, Rejection>;

#[tokio::main]
async fn main() -> Result<()> {
    if std::env::var_os("RUST_LOG").is_none() {
        std::env::set_var("RUST_LOG", "api=info");
    }
    pretty_env_logger::init();
    dotenv().ok();

    let bucket = MinioBucket::init().await;

    let db = DB::init().await?;

    let cors = warp::cors()
        .allow_methods(&[Method::GET, Method::PUT, Method::POST])
        .allow_origins(vec!["http://localhost:3000"])
        .allow_headers(vec!["content-type"])
        .allow_credentials(true);

    let materials_endpoint = warp::path!("api" / "materials");
    let designs_endpoint = warp::path!("api" / "designs");
    let add_image_endpoint = warp::path!("api" / "images" / String);

    let health_checker = warp::path!("api" / "healthchecker")
        .and(warp::get())
        .and_then(handler::health_checker_handler);

    let get_designs_route = designs_endpoint
        .and(warp::get())
        .and(with_db(db.clone()))
        .and_then(handler::get_designs_handler);

    let get_materials_route = materials_endpoint
        .and(warp::get())
        .and(with_db(db.clone()))
        .and_then(handler::get_materials_handler);

    let add_material_route = materials_endpoint
        .and(warp::put())
        .and(json())
        .and(with_db(db.clone()))
        .and_then(handler::add_materials_handler);

    let add_image_route = add_image_endpoint
        .and(warp::post())
        .and(warp::multipart::form())
        .and(with_bucket(bucket.clone()))
        .and_then(handler::add_image);

    let routes = get_designs_route
        .with(warp::log("api"))
        .or(add_material_route)
        .or(get_materials_route)
        .or(add_image_route)
        .or(health_checker)
        .with(cors)
        .recover(error::handle_rejection);

    println!("🚀 Server started successfully");
    warp::serve(routes).run(([0, 0, 0, 0], 3001)).await;

    Ok(())
}

fn with_db(db: DB) -> impl Filter<Extract = (DB,), Error = Infallible> + Clone {
    warp::any().map(move || db.clone())
}

fn with_bucket(
    bucket: MinioBucket,
) -> impl Filter<Extract = (MinioBucket,), Error = Infallible> + Clone {
    warp::any().map(move || bucket.clone())
}

/*   let base = BaseMaterialType {
        name: "test".to_owned(),
        brand: "test".to_owned(),
        diameter: 5,
        purchase_url: "test".to_owned(),
        material_type: model::MaterialType::WIRE,
    };

    let wire = Wire {
        base_material_type: base,
        wire_type: model::WireType::FULL,
        metal_type: model::MetalType::GOLD,
        length: 5,
        price_per_meter: 5,
    };

    let material = Material::Wire(wire);

    println!("{}", serde_json::to_string(&material).unwrap());
*/
