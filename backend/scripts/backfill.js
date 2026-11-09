// one-off migration for a database created before seats were counted on
// the event: fills Event.registeredCount and Registration.eventType, then
// builds the index that allows one active seat per user. run it once
// with the api stopped: npm run backfill

import dotenv from "dotenv";
import mongoose from "mongoose";
import Event from "../src/models/event.js";
import Registration from "../src/models/registration.js";

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);

for (const event of await Event.find({}, { type: 1 })) {
  await Registration.updateMany({ event: event._id }, { $set: { eventType: event.type } });
  if (event.type === "normal") {
    const n = await Registration.countDocuments({ event: event._id, status: "registered" });
    await Event.updateOne({ _id: event._id }, { $set: { registeredCount: n } });
  }
}

// users already holding two active seats in one event block the unique index
const dupes = await Registration.aggregate([
  { $match: { status: "registered", eventType: "normal" } },
  { $group: { _id: { user: "$user", event: "$event" }, n: { $sum: 1 } } },
  { $match: { n: { $gt: 1 } } },
]);
if (dupes.length) {
  console.log(`${dupes.length} user/event pairs have more than one active registration;`);
  console.log("cancel the extra ones, then run this again");
  console.log(JSON.stringify(dupes.slice(0, 20), null, 2));
} else {
  await Registration.syncIndexes();
  console.log("backfill done");
}
await mongoose.disconnect();
