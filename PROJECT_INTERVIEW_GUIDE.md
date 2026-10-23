# Manydoc — Infosys SP/DSE Project Interview Guide

> **Repository:** `Varshanth2025/Manydoc`  
> **Inspected implementation:** React client + Node/Socket.IO server + MongoDB/Mongoose.  
> This guide is based on the repository code. README claims that are not fully enforced by the code are clearly marked for verification.

## 1. Project purpose and architecture

### Purpose
Manydoc is a browser-based collaborative document editor. A user opens a document URL, edits rich text using Quill, and receives edits made by other users connected to the same document. The document is periodically saved to MongoDB so it can be restored after reload.

### Architecture

```text
React + Quill editor
        │ Socket.IO client
        ▼
Node.js + Socket.IO server
        │ Mongoose
        ▼
MongoDB documents collection
```

- **Client:** Create React App, React Router, Quill, Socket.IO client, and UUID.
- **Server:** Node.js, Socket.IO, Mongoose, and Nodemon for development.
- **Persistence:** MongoDB document records containing an ID and Quill document data.
- **Collaboration model:** One Socket.IO room per document ID.
- **Communication:** WebSocket events rather than request/response HTTP APIs.

### End-to-end execution flow

1. `client/src/index.js` mounts `<App />` into the `root` DOM element.
2. `client/src/App.js` configures routes. Visiting `/` redirects to `/documents/${uuidV4()}`; visiting `/documents/:id` renders `TextEditor`.
3. `client/src/TextEditor.js` reads the URL ID using `useParams()` and creates a Socket.IO connection to `http://localhost:3001` using WebSocket transport.
4. The editor is created through the `wrapperRef` callback. Quill starts disabled with `Loading...` until the server returns document data.
5. The client emits `get-document` with the document ID.
6. `server/server.js` calls `findOrCreateDocument(documentId)`. It loads the MongoDB record by ID or creates `{ _id: id, data: "" }` if it does not exist.
7. The server joins the socket to a room named after the document ID and emits `load-document` with the saved Quill data.
8. The client calls `quill.setContents(document)` and enables editing.
9. On Quill `text-change`, the client checks `source === "user"` and emits `send-changes` with the delta. The server broadcasts it to other sockets in the same room using `socket.broadcast.to(documentId)`.
10. Other clients receive `receive-changes` and apply the delta with `quill.updateContents(delta)`.
11. Every 2 seconds, the client emits `save-document` with `quill.getContents()`. The server updates MongoDB using `Document.findByIdAndUpdate`.
12. React cleanup disconnects the socket, clears the autosave interval, and removes event listeners when dependencies change or the component unmounts.

## 2. Important files, functions, and talking points

| File | Important code | Interview talking point |
|---|---|---|
| `client/src/App.js` | `App`, route definitions, `uuidV4()` | URL-based document identity and client-side routing. |
| `client/src/TextEditor.js` | `TextEditor`, `wrapperRef`, five `useEffect` blocks | React lifecycle, Quill integration, WebSocket events, cleanup, autosave. |
| `client/src/index.js` | `ReactDOM.createRoot` | React application entry point. |
| `client/src/styles.css` | `.ql-editor`, sticky toolbar, print media rules | Document-like layout and print support. |
| `server/server.js` | Socket.IO connection handler | Room joining, loading, broadcasting, persistence. |
| `server/server.js` | `findOrCreateDocument(id)` | Lazy document creation and default state. |
| `server/Document.js` | Mongoose `Schema` and `model` | MongoDB persistence model. |
| `client/package.json` | React, Quill, Socket.IO client, UUID | Frontend dependency choices and scripts. |
| `server/package.json` | Mongoose, Socket.IO, Nodemon | Backend runtime and development setup. |
| `README.md` | setup, architecture, feature claims | Useful project context, but distinguish documentation from implemented guarantees. |

### Likely technical talking points

- Quill represents content as a Delta-like structured object rather than plain text, preserving formatting and operations.
- Socket.IO rooms provide a simple document-scoped broadcast boundary.
- `source !== "user"` prevents received remote changes from being rebroadcast, avoiding an immediate feedback loop.
- The client disables the editor until initial state is loaded, preventing edits against an uninitialized document.
- Autosave is intentionally decoupled from every keystroke to reduce database writes.
- Socket cleanup and interval cleanup are important for avoiding duplicate listeners and memory leaks in React.
- The implementation is a broadcast-based collaboration prototype, not a full conflict-free replicated data type or operational-transform engine.

