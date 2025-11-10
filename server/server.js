const mongoose = require("mongoose");
const Document = require("./Document");
const io = require("socket.io")(3001, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

mongoose
  .connect("mongodb://localhost/manydocs")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

const defaultValue = "";

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("get-document", async (documentId) => {
    if (!documentId) return;

    // find or create a document in MongoDB
    const document = await findOrCreateDocument(documentId);
    socket.join(documentId);

    // send that document back to the client
    socket.emit("load-document", document.data);

    // handle user changes
    socket.on("send-changes", (delta) => {
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });

    // handle save requests
    socket.on("save-document", async (data) => {
      await Document.findByIdAndUpdate(documentId, { data });
    });
  });
});

async function findOrCreateDocument(id) {
  if (id == null) return;

  const document = await Document.findById(id);
  if (document) return document;

  return await Document.create({ _id: id, data: defaultValue });
}
