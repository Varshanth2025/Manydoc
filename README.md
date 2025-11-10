# 📝 Manydoc – Real-Time Collaborative Document Editor

> **Collaborate. Edit. Save. Repeat.**  
> A real-time collaborative text editor built with the **MERN Stack** + **Socket.IO**, allowing multiple users to edit and persist documents simultaneously. Think of it as a minimalist Google Docs clone made for developers, by a developer.

---

## 🚀 Overview

**Manydoc** is a real-time collaborative document editor that enables multiple users to create, share, and edit text documents together — instantly and seamlessly.  
It leverages **Socket.IO** for real-time bi-directional communication and **MongoDB** for persistent data storage.

Built as a portfolio project to demonstrate:

- Advanced **websocket communication**
- **State synchronization** across clients
- **Database persistence**
- Modular full-stack architecture using **Node.js**, **Express**, **React**, and **MongoDB**

---

## ✨ Features

✅ **Real-Time Collaboration support upto 100 simultaneous users** – Changes made by one user instantly reflect for all others connected to the same document.  
✅ **Auto-Save Every 2 Seconds** – Your work is safely stored automatically.  
✅ **Persistent Documents** – Reloading a document restores it exactly as you left it.  
✅ **Unique Document URLs** – Each document is identified by a unique ID, enabling easy sharing.  
✅ **Quill.js Rich Text Editor** – Supports formatting, undo/redo, and delta-based editing.  
✅ **Scalable Backend** – Socket.IO server powered by Express and MongoDB for future scalability.

---

## 🏗️ Tech Stack

| Layer               | Technology Used                      |
| ------------------- | ------------------------------------ |
| **Frontend**        | React.js, Quill.js, Socket.IO Client |
| **Backend**         | Node.js, Express.js, Socket.IO       |
| **Database**        | MongoDB (Mongoose ORM)               |
| **Dev Tools**       | Nodemon, concurrently, VS Code       |
| **Version Control** | Git & GitHub                         |

---

## 🧩 Architecture

```
Client (React + Quill)
       ↓ WebSocket
Server (Express + Socket.IO)
       ↓
Database (MongoDB)
```

Each client connects to the backend via **Socket.IO**, where a unique room is created per document ID.  
Edits are broadcasted to all users in that room, and every few seconds, data is saved to MongoDB.

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/manydoc.git
cd manydoc
```

### 2️⃣ Install Dependencies

For both the client and server:

```bash
cd client && npm install
cd ../server && npm install
```

### 3️⃣ Run MongoDB Locally

Make sure MongoDB is running on your system:

```bash
mongod
```

### 4️⃣ Start the Server

```bash
cd server
npm run devstart
```

### 5️⃣ Start the Client

```bash
cd client
npm start
```

Then open your browser at:
👉 [http://localhost:3000](http://localhost:3000)

---

## 💾 Environment Variables

In your `server` directory, create a `.env` file:

```
MONGO_URI=mongodb://localhost/manydocs
PORT=3001
```

---

## 🧠 Learning Highlights

- Implemented **bi-directional event-based communication** using Socket.IO.
- Understood **Quill delta model** and collaborative editing.
- Practiced **modular structuring** of a MERN project.
- Built auto-save and state persistence for fault tolerance.

---
