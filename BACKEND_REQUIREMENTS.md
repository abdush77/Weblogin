# Backend Requirements for New Features

## New REST API Endpoints

### Groups & Channels

GET    /api/groups                    — foydalanuvchining barcha guruhlari va kanallari
POST   /api/groups                    — guruh/kanal yaratish
  body: { name, description, type: "group"|"channel", memberIds: [userId, ...] }

GET    /api/groups/:id                — guruh ma'lumotlari
GET    /api/groups/:id/messages       — guruh xabarlari
POST   /api/groups/:id/members        — a'zo qo'shish  { userId }
DELETE /api/groups/:id/members/:uid   — a'zoni o'chirish

### Stories

GET    /api/stories       — barcha kontaktlarning faol storylari (24 soat ichida)
POST   /api/stories       — story qo'shish
  multipart: { media (file), type: "image"|"video"|"text", text?, bg? }
  OR json: { type: "text", text, bg }
POST   /api/stories/:id/view — storiyni ko'rilgan deb belgilash

### Location (existing messages endpoint — qo'shimcha fieldlar)

POST /api/messages (socket: message:send) supports extra fields:
  type: "location" | "live_location"
  latitude: Number
  longitude: Number
  isLive: Boolean
  expiresAt: ISO date string

---

## New Socket Events

### Group messaging
Client emits:
  "group:message:send"  { groupId, text }

Server broadcasts to group members:
  "group:message"  { groupId, message: { _id, sender, text, createdAt } }

### Live Location
Client emits:
  "location:live:update"  { messageId, receiverId, latitude, longitude }

Server forwards to receiver:
  "location:live:update"  { messageId, latitude, longitude }

### Stories
Server broadcasts to contacts:
  "story:new"  { userId, username, items: [...] }

---

## Group Model (MongoDB)

{
  _id: ObjectId,
  name: String,
  description: String,
  type: "group" | "channel",  // default: "group"
  members: [ObjectId],        // ref: User
  admins: [ObjectId],         // ref: User
  createdBy: ObjectId,        // ref: User
  lastMessage: {
    text: String,
    sender: ObjectId,
    createdAt: Date
  },
  createdAt: Date,
  updatedAt: Date
}

## Story Model (MongoDB)

{
  _id: ObjectId,
  userId: ObjectId,           // ref: User
  username: String,
  type: "image" | "video" | "text",
  mediaUrl: String,
  text: String,
  bg: String,                 // gradient for text stories
  viewed: [ObjectId],         // users who viewed
  createdAt: Date,
  expiresAt: Date             // createdAt + 24h
}
