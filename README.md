# letsTalk

A lightweight real-time community chat app built with Node.js, Express,
MongoDB, and Socket.IO. The browser client uses modular vanilla JavaScript and
CSS—there is no frontend framework or build step.

## Features

- Public and private rooms with roles, membership, invites, and unread counts
- Real-time room chat with presence, typing, replies, reactions, editing, and deletion
- Private conversations with live presence, typing, read tracking, and pagination
- Message search, multiline composition, emoji insertion, and per-room drafts
- User profiles, bios, password management, and cropped avatar uploads
- Responsive, accessible UI with keyboard shortcuts and reduced-motion support

## Run locally

Create a `.env` file with the MongoDB, session, Redis, and optional Cloudinary
settings expected by the files in `config/`, then run:

```sh
npm install
npm run dev
```

The app defaults to `http://localhost:3000` and exposes `/health` for health checks.
