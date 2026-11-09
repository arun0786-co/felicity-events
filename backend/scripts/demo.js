// runs the api against a throwaway in-memory mongodb with demo data, so
// the app can be tried without installing or configuring a database

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../src/app.js";
import { seed } from "./seed.js";

process.env.JWT_SECRET ||= "demo-only-secret";
const PORT = process.env.PORT || 3000;

const mongod = await MongoMemoryServer.create();
await mongoose.connect(mongod.getUri());
await mongoose.connection.syncIndexes();
await seed();

createApp().listen(PORT, () => {
  console.log(`demo api on http://localhost:${PORT}/api (data is lost on exit)`);
  console.log("logins: admin@example.com, chess@example.com, music@example.com,");
  console.log("        robotics@example.com, asha@example.com, vikram@example.com");
});
