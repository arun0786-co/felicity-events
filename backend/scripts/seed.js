// demo data: an admin, three clubs, a few participants and events of
// both kinds. every demo account uses the password "demo1234".

import bcrypt from "bcrypt";
import User from "../src/models/user.js";
import Event from "../src/models/event.js";

export const DEMO_PASSWORD = "demo1234";

const days = (n) => new Date(Date.now() + n * 24 * 3600 * 1000);

export async function seed() {
  if (await User.exists({})) {
    console.log("database is not empty, skipping seed");
    return;
  }
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = (fields) => ({ password, isActive: true, ...fields });

  await User.create(user({ firstName: "Admin", lastName: "User", email: "admin@example.com", role: "admin" }));

  const [chess, music, robotics] = await User.create([
    user({ firstName: "Chess", lastName: "Club", email: "chess@example.com", role: "organizer",
      category: "Games", description: "Weekly blitz nights and an annual open." }),
    user({ firstName: "Music", lastName: "Club", email: "music@example.com", role: "organizer",
      category: "Cultural", description: "Open mics, jams and the fest concert." }),
    user({ firstName: "Robotics", lastName: "Club", email: "robotics@example.com", role: "organizer",
      category: "Technical", description: "Line followers, drones and workshops." }),
  ]);

  await User.create([
    user({ firstName: "Asha", lastName: "Rao", email: "asha@example.com", role: "participant",
      participantType: "NON_IIIT", college: "Example College", interests: ["Games", "Technical"] }),
    user({ firstName: "Vikram", lastName: "Nair", email: "vikram@example.com", role: "participant",
      participantType: "NON_IIIT", college: "Example College", interests: ["Cultural"] }),
  ]);

  await Event.create([
    {
      name: "Blitz Open", type: "normal", organizer: chess._id, status: "published",
      description: "Nine rounds of 3+2 blitz. Bring your own clock if you have one.",
      venue: "Seminar Hall", eligibility: "Everyone", registrationLimit: 64, registrationFee: 0,
      registrationDeadline: days(6), startDate: days(8), endDate: days(8.2), tags: ["chess", "games"],
      customFields: [{ label: "Rating (if any)", fieldType: "text", required: false }],
    },
    {
      name: "Open Mic Night", type: "normal", organizer: music._id, status: "published",
      description: "Ten-minute slots for songs, poems or stand-up.",
      venue: "Amphitheatre", eligibility: "Everyone", registrationLimit: 20, registrationFee: 0,
      registrationDeadline: days(3), startDate: days(5), endDate: days(5.15), tags: ["music"],
    },
    {
      name: "Line Follower Workshop", type: "normal", organizer: robotics._id, status: "published",
      description: "Build and tune a line-following robot in one afternoon. Kits provided.",
      venue: "Lab 2", eligibility: "Everyone", registrationLimit: 30, registrationFee: 200,
      registrationDeadline: days(9), startDate: days(12), endDate: days(12.2), tags: ["robotics", "workshop"],
    },
    {
      name: "Fest T-shirt", type: "merchandise", organizer: music._id, status: "published",
      description: "Black cotton tee with this year's logo. Pay by UPI and upload the receipt.",
      registrationFee: 450, purchaseLimitPerUser: 2, stockQuantity: 60,
      merchandiseVariants: [{ name: "S", stock: 15 }, { name: "M", stock: 25 }, { name: "L", stock: 20 }],
      registrationDeadline: days(10), tags: ["merch"],
    },
  ]);
  console.log(`seeded demo data; every account uses the password "${DEMO_PASSWORD}"`);
}
