// many requests for the same seats or stock at the same moment. the
// server must never hand out more than it has, whatever the order in
// which the requests interleave.

import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

import Registration from "../src/models/registration.js";
import Event from "../src/models/event.js";
import {
  startServer, resetDb, makeUser, makeUsers, makeEvent, tokenFor, api,
} from "./helpers.js";

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });
beforeEach(async () => { await resetDb(); });

const statuses = (results) => {
  const out = {};
  for (const r of results) out[r.status] = (out[r.status] || 0) + 1;
  return out;
};

test("200 people race for 50 seats", async () => {
  const org = await makeUser("organizer");
  const event = await makeEvent(org, { type: "normal", registrationLimit: 50 });
  const people = await makeUsers("participant", 200);

  const results = await Promise.all(
    people.map((p) => api(srv.base, "POST", `/events/${event._id}/register`, tokenFor(p), {}))
  );
  const seated = await Registration.countDocuments({ event: event._id, status: "registered" });
  console.log("seats: 50, registered:", seated, "responses:", statuses(results));
  assert.equal(seated, 50);
  assert.equal(results.filter((r) => r.status === 201).length, 50);
});

test("one person double-clicks register 20 times", async () => {
  const org = await makeUser("organizer");
  const event = await makeEvent(org, { type: "normal", registrationLimit: 100 });
  const p = await makeUser("participant");
  const t = tokenFor(p);

  const results = await Promise.all(
    Array.from({ length: 20 }, () => api(srv.base, "POST", `/events/${event._id}/register`, t, {}))
  );
  const mine = await Registration.countDocuments({ event: event._id, user: p._id, status: "registered" });
  console.log("registrations for one user:", mine, "responses:", statuses(results));
  assert.equal(mine, 1);
});

test("100 buyers race for 20 t-shirts", async () => {
  const org = await makeUser("organizer");
  const event = await makeEvent(org, { type: "merchandise", stockQuantity: 20, purchaseLimitPerUser: 1 });
  const people = await makeUsers("participant", 100);

  const results = await Promise.all(
    people.map((p) => api(srv.base, "POST", `/events/${event._id}/register`, tokenFor(p), {}))
  );
  const sold = await Registration.countDocuments({ event: event._id, status: "registered" });
  const after = await Event.findById(event._id);
  console.log("stock: 20, orders:", sold, "stock left:", after.stockQuantity, "responses:", statuses(results));
  assert.equal(sold, 20);
  assert.equal(after.stockQuantity, 0);
});

test("40 buyers race for 5 size-S shirts", async () => {
  const org = await makeUser("organizer");
  const event = await makeEvent(org, {
    type: "merchandise",
    stockQuantity: 10,
    purchaseLimitPerUser: 1,
    merchandiseVariants: [{ name: "S", stock: 5 }, { name: "M", stock: 5 }],
  });
  const people = await makeUsers("participant", 40);

  const results = await Promise.all(
    people.map((p) =>
      api(srv.base, "POST", `/events/${event._id}/register`, tokenFor(p), { merchandiseVariant: "S" })
    )
  );
  const sold = await Registration.countDocuments({ event: event._id, status: "registered" });
  const after = await Event.findById(event._id);
  const s = after.merchandiseVariants.find((v) => v.name === "S").stock;
  const m = after.merchandiseVariants.find((v) => v.name === "M").stock;
  console.log("S stock: 5, orders:", sold, "S left:", s, "M left:", m, "total left:", after.stockQuantity, "responses:", statuses(results));
  assert.equal(sold, 5);
  assert.equal(s, 0);
  assert.equal(m, 5);
  assert.equal(after.stockQuantity, 5);
});

test("cancelling frees the seat for someone else", async () => {
  const org = await makeUser("organizer");
  const event = await makeEvent(org, { type: "normal", registrationLimit: 1 });
  const [a, b] = await makeUsers("participant", 2);

  assert.equal((await api(srv.base, "POST", `/events/${event._id}/register`, tokenFor(a), {})).status, 201);
  assert.equal((await api(srv.base, "POST", `/events/${event._id}/register`, tokenFor(b), {})).status, 400);
  assert.equal((await api(srv.base, "DELETE", `/events/${event._id}/cancel`, tokenFor(a))).status, 200);
  assert.equal((await api(srv.base, "POST", `/events/${event._id}/register`, tokenFor(b), {})).status, 201);
  // and a cancelled user can register again
  assert.equal((await api(srv.base, "DELETE", `/events/${event._id}/cancel`, tokenFor(b))).status, 200);
  assert.equal((await api(srv.base, "POST", `/events/${event._id}/register`, tokenFor(a), {})).status, 201);
});

test("one buyer fires 10 orders against a limit of 2", async () => {
  const org = await makeUser("organizer");
  const event = await makeEvent(org, { type: "merchandise", stockQuantity: 100, purchaseLimitPerUser: 2 });
  const p = await makeUser("participant");
  const t = tokenFor(p);

  const results = await Promise.all(
    Array.from({ length: 10 }, () => api(srv.base, "POST", `/events/${event._id}/register`, t, {}))
  );
  const mine = await Registration.countDocuments({ event: event._id, user: p._id, status: "registered" });
  const after = await Event.findById(event._id);
  console.log("purchase limit: 2, orders kept:", mine, "stock left:", after.stockQuantity, "responses:", statuses(results));
  assert.ok(mine <= 2);
  assert.equal(after.stockQuantity, 100 - mine);
});

test("a cancel sent 5 times returns the shirt once", async () => {
  const org = await makeUser("organizer");
  const event = await makeEvent(org, { type: "merchandise", stockQuantity: 3, purchaseLimitPerUser: 1 });
  const p = await makeUser("participant");
  const t = tokenFor(p);
  assert.equal((await api(srv.base, "POST", `/events/${event._id}/register`, t, {})).status, 201);

  const results = await Promise.all(
    Array.from({ length: 5 }, () => api(srv.base, "DELETE", `/events/${event._id}/cancel`, t))
  );
  const after = await Event.findById(event._id);
  console.log("stock after one order and 5 cancels:", after.stockQuantity, "responses:", statuses(results));
  assert.equal(after.stockQuantity, 3);
});

async function ticketsFor(event, n) {
  const people = await makeUsers("participant", n);
  const regs = [];
  for (const p of people) {
    const r = await api(srv.base, "POST", `/events/${event._id}/register`, tokenFor(p), {});
    assert.equal(r.status, 201);
    regs.push(r.body.registration);
  }
  return regs;
}

test("two gates scan the same ticket at once", async () => {
  const org = await makeUser("organizer");
  const event = await makeEvent(org, { type: "normal" });
  const [reg] = await ticketsFor(event, 1);
  const t = tokenFor(org);

  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      api(srv.base, "POST", `/events/${event._id}/qr-scan`, t, { qrData: reg.ticketId })
    )
  );
  const after = await Event.findById(event._id);
  console.log("one ticket scanned 10 times: accepted", results.filter((r) => r.status === 200).length,
    "attendanceCount", after.attendanceCount);
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  assert.equal(after.attendanceCount, 1);
});

test("100 different tickets scanned at once are all counted", async () => {
  const org = await makeUser("organizer");
  const event = await makeEvent(org, { type: "normal" });
  const regs = await ticketsFor(event, 100);
  const t = tokenFor(org);

  await Promise.all(
    regs.map((r) => api(srv.base, "POST", `/events/${event._id}/qr-scan`, t, { qrData: r.ticketId }))
  );
  const after = await Event.findById(event._id);
  console.log("100 tickets scanned, attendanceCount:", after.attendanceCount);
  assert.equal(after.attendanceCount, 100);
});
