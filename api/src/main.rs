mod db;
mod error;
mod handler;
mod model;
mod response;

use db::DB;
use dotenv::dotenv;
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

    let db = DB::init().await?;

    let cors = warp::cors()
        .allow_methods(&[Method::GET])
        .allow_origins(vec!["http://localhost:3000"])
        .allow_headers(vec!["content-type"])
        .allow_credentials(true);

    let add_material_endpoint = warp::path!("api" / "material");
    let get_designs_endpoint = warp::path!("api" / "designs");

    let health_checker = warp::path!("api" / "healthchecker")
        .and(warp::get())
        .and_then(handler::health_checker_handler);

    let get_designs_route = get_designs_endpoint
        .and(warp::get())
        .and(with_db(db.clone()))
        .and_then(handler::get_designs_handler);

    let add_material_route = add_material_endpoint
        .and(warp::put())
        .and(json())
        .and(with_db(db.clone()))
        .and_then(handler::add_materials_handler);

    let routes = get_designs_route
        .with(warp::log("api"))
        .or(add_material_route)
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
