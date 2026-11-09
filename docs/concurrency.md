# Concurrency in the booking paths

Node runs JavaScript on one thread, so it is tempting to assume requests cannot interfere. They can. Every `await` hands control back to the event loop, and another request runs until it reaches its own `await`. A handler written as

```js
const event = await Event.findById(id);       // 1. read
if (event.stockQuantity <= 0) return soldOut; // 2. check
await Registration.create(order);             // 3. act
event.stockQuantity -= 1;
await event.save();                           // 4. write
```

can be paused at any `await`. With 100 requests arriving together, all 100 finish step 1 before any of them reaches step 4, so all 100 see the same stock and all 100 pass. This is the check-then-act race. Several clients doing it at once is a time-of-check to time-of-use (TOCTOU) bug.

Step 4 has a second problem. `event.save()` writes `stockQuantity: N - 1`, where N is the value this request read. That value is the same for every request, so every request writes the same number: 100 orders, and the stock drops by one. This is a lost update. It explains the first test's "100 orders accepted, stock shows 19".

Running several API processes would make both races worse. Fixing them inside one process with a lock would not help, so the fix has to live in the database.

## 1. Atomic conditional updates

MongoDB applies an update to a single document atomically: the filter is matched and the update applied as one step. Putting the check into the filter makes check and act one operation:

```js
const r = await Event.updateOne(
  { _id, stockQuantity: { $gt: 0 } },     // check
  { $inc: { stockQuantity: -1 } }          // act
);
if (r.modifiedCount === 0) return soldOut;
```

With stock 20 and 100 requests, 20 updates match and 80 find no document. `$inc` is applied by the server, so no update is lost.

**Sizes.** For a size, the filter also needs that variant to have stock. The positional operator `$` then decrements the element the filter matched:

```js
{ _id, stockQuantity: { $gt: 0 },
  merchandiseVariants: { $elemMatch: { name: "S", stock: { $gt: 0 } } } }
{ $inc: { stockQuantity: -1, "merchandiseVariants.$.stock": -1 } }
```

**Seats.** Seats used to be counted with `countDocuments` over registrations. A count cannot be part of a single-document update, so the event now carries `registeredCount`. The filter compares two fields of the same document with `$expr`:

```js
{ _id, $expr: { $lt: [{ $ifNull: ["$registeredCount", 0] }, "$registrationLimit"] } }
{ $inc: { registeredCount: 1 } }
```

**Order of steps.** Reserve first, then insert the registration. If the insert fails, give the seat back. The reverse order (insert, then reserve) would leave a registration without a seat if the process died between the two steps. This order can at worst leave an empty seat counted as taken.

## 2. A unique index for "one seat per person"

"Has this user already registered?" is also check-then-act. Here the right tool is a unique index:

```js
registrationSchema.index(
  { user: 1, event: 1 },
  { unique: true, partialFilterExpression: { status: "registered", eventType: "normal" } }
);
```

The index is partial in two ways:
- It covers only *active* registrations, so a cancelled registration does not block registering again.
- It covers only normal events, since merchandise allows several orders per user.

The second of two simultaneous inserts fails with error 11000. The handler gives back the seat it reserved and answers "already registered". The `findOne` check before it stays, because it gives the usual answer without reserving and releasing a seat.

## 3. Validate after insert, for per-user limits

"At most 2 shirts per person" cannot be one conditional update on the event: the counter would be per user and per event. Instead each order inserts itself, then counts the user's active orders, own included. If the count is over the limit, the order deletes itself and returns its item.

Why this never exceeds the limit: an order is kept only if its count, taken after its own insert, was within the limit. An order inserted later counts every order already present, the kept ones included.

The cost is false rejections. Two orders that both count 3 against a limit of 2 both delete themselves, and the user retries. The tests check the guarantee that matters: at most 2 kept, and stock reduced by exactly the number kept.

## 4. State transitions match the old state

Cancel, approve, reject and scan move a document from one state to another. Each is one `findOneAndUpdate` whose filter is the old state:

```js
// cancel: only the request that finds it "registered" restores stock
findOneAndUpdate({ user, event, status: "registered" }, { $set: { status: "cancelled" } })

// approve or reject: only a pending order of an active registration
findOneAndUpdate({ _id, status: "registered", paymentStatus: "pending" }, { $set: { paymentStatus } })

// scan: only the scan that sets attended from false to true counts the person
findOneAndUpdate({ _id, attended: { $ne: true } }, { $set: { attended: true }, $push: { auditLog } })
```

A duplicate request matches nothing and gets a 400 or 404. Including `status: "registered"` in the reject filter also closes a race between a participant cancelling and an organizer rejecting the same order. Before, both could return the item to stock.

## 5. The bugs that were not races

- **Approving the last item.** Stock is taken when the order is placed. Approval still checked `stockQuantity <= 0`, so the order that took the last shirt could never be approved.
- **Cancelled tickets.** A cancelled registration keeps its QR image. The QR scan path never checked `status`, so a cancelled ticket still got in. The manual attendance endpoint did check it.
- **Re-entry.** A manual override on an already scanned ticket incremented `attendanceCount` again.

## How the tests work

`backend/test/helpers.js` starts `mongodb-memory-server`, a real `mongod` binary with in-memory storage, and mounts the Express app on an ephemeral port. Tests use `fetch` against that port, so requests go through the HTTP parser, the JWT middleware and the controllers exactly as in production. Concurrency comes from `Promise.all` over many requests: they all enter the event loop before the first handler finishes.

The tests went in before the fixes. On the original code 11 of the 15 race and workflow tests failed; the numbers in the README's table come from those runs.

## Further reading

- MongoDB, [atomicity and transactions](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/)
- MongoDB, [partial indexes](https://www.mongodb.com/docs/manual/core/index-partial/)
- M. Kleppmann, *Designing Data-Intensive Applications*, chapter 7, on lost updates and write skew
