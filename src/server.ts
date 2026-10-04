
import app from "./app";
import "dotenv/config";
import config from "./config";
import { prisma } from "./lib/prisma";
import { seedAdmin } from "./utils/seed";
import { redisClient } from "./lib/redis";

const PORT = config.port;


async function main() {
    try {
        await prisma.$connect();
        console.log("Connected to the database successfully.");

        await redisClient.connect();
		console.log("Redis Connected Successfully");
        await seedAdmin();
        
        app.listen(PORT,() =>{
            console.log(`Server is running on port ${PORT}`);
        })
    } catch (error) {
        console.log("Error starting the server:", error);
        await prisma.$disconnect();
        process.exit(1);
    }
}
    
main();