**Do not claim personal ownership of specific files or features unless you can verify that through your own commits or contribution history.**

## 3. Technologies and design decisions

- **React:** Component-based UI and lifecycle hooks for managing the editor, socket, and interval.
- **Create React App / `react-scripts`:** Provides development server, build, and test scripts in `client/package.json`.
- **React Router v5:** Maps `/documents/:id` to the editor and supports redirecting `/` to a new document URL.
- **UUID:** `uuidV4()` creates a new client-generated document ID when a user opens the root route.
- **Quill:** Rich-text editing, formatting toolbar, document contents, and change deltas.
- **Socket.IO:** Bidirectional event communication, automatic connection handling, and room-based broadcasting.
- **Node.js:** Server runtime for the Socket.IO backend.
- **Mongoose:** MongoDB ODM used for the `Document` model and persistence operations.
- **MongoDB:** Flexible storage for Quill’s structured document data. The current schema stores `data` as a generic `Object`.
- **Nodemon:** Restarts the backend during development.

### Key design decisions

1. **Room per document:** Every client joins `documentId`, so a change is broadcast only to collaborators on that document.
2. **Deltas instead of complete documents for live edits:** Small change operations are sent to peers through `send-changes`/`receive-changes`.
3. **Full contents for saves:** The current client periodically sends `quill.getContents()` so MongoDB stores a complete current snapshot.
4. **Server-generated initial document:** `findOrCreateDocument` makes the first visit to a new URL usable without a separate create API.
5. **WebSocket-only connection option:** The client uses `{ transports: ["websocket"] }`, avoiding long-polling fallback but requiring WebSocket connectivity.

## 4. Database, APIs/events, algorithms, error handling, and debugging

### Database

`server/Document.js` defines:

```text
Document {
  _id: String,
  data: Object
}
```

`server/server.js` connects to `mongodb://localhost/manydocs`. `findOrCreateDocument(id)` first calls `Document.findById(id)` and otherwise calls `Document.create({ _id: id, data: "" })`. Saves use `Document.findByIdAndUpdate(documentId, { data })`.

**Verify:** The README says `MONGO_URI` is configurable, but `server/server.js` currently uses a hard-coded local MongoDB URI and does not load `process.env.MONGO_URI`.

### Socket.IO event API

| Direction | Event | Payload/behavior |
|---|---|---|
| Client → server | `get-document` | Document ID; loads/creates record and joins room. |
| Server → client | `load-document` | Saved Quill contents. |
| Client → server | `send-changes` | Quill delta generated by a user edit. |
| Server → peers | `receive-changes` | Same delta, excluding the originating socket. |
| Client → server | `save-document` | Full `quill.getContents()` snapshot. |
| Socket.IO | `connection` | Starts the server-side socket lifecycle. |

There are no conventional REST routes in the inspected server code; the effective API is event-based.

### Algorithms/data flow

- **Document lookup:** O(1)-style database lookup by MongoDB `_id` assuming indexed `_id` access.
- **Room broadcast:** Socket.IO sends each delta to other sockets in the document room. Network cost depends on the number of connected peers.
- **Autosave:** Fixed interval of `2000` ms. It sends a complete snapshot rather than only the latest delta.
- **Change filtering:** `source === "user"` ensures only local user edits are sent to the server. Programmatic updates from `receive-changes` are not emitted again.
- **Document creation:** Lazy initialization on the first `get-document` event.

### Error handling

Current explicit handling is limited:

- `get-document` returns early if no document ID is provided.
- `findOrCreateDocument` returns if `id == null`.
- MongoDB connection errors are logged with `.catch((err) => console.log(err))`.
- There is no visible try/catch around asynchronous socket handlers.
- There is no client-side error state for failed connection, load, save, or MongoDB operations.
- The server always listens on port `3001`; CORS allows only `http://localhost:3000`.

### Debugging checklist

1. **Client does not load:** Confirm the React client is on port `3000`, server is on `3001`, and MongoDB is running.
2. **Socket connection fails:** Check browser Network/WebSocket tools and the `io("http://localhost:3001")` URL; verify the CORS origin.
3. **Editor remains disabled:** Check whether `get-document` was emitted, whether `load-document` arrived, and whether the payload is valid Quill contents.
4. **Users do not see each other’s edits:** Verify both clients use the exact same document ID and that the server calls `socket.join(documentId)`.
5. **Duplicate or looping updates:** Inspect whether `receive-changes` triggers Quill changes with a non-user source. Preserve the `source` check.
6. **Data is not persisted:** Check the `save-document` event, the two-second interval, MongoDB connectivity, and the result/error from `findByIdAndUpdate`.
7. **Document disappears after reload:** Inspect MongoDB collection/database name and confirm the client is using the same URL ID.
8. **Production failure:** Check hard-coded `localhost` URLs, CORS, MongoDB URI, and WebSocket proxy configuration.

