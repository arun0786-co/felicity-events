// single-request rules that the concurrency fixes touch

import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

import Event from "../src/models/event.js";
import {
  startServer, resetDb, makeUser, makeEvent, tokenFor, api,
} from "./helpers.js";

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });
beforeEach(async () => { await resetDb(); });

test("the order for the last item can be approved", async () => {
  const org = await makeUser("organizer");
  const event = await makeEvent(org, { type: "merchandise", stockQuantity: 1, purchaseLimitPerUser: 1 });
  const p = await makeUser("participant");
  const order = await api(srv.base, "POST", `/events/${event._id}/register`, tokenFor(p), {});
  assert.equal(order.status, 201);

  const r = await api(srv.base, "PATCH",
    `/events/${event._id}/registrations/${order.body.registration._id}/payment`,
    tokenFor(org), { status: "approved" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await Event.findById(event._id)).stockQuantity, 0);
});

test("rejecting a payment returns the item once", async () => {
  const org = await makeUser("organizer");
  const event = await makeEvent(org, { type: "merchandise", stockQuantity: 2, purchaseLimitPerUser: 1 });
  const p = await makeUser("participant");
  const order = await api(srv.base, "POST", `/events/${event._id}/register`, tokenFor(p), {});
  const path = `/events/${event._id}/registrations/${order.body.registration._id}/payment`;

  const results = await Promise.all(
    Array.from({ length: 5 }, () => api(srv.base, "PATCH", path, tokenFor(org), { status: "rejected" }))
  );
  assert.equal(results.filter((x) => x.status === 200).length, 1);
  assert.equal((await Event.findById(event._id)).stockQuantity, 2);
});

test("a cancelled ticket does not get in", async () => {
  const org = await makeUser("organizer");
  const event = await makeEvent(org, { type: "normal" });
  const p = await makeUser("participant");
  const reg = await api(srv.base, "POST", `/events/${event._id}/register`, tokenFor(p), {});
  await api(srv.base, "DELETE", `/events/${event._id}/cancel`, tokenFor(p));

  const scan = await api(srv.base, "POST", `/events/${event._id}/qr-scan`, tokenFor(org),
    { qrData: reg.body.registration.ticketId });
  assert.equal(scan.status, 400);
  assert.equal((await Event.findById(event._id)).attendanceCount, 0);
});

test("a manual override on a scanned ticket does not count the person twice", async () => {
  const org = await makeUser("organizer");
  const event = await makeEvent(org, { type: "normal" });
  const p = await makeUser("participant");
  const reg = await api(srv.base, "POST", `/events/${event._id}/register`, tokenFor(p), {});
  const ticketId = reg.body.registration.ticketId;
  const t = tokenFor(org);

  assert.equal((await api(srv.base, "POST", `/events/${event._id}/qr-scan`, t, { qrData: ticketId })).status, 200);
  const again = await api(srv.base, "POST", `/events/${event._id}/qr-scan`, t,
    { qrData: ticketId, manualOverride: true, overrideNote: "re-entry" });
  assert.equal(again.status, 200);
  assert.equal((await Event.findById(event._id)).attendanceCount, 1);
});

test("a full event says so", async () => {
  const org = await makeUser("organizer");
  const event = await makeEvent(org, { type: "normal", registrationLimit: 1 });
  const [a, b] = [await makeUser("participant"), await makeUser("participant")];
  assert.equal((await api(srv.base, "POST", `/events/${event._id}/register`, tokenFor(a), {})).status, 201);
  const r = await api(srv.base, "POST", `/events/${event._id}/register`, tokenFor(b), {});
  assert.equal(r.status, 400);
  assert.match(r.body.message, /fully booked/);
});

test("registration needs a published event and a participant", async () => {
  const org = await makeUser("organizer");
  const draft = await makeEvent(org, { type: "normal", status: "draft" });
  const p = await makeUser("participant");
  assert.equal((await api(srv.base, "POST", `/events/${draft._id}/register`, tokenFor(p), {})).status, 400);
  assert.equal((await api(srv.base, "POST", `/events/${draft._id}/register`, tokenFor(org), {})).status, 403);
  assert.equal((await api(srv.base, "POST", `/events/${draft._id}/register`, null, {})).status, 401);
});
