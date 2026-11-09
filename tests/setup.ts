import "dotenv/config";
// Integration tests must never touch the dev database.
if (process.env.DATABASE_URL_TEST) process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