## 5. Fifteen likely Infosys SP/DSE interview questions

1. **Explain Manydoc in one minute.**
   - **Sample answer:** Manydoc is a real-time collaborative rich-text editor. React and Quill provide the editing UI, Socket.IO synchronizes Quill deltas between clients in a document-specific room, and Node/Mongoose persists full document snapshots in MongoDB every two seconds. A document URL contains the shared document ID.
   - **Follow-up:** Why did you choose WebSockets instead of polling?

2. **How does a user open a new document?**
   - **Sample answer:** In `client/src/App.js`, the root route redirects to `/documents/${uuidV4()}`. `TextEditor` reads that ID with `useParams()` and emits `get-document`. The server finds or creates the corresponding MongoDB document and sends its contents back.
   - **Follow-up:** What happens if two users open the same new ID simultaneously?

3. **How does real-time synchronization work?**
   - **Sample answer:** Quill emits `text-change`. If the source is `user`, the client emits `send-changes` with the delta. The server broadcasts the delta to the document room using `socket.broadcast.to(documentId)`. Other clients handle `receive-changes` and call `quill.updateContents(delta)`.
   - **Follow-up:** Does this implementation guarantee conflict-free editing?

4. **Why check `source !== "user"`?**
   - **Sample answer:** Remote updates applied with `quill.updateContents` can trigger Quill’s change event. Without the source check, a client could rebroadcast a received change, causing duplicate messages or an update loop. The check restricts outgoing collaboration events to local user edits.
   - **Follow-up:** How would you test this behavior?

5. **Why send deltas for collaboration but full contents for saving?**
   - **Sample answer:** Deltas are smaller and represent incremental changes, so they are suitable for low-latency peer updates. For persistence, the complete Quill contents provide a simple current snapshot that can be loaded directly after reconnecting. The trade-off is that full snapshots can be expensive for large documents.
   - **Follow-up:** How would you optimize persistence for very large documents?

6. **What is a Socket.IO room?**
   - **Sample answer:** It is a server-managed grouping of sockets. Here, `socket.join(documentId)` creates document-scoped membership, and `socket.broadcast.to(documentId)` sends updates to other clients in that document without sending back to the originator.
   - **Follow-up:** What changes are needed for multiple backend instances?

7. **How is data stored in MongoDB?**
   - **Sample answer:** `Document.js` defines a Mongoose schema with a string `_id` and generic object `data`. `findOrCreateDocument` loads by ID or creates an empty document, and `findByIdAndUpdate` stores the latest Quill contents.
   - **Follow-up:** Why might a generic `Object` field be a limitation?

8. **What is the purpose of React’s `useEffect` blocks in `TextEditor.js`?**
   - **Sample answer:** Separate effects manage the socket connection, initial document loading, autosave interval, incoming changes, and outgoing Quill changes. Each effect depends on the resources it uses and cleans up listeners, intervals, or the socket when needed.
   - **Follow-up:** What bug can occur if event listeners are not removed?

9. **How does the application avoid editing before initialization?**
   - **Sample answer:** The `wrapperRef` creates Quill, calls `q.disable()`, and sets `Loading...`. The client enables Quill only inside the `load-document` handler after applying the server’s document contents.
   - **Follow-up:** What if the load event never arrives?

10. **What is the autosave strategy?**
    - **Sample answer:** `SAVE_INTERVAL_MS` is 2000. An interval calls `socket.emit("save-document", quill.getContents())`. The server updates the document in MongoDB. It is simple and reduces writes compared with saving on every keystroke, but it can lose changes made immediately before a crash.
    - **Follow-up:** How would you implement debounced saving?

11. **What are the main scalability concerns?**
    - **Sample answer:** A single Socket.IO process stores room membership in memory, so horizontal scaling needs a shared adapter such as Redis. Full-document saves every two seconds can create write load. A single generic document object may also become large. Conflict resolution is not implemented for concurrent edits.
    - **Follow-up:** What would you improve first for 1000 concurrent users?

12. **What happens if two users edit the same position concurrently?**
    - **Sample answer:** The code broadcasts deltas but does not implement an operational transformation or CRDT algorithm. Quill applies received deltas in arrival order, so concurrent edits may produce inconsistent or unexpected results depending on timing. This is an important limitation to acknowledge.
    - **Follow-up:** Compare OT and CRDT approaches.

