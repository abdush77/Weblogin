import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" },
});

let users = {};

io.on("connection", (socket) => {
    console.log("✅ Connected:", socket.id);

    socket.on("join", (user) => {
        users[socket.id] = user;

        console.log("JOIN:", user);

        io.emit("users", Object.values(users));
    });

    socket.on("sendMessage", (data) => {
        io.emit("receiveMessage", data);
    });

    socket.on("disconnect", () => {
        console.log("❌ Disconnected:", socket.id);

        delete users[socket.id];
        io.emit("users", Object.values(users));
    });
});

server.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
});