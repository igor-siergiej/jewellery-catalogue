use bytes::Buf;
use futures::TryStreamExt;
use s3::bucket::Bucket;
use s3::creds::Credentials;
use s3::region::Region;
use std::env;
use warp::reject::Reject;
use warp::{filters::multipart::FormData, reject::Rejection};

#[derive(Debug)]
pub struct MyError {
    pub message: String,
}

impl Reject for MyError {}

#[derive(Clone, Debug)]
pub struct MinioBucket {
    pub client: Bucket,
}

impl MinioBucket {
    pub async fn init() -> Self {
        let access_key = env::var("ACCESS_KEY").expect("ACCESS_KEY is not in .env file");
        let secret_key = env::var("SECRET_KEY").expect("SECRET_KEY is not in .env file");
        let url = env::var("BUCKET_URL").expect("BUCKET_URL is not in .env file");

        let bucket = Bucket::new_with_path_style(
            "images",
            Region::Custom {
                region: "".to_owned(),
                endpoint: url.to_owned(),
            },
            Credentials {
                access_key: Some(access_key.to_owned()),
                secret_key: Some(secret_key.to_owned()),
                security_token: None,
                session_token: None,
            },
        )
        .unwrap();

        let (_, code) = bucket.head_object("/").await.unwrap();

        if code == 200 {
            println!("✅ Bucket connected successfully");
        }

        Self { client: bucket }
    }

    pub async fn add_image(
        &self,
        file_name: String,
        mut form: FormData,
    ) -> Result<impl warp::Reply, Rejection> {
        let part = match form.try_next().await {
            Ok(Some(part)) => part,
            Ok(None) => {
                eprintln!("No parts found in form data");
                return Err(warp::reject::custom(MyError {
                    message: "No image file found in form data".to_string(),
                }));
            }
            Err(e) => {
                eprintln!("Error processing form  {}", e);
                return Err(warp::reject::custom(MyError {
                    message: format!("Error processing form  {}", e),
                }));
            }
        };

        let mut image_bytes = Vec::new();
        let mut part_stream = part.stream();
        while let Some(mut chunk) = part_stream.try_next().await.map_err(|e: warp::Error| {
            eprintln!("Error reading chunk: {}", e);
            warp::reject::custom(MyError {
                message: format!("Error reading image chunk: {}", e),
            })
        })? {
            image_bytes.extend_from_slice(&chunk.copy_to_bytes(chunk.remaining()));
        }

        self.client
            .put_object_with_content_type(file_name, &image_bytes[..], "image/jpeg")
            .await
            .unwrap();

        // TODO: maybe better error handling here

        Ok(warp::reply::with_status(
            "Image uploaded",
            warp::http::StatusCode::OK,
        ))
    }
}