13. **How would you secure the application?**
    - **Sample answer:** Add authentication and authorization for document access, validate document IDs and payloads, enforce maximum document sizes, use environment variables for database and server configuration, restrict production CORS, use TLS, and rate-limit socket events and saves. The current code does not show these controls.
    - **Follow-up:** Why is room membership alone not authorization?

14. **How would you debug a missing update?**
    - **Sample answer:** I would trace the event end to end: Quill `text-change`, the `source` value, client `send-changes`, server room membership, server broadcast, peer `receive-changes`, and `quill.updateContents`. I would inspect browser WebSocket frames and add correlation/document IDs to server logs.
    - **Follow-up:** How would you distinguish a client bug from a server bug?

15. **What improvements would you make before production?**
    - **Sample answer:** Move URLs and MongoDB configuration to environment variables, add structured error handling and client status indicators, validate payloads, implement authentication, add OT/CRDT-based conflict resolution, debounce or version saves, add indexes and document-size limits, use a Socket.IO scaling adapter, and write tests for loading, synchronization, autosave, reconnect, and concurrent edits.
    - **Follow-up:** Which improvement has the highest correctness impact?

## 6. Important bugs, limitations, and improvements

### Directly visible issues

- **Hard-coded configuration:** `server/server.js` uses `mongodb://localhost/manydocs`; the README documents `MONGO_URI` and `PORT`, but the code does not read them. `TextEditor.js` hard-codes `http://localhost:3001`, and the server hard-codes port `3001`.
- **No authentication or document authorization:** Any client that knows or guesses a document ID can attempt to join its room and receive/edit its contents.
- **Weak payload validation:** `data` from `save-document` is accepted without validation or size limits.
- **No explicit async error handling:** Database failures inside socket handlers can result in unhandled promise rejections or silent client failure.
- **No save acknowledgement:** The client cannot tell whether an autosave succeeded.
- **Autosave race risk:** Multiple save requests can overlap if MongoDB is slow; there is no version number or ordering check.
- **No conflict-resolution algorithm:** The broadcast model is not sufficient to guarantee consistent results for simultaneous edits.
- **Duplicate document creation race:** Two requests can both fail `findById` and then attempt `Document.create` for the same `_id`. A duplicate-key error is possible; the code does not handle it.
- **Connection lifecycle gap:** `get-document` installs `send-changes` and `save-document` listeners inside its handler. If a client emits `get-document` more than once on the same socket, listeners can be registered repeatedly.
- **No explicit disconnect/room cleanup logic:** Socket.IO removes membership internally, but the application has no presence tracking or user status.
- **Repository hygiene:** `.DS_Store` and `node_modules` appear in the repository tree. They should normally be ignored and removed from version control.
- **Testing is incomplete:** `server/package.json` has a test script that intentionally exits with an error. The client includes Create React App test dependencies, but no project-specific tests were inspected.
- **README claims need verification:** The README says support is “up to 100 simultaneous users” and describes scalability, but no load-test evidence or scaling adapter is present in the inspected code.

### Recommended improvement order

1. Add authentication and per-document authorization.
2. Replace hard-coded MongoDB, server, and client URLs with environment variables.
3. Add runtime validation, document-size limits, save acknowledgements, and structured errors.
4. Add document versioning or optimistic concurrency checks to prevent stale saves overwriting newer data.
5. Use debounced saves and save-on-blur/unload as appropriate, while handling browser lifecycle limitations.
6. Implement OT or CRDT semantics for concurrent edits.
7. Add Socket.IO Redis adapter and a shared deployment strategy for horizontal scaling.
8. Add tests for document creation, room isolation, synchronization, autosave, reconnect, malformed payloads, and concurrent updates.
9. Remove committed `node_modules`/`.DS_Store` and add a root-level workflow or scripts for running client and server together.

## Interview cautions / verify before the interview

- Verify whether you personally implemented the current collaboration, autosave, or persistence logic; repository code alone cannot establish individual contribution.
- Verify the actual MongoDB deployment and whether environment variables are used outside the committed code.
- Do not claim guaranteed “100-user” support or conflict-free editing without load-test and concurrency evidence.
- Be precise that the current implementation broadcasts Quill deltas but does not visibly implement OT, CRDT, authentication, Redis scaling, or production-grade error handling.
- Confirm whether `node_modules` was accidentally committed and whether the current repository state is intended for production or demonstration.
