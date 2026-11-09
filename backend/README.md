# Event Management System - Backend

This is the backend for the Event Management system designed for Felicity. It is built using Node.js and Express.js and connects to a MongoDB database. 

## Technology Stack Justification
- **Node.js**: As a Javascript runtime, Node provides an efficient, non-blocking asynchronous architecture perfect for handling multiple concurrent requests, like event registrations and live chat.
- **Express.js**: It's a minimal, flexible web framework that makes it very simple to implement robust REST APIs and middleware (like JWT checks).
- **MongoDB**: A NoSQL database is ideal for this application because the structure of events (specially with dynamic form fields) can vary widely. It gives us the flexibility we need.
- **Mongoose**: Provides schema validation and easy interactions with MongoDB.
- **JWT (JSON Web Tokens)**: Used for secure, stateless authentication and authorization.
- **Bcrypt**: For hashing user passwords securely.
- **QRCode**: Used to dynamically generate QR codes for event tickets.

## Features Implemented
This backend implements the Core System requirements, along with features from Tiers A, B, and C as required.

### Tier A: Core Advanced Features
1. **Merchandise Payment Approval Workflow (8 Marks)**
   - Includes state management (pending/approved/rejected).
   - QR code generation and stock decrement are withheld until a payment is explicitly approved by the Organizer.
2. **QR Scanner & Attendance Tracking (8 Marks)**
   - Dedicated endpoint `POST /api/events/:eventId/qr-scan`.
   - Organizers can scan QR codes to mark attendance and reject duplicates. Also includes a manual override option, both of which are tracked in an audit log on the registration document.
   - Includes a live dashboard and CSV export features.

### Tier B: Real-time & Communication Features
1. **Real-Time Discussion Forum (6 Marks)**
   - API endpoints under `routes/forumroutes.js`.
   - Participants can post messages and reply to others. 
   - Organizers can delete, pin messages, and post official announcements.
   - Supports threaded discussions and emoji reactions.
2. **Organizer Password Reset Workflow (6 Marks)**
   - API endpoints under `routes/passwordresetroutes.js`.
   - Organizers request a reset which goes to a "pending" queue for the Admin.
   - Admin approves or rejects; if approved, a new secure random password is generated and securely hashed.

### Tier C: Integration & Enhancement Features
1. **Anonymous Feedback System (2 Marks)**
   - API endpoints under `routes/feedbackroutes.js`.
   - Participants can submit a 1-5 star rating and comment after the event finishes.
   - Feedback can be anonymous. Organizers get a dashboard to view the aggregation of scores without seeing user details.


