import { io } from "socket.io-client";

const SOCKET_URL = "https://vozdux-backend-production.up.railway.app";

let socket = null;

export const connectSocket = (token) => {
    if (!token) return null;

    if (socket?.connected) return socket;

    socket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
    });

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};