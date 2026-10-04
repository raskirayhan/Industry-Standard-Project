
import dotenv from "dotenv";
import path from "path";

dotenv.config({path: path.join(process.cwd(),".env")});


export default {
    port: process.env.PORT,
    database_url : process.env.DATABASE_URL,
    app_url : process.env.APP_URL,
    bcrypt_salt_rounds : process.env.BCRYPT_SALT_ROUNDS,
    jwt_access_secret :  process.env.JWT_ACCESS_SECRET!,
    jwt_refresh_secret : process.env.JWT_REFRESH_SECRET!,
    jwt_access_expires_in : process.env.JWT_ACCESS_EXPIRES_IN!,
    jwt_refresh_expires_in : process.env.JWT_REFRESH_EXPIRES_IN!,
    google_client_id : process.env.GOOGLE_CLIENT_ID!,
    admin_name :process.env.ADMIN_NAME!,
    admin_email :process.env.ADMIN_EMAIL!,
    admin_password:process.env.ADMIN_PASSWORD!,
    redis_user:process.env.REDIS_USER!,
	redis_password:process.env.REDIS_PASSWORD!,
	redis_host:process.env.REDIS_HOST!,
	redis_port:process.env.REDIS_PORT!,
    smtp_user : process.env.SMTP_USER!,
	smtp_password: process.env.SMTP_PASSWORD!,
	email_sender : process.env.EMAIL_SENDER!,
    stripe_secret_key: process.env.STRIPE_SECRET_KEY!,
    stripe_webhook_key:process.env.STRIPE_WEBHOOK_KEY!,
    cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
	cloudinary_api_key: process.env.CLOUDINARY_API_KEY!,
	cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET!,

}