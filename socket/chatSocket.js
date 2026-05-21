const { Server } = require("socket.io");
////////////////////////////
// Is file mein socket initialize karein
const socket = io({
    query: {
        // Yeh ensure karein ki dashboard.ejs se currentUserId pass ho rahi hai
        userId: currentUserId 
    }
});
///////////////////////////////////
const initSocket = (server) => {
    const io = new Server(server);
    let activeUsers = {}; // { userId: socketId }

    io.on("connection", (socket) => {
        // User joins and identifies themselves
        socket.on("register-user", (userId) => {
            activeUsers[userId] = socket.id;
            console.log(`User ${userId} is now online.`);
        });

        // Listen for a message from the sender
        socket.on("send-message", (data) => {
            const { receiverId, message, senderId } = data;
            const receiverSocketId = activeUsers[receiverId];

            if (receiverSocketId) {
                // Send specifically to the receiver
                io.to(receiverSocketId).emit("receive-message", {
                    senderId,
                    message
                });
            }
        });

        socket.on("disconnect", () => {
            for (let userId in activeUsers) {
                if (activeUsers[userId] === socket.id) {
                    delete activeUsers[userId];
                }
            }
        });
    });
};

module.exports = initSocket;