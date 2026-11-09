import http from "node:http";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { createApp } from "../src/app.js";
import User from "../src/models/user.js";
import Event from "../src/models/event.js";

process.env.JWT_SECRET = "test-secret";

// starts an in-memory mongod and the app on a free port
export async function startServer() {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await mongoose.connection.syncIndexes();
  const server = http.createServer(createApp());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  return {
    base,
    async stop() {
      await new Promise((resolve) => server.close(resolve));
      await mongoose.disconnect();
      await mongod.stop();
    },
  };
}

export async function resetDb() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

export function tokenFor(user) {
  return jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET);
}

let counter = 0;
export async function makeUser(role, extra = {}) {
  counter += 1;
  return User.create({
    firstName: role,
    lastName: String(counter),
    email: `${role}${counter}@example.com`,
    password: "not-a-real-hash",
    role,
    ...extra,
  });
}

export async function makeUsers(role, n) {
  const docs = [];
  for (let i = 0; i < n; i++) {
    counter += 1;
    docs.push({
      firstName: role,
      lastName: String(counter),
      email: `${role}${counter}@example.com`,
      password: "not-a-real-hash",
      role,
    });
  }
  return User.insertMany(docs);
}

export async function makeEvent(organizer, fields) {
  return Event.create({
    name: "test event",
    description: "test",
    organizer: organizer._id,
    status: "published",
    ...fields,
  });
}

export async function api(base, method, path, token, body) {
  const res = await fetch(base + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, body: json };
}
