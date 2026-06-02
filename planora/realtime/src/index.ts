import { createServer } from "http";
import { Server } from "socket.io";

const PORT = process.env.REALTIME_PORT || 4000;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"] },
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Realtime service running on port ${PORT}`);
});
