//////////////////////////////////(socket)
const http = require("http");
const { Server } = require("socket.io");
/////////////////////////////////////(socket end)
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const multer = require("multer");
const { LostItem, FoundItem } = require("./lost-found-data-model");

const app = express();
//////////////////////////(socket)
const server = http.createServer(app);
const userSockets = new Map(); // Store: userId -> socketId
const io = new Server(server);
////////////////////////////////(socket end)

// ─── MongoDB ───
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.error("MongoDB Error:", err));

// ─── User Schema ───
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  userId: { type: String, unique: true },
  password: String,
  profilePic: { type: String, default: "/images/default.png" },
  googleId: String,
  provider: String,
  phone: { type: String, default: "" },
  bio: { type: String, default: "" },
  campus: { type: String, default: "" },
});

const User = mongoose.model("User", userSchema);

// ─── Message Schema (Purani Chat Save Karne Ke Liye) ───
const messageSchema = new mongoose.Schema({
    senderId: String,
    receiverId: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);

// ─── Multer Config ───
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "public/uploads")),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// ─── App Config ───
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ─── Google Strategy ───
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const email = profile.emails?.[0]?.value;
        let user = await User.findOne({
          $or: [{ email }, { googleId: profile.id }],
        });

        if (!user) {
          user = new User({
            name: profile.displayName,
            email,
            googleId: profile.id,
            provider: "google",
            userId: "USER" + Date.now(),
            profilePic: profile.photos?.[0]?.value,
          });
          await user.save();
        }
        return cb(null, user);
      } catch (err) {
        return cb(err, null);
      }
    }
  )
);

passport.serializeUser((user, cb) => cb(null, user.id));
passport.deserializeUser(async (id, cb) => {
  const user = await User.findById(id);
  cb(null, user);
});

// ─── Auth Middleware ───
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.redirect("/login");
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.clearCookie("token");
    res.redirect("/login");
  }
};

// ─── Socket.io Logic ───
io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId; 
    
    if (userId && userId !== "undefined") {
        userSockets.set(userId, socket.id);
        console.log(`✅ User Registered in Socket: ${userId}`);
    }

    socket.on("send_message", async (data) => {
        const { receiverId, message, senderId } = data;
        
        // 1. Database mein message save karein
        try {
            const newMessage = new Message({ senderId, receiverId, message });
            await newMessage.save();

            // 2. Receiver ko real-time bhejein
            const receiverSocketId = userSockets.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("receive_message", {
                    senderId: senderId,
                    message: message
                });
            }
        } catch (err) {
            console.error("Socket Message Save Error:", err);
        }
    });

    socket.on("disconnect", () => {
        for (let [id, sid] of userSockets.entries()) {
            if (sid === socket.id) {
                userSockets.delete(id);
                console.log(`🚫 User Disconnected: ${id}`);
                break;
            }
        }
    });
});

// ─── Routes ───
app.get("/", (req, res) => res.render("Welcome"));
app.get("/login", (req, res) => res.render("login"));
app.get("/signup", (req, res) => res.render("signup"));

// API: Purani Chat History aur Contacts fetch karne ke liye
app.get("/api/chat-history", verifyToken, async (req, res) => {
    try {
        const myId = req.user.userId;
        
        // Un sabhi messages ko dhoondein jo maine bheje ya mujhe mile
        const messages = await Message.find({
            $or: [{ senderId: myId }, { receiverId: myId }]
        }).sort({ timestamp: -1 });

        // Unique contacts ki list banayein (WhatsApp style history)
        const history = [];
        const seen = new Set();

        messages.forEach(msg => {
            const otherUser = msg.senderId === myId ? msg.receiverId : msg.senderId;
            if (!seen.has(otherUser)) {
                seen.add(otherUser);
                history.push({
                    userId: otherUser,
                    lastMessage: msg.message,
                    timestamp: msg.timestamp
                });
            }
        });

        res.json({ success: true, history });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error fetching history" });
    }
});

