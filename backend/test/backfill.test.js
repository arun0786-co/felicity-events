// the backfill script on a database written by the old code: seat counts
// and event types are filled in, and duplicate seats are reported
// instead of breaking the unique index

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const run = promisify(execFile);

test("backfill fills counts and types, then reports duplicates", async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri("old");
  const conn = await mongoose.createConnection(uri).asPromise();
  const events = conn.collection("events");
  const regs = conn.collection("registrations");

  const userA = new mongoose.Types.ObjectId(), userB = new mongoose.Types.ObjectId();
  const { insertedId: talk } = await events.insertOne({ name: "talk", type: "normal", registrationLimit: 10 });
  const { insertedId: tee } = await events.insertOne({ name: "tee", type: "merchandise", stockQuantity: 5 });
  await regs.insertMany([
    { user: userA, event: talk, ticketId: "t1", status: "registered" },
    { user: userB, event: talk, ticketId: "t2", status: "registered" },
    { user: userB, event: talk, ticketId: "t3", status: "cancelled" },
    { user: userA, event: tee, ticketId: "t4", status: "registered", paymentStatus: "pending" },
  ]);

  const env = { ...process.env, MONGODB_URI: uri };
  let out = await run("node", ["scripts/backfill.js"], { env });
  assert.match(out.stdout, /backfill done/);
  assert.equal((await events.findOne({ _id: talk })).registeredCount, 2);
  assert.equal((await regs.findOne({ ticketId: "t4" })).eventType, "merchandise");
  assert.ok((await regs.indexes()).some((i) => i.name === "one_active_seat_per_user"));

  // a second active seat for the same user, written before the index
  await regs.dropIndex("one_active_seat_per_user");
  await regs.insertOne({ user: userA, event: talk, ticketId: "t5", status: "registered" });
  out = await run("node", ["scripts/backfill.js"], { env });
  assert.match(out.stdout, /1 user\/event pairs have more than one active registration/);

  await conn.close();
  await mongod.stop();
});