// API: Kisi specific person ke saath sari purani chat fetch karna
app.get("/api/messages/:otherUserId", verifyToken, async (req, res) => {
    try {
        const myId = req.user.userId;
        const otherId = req.params.otherUserId;

        const chat = await Message.find({
            $or: [
                { senderId: myId, receiverId: otherId },
                { senderId: otherId, receiverId: myId }
            ]
        }).sort({ timestamp: 1 });

        res.json({ success: true, chat });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});


// ─── POST: Claim Item Notification ───
app.post("/api/claim-item", verifyToken, async (req, res) => {
    try {
        const { posterId, itemTitle, finderName, phone, foundWhere, note } = req.body;
        const claimantId = req.user.userId;

        if (!posterId || !foundWhere || !finderName || !phone) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Build the notification message with all details
        const systemMessage =
            `🔔 CLAIM ALERT: Someone found your "${itemTitle || 'item'}"!\n` +
            `👤 Finder: ${finderName}\n` +
            `📞 Contact: ${phone}\n` +
            `📍 Found at: ${foundWhere}` +
            (note ? `\n💬 Note: "${note}"` : '');

        // 1. Save as a SYSTEM message in DB (shows in Recent Chats)
        const notificationMsg = new Message({
            senderId: "SYSTEM",
            receiverId: posterId,
            message: systemMessage
        });
        await notificationMsg.save();

        // 2. Real-time socket event to owner
        const ownerSocketId = userSockets.get(posterId);
        if (ownerSocketId) {
            io.to(ownerSocketId).emit("claim_notification", {
                message: `${finderName} has found your "${itemTitle || 'item'}"! Contact: ${phone}. Check Recent Chats for details.`
            });
        }

        res.json({ success: true });
    } catch (err) {
        console.error("Claim item error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post("/signup", upload.single("profilePic"), async (req, res) => {
  try {
    const { fullname, username, password, userId } = req.body;
    if (!fullname || !username || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    const existing = await User.findOne({ email: username });
    if (existing) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }
    const hashed = await bcrypt.hash(password, 10);
    const profilePic = req.file ? `/uploads/${req.file.filename}` : "/images/default.png";

    const user = new User({
      name: fullname, email: username, password: hashed, userId, profilePic, provider: "local",
    });
    await user.save();
    return res.json({ success: true, message: "Account created!" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ email: username });
    if (!user || !user.password) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, userId: user.userId },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/login", session: false }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email, userId: req.user.userId },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.cookie("token", token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.redirect("/dashboard");
  }
);

app.get("/dashboard", verifyToken, async (req, res) => {
  try {
    const [lostItems, foundItems] = await Promise.all([
      LostItem.find().populate("postedBy").sort({ createdAt: -1 }).lean(),
      FoundItem.find().populate("postedBy").sort({ createdAt: -1 }).lean(),
    ]);

    const lost = lostItems.map((item) => ({ ...item, status: "lost" }));
    const found = foundItems.map((item) => ({ ...item, status: "found" }));
    const posts = [...lost, ...found].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.render("dashboard", { posts: posts, user: req.user });
  } catch (err) {
    res.render("dashboard", { posts: [] });
  }
});

app.get("/report-lost", verifyToken, (req, res) => res.render("report-lost"));
app.post("/report-lost", verifyToken, upload.single("itemImage"), async (req, res) => {
    const { firstName, lastName, phone, category, description, dateLost, location, locationDetails } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const lostItem = new LostItem({
      reporterName: firstName + " " + lastName, title: category, category, location, dateLost, description, contactPhone: phone, locationDetails, imagePath, postedBy: req.user.id,
    });
    await lostItem.save();
    res.redirect("/dashboard");
});

app.get("/report-found", verifyToken, (req, res) => res.render("report-found"));
// ... (Aapka baaki ka code index.js mein upar wahi rahega) ...

// ─── POST: Report Found (Updated for Notifications) ───
app.post("/report-found", verifyToken, upload.single("itemImage"), async (req, res) => {
    const { founderName, itemType, location, description, postedByOwnerId, itemTitle } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        const foundItem = new FoundItem({
            founderName, itemType, location, description, imagePath, postedBy: req.user.id,
        });
        await foundItem.save();

        // Notification Logic: Agar owner ki ID mili hai toh notification bhejien
        if (postedByOwnerId && postedByOwnerId !== "undefined") {
            const systemMessage = `CLAIM ALERT: Someone found your item "${itemTitle || 'Lost Item'}". Check found listings!`;
            
            // 1. Database mein notification save karein
            const notificationMsg = new Message({
                senderId: "SYSTEM", 
                receiverId: postedByOwnerId,
                message: systemMessage
            });
            await notificationMsg.save();

            // 2. Real-time socket notification
            const ownerSocketId = userSockets.get(postedByOwnerId);
            if (ownerSocketId) {
                io.to(ownerSocketId).emit("receive_message", {
                    senderId: "SYSTEM",
                    message: systemMessage
                });
            }
        }
        res.redirect("/dashboard");
    } catch (err) {
        console.error("Error in report-found:", err);
        res.status(500).send("Server Error");
    }
});

// ... (Baaki server.listen wagera code end mein) ...

app.get("/profile", verifyToken, async (req, res) => {
    const user = await User.findById(req.user.id);
    res.render("profile", { user });
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () =>
  console.log(`Server with Socket.io: http://localhost:${PORT}`)
);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ Port ${PORT} is already in use!`);
    console.log(`🔧 Trying to free port ${PORT}...`);

    const { execSync } = require("child_process");
    try {
      // Find and kill the process using the port (Windows)
      const result = execSync(`netstat -ano | findstr :${PORT}`).toString();
      const lines = result.trim().split("\n");
      const pids = new Set();
      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== "0") pids.add(pid);
      });
      pids.forEach((pid) => {
        try {
          execSync(`taskkill /PID ${pid} /F`);
          console.log(`✅ Killed process PID ${pid}`);
        } catch (e) {}
      });

      // Retry after 1 second
      setTimeout(() => {
        server.listen(PORT, () =>
          console.log(`✅ Server restarted: http://localhost:${PORT}`)
        );
      }, 1000);
    } catch (e) {
      console.error("Could not free port automatically. Please run: taskkill /IM node.exe /F");
      process.exit(1);
    }
  } else {
    console.error("Server error:", err);
    process.exit(1);
  }
});