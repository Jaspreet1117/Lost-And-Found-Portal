require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
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
const ContactRequest = require("./models/ContactRequest");
const Message = require("./models/Message");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// Socket.io — authenticate via JWT cookie, join personal room
io.use((socket, next) => {
  const cookie = socket.handshake.headers.cookie || "";
  const tokenMatch = cookie.match(/token=([^;]+)/);
  if (!tokenMatch) return next(new Error("Unauthorized"));
  try {
    const decoded = jwt.verify(tokenMatch[1], process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  // Each user joins their own private room (their MongoDB _id)
  socket.join(socket.userId);

  socket.on("disconnect", () => {});
});

// Helper: emit a real-time event to a specific user
function emitToUser(userId, event, data) {
  io.to(userId.toString()).emit(event, data);
}

// ─── MongoDB ────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.error("MongoDB Error:", err));

// ─── User Schema ─────────────────────────────────────────────────────────────
// ================= USER SCHEMA =================
// Replace your old userSchema with this

const userSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    unique: true,
  },
  userId: {
    type: String,
    unique: true,
  },
  password: String,

  profilePic: {
    type: String,
    default: "/images/default.png",
  },

  googleId: String,
  provider: String,

  // extra profile fields
  phone: {
    type: String,
    default: "",
  },

  bio: {
    type: String,
    default: "",
  },

  campus: {
    type: String,
    default: "",
  },
});

const User = mongoose.model("User", userSchema);

// ─── Multer (profile pic + item image uploads) ───────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, "public/uploads")),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// ─── App Config ──────────────────────────────────────────────────────────────
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
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// ─── Google Strategy ─────────────────────────────────────────────────────────
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
    },
  ),
);

passport.serializeUser((user, cb) => cb(null, user.id));
passport.deserializeUser(async (id, cb) => {
  const user = await User.findById(id);
  cb(null, user);
});

// ─── Auth Middleware ──────────────────────────────────────────────────────────
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

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.render("Welcome"));
app.get("/login", (req, res) => res.render("login"));
app.get("/signup", (req, res) => res.render("signup"));

// POST /signup
app.post("/signup", upload.single("profilePic"), async (req, res) => {
  try {
    const { fullname, username, password, userId } = req.body;

    if (!fullname || !username || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const existing = await User.findOne({ email: username });

    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Email already registered" });
    }
    const existingUserId = await User.findOne({ userId });
    if (existingUserId) {
      return res.status(409).json({
        success: false,
        message: "User ID already taken",
      });
    }

    const hashed = await bcrypt.hash(password, 10);
    const profilePic = req.file
      ? `/uploads/${req.file.filename}`
      : "/images/default.png";

    const user = new User({
      name: fullname,
      email: username,
      password: hashed,
      userId,
      profilePic,
      provider: "local",
    });
    await user.save();

    return res.json({ success: true, message: "Account created!" });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ email: username });
    if (!user || !user.password) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── Google OAuth ─────────────────────────────────────────────────────────────
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false,
  }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.redirect("/dashboard");
  },
);

// ─── Dashboard ────────────────────────────────────────────────────────────────
// Fetches all LostItems and FoundItems from DB, merges them and passes as `posts`
app.get("/dashboard", verifyToken, async (req, res) => {
  try {
    const [lostItems, foundItems] = await Promise.all([
      LostItem.find().populate("postedBy").sort({ createdAt: -1 }).lean(),

      FoundItem.find().populate("postedBy").sort({ createdAt: -1 }).lean(),
    ]);

    // Tag each item with its status so the dashboard template can filter
    const lost = lostItems.map((item) => ({ ...item, status: "lost" }));
    const found = foundItems.map((item) => ({ ...item, status: "found" }));

    // Merge and sort newest first
    const posts = [...lost, ...found].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    res.render("dashboard", { posts, currentUserId: req.user.id });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.render("dashboard", { posts: [], currentUserId: req.user.id });
  }
});

// ─── Report Lost ──────────────────────────────────────────────────────────────
app.get("/report-lost", verifyToken, (req, res) => res.render("report-lost"));

app.post(
  "/report-lost",
  verifyToken,
  upload.single("itemImage"),
  async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        phone,
        category,
        description,
        dateLost,
        location,
        locationDetails,
      } = req.body;

      if (!firstName || !lastName || !phone || !location || !dateLost) {
        return res.render("report-lost", {
          error: "Please fill all required fields",
        });
      }

      const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
      const lostItem = new LostItem({
        reporterName: firstName + " " + lastName,
        title: category,
        category,
        location,
        dateLost,
        description,
        contactPhone: phone,
        locationDetails,
        imagePath,
        postedBy: req.user.id,
      });

      await lostItem.save();

      res.redirect("/dashboard");
    } catch (err) {
      console.error(err);
      res.render("report-lost", {
        error: "Server error",
      });
    }
  },
);

// ─── Report Found ─────────────────────────────────────────────────────────────
app.get("/report-found", verifyToken, (req, res) => res.render("report-found"));

app.post(
  "/report-found",
  verifyToken,
  upload.single("itemImage"),
  async (req, res) => {
    try {
      const {
        founderName,
        brandColor,
        itemType,
        location,
        foundDate,
        description,
        contactEmail,
        contactPhone,
      } = req.body;

      if (!founderName || !brandColor || !location || !foundDate) {
        return res
          .status(400)
          .json({ success: false, message: "Please fill all required fields" });
      }

      const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

      const foundItem = new FoundItem({
        founderName,
        brandColor,
        itemType,
        location,
        foundDate,
        description,
        contactEmail,
        contactPhone,
        imagePath,
        postedBy: req.user.id,
      });

      await foundItem.save();
      // await lostItem.save();

      res.redirect("/dashboard");
    } catch (err) {
      console.error(err);
      res.render("report-lost", {
        error: "Server error",
      });
    }
  },
);
// ================= PROFILE ROUTE =================
// Replace your current /profile route with this

app.get("/profile", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).send("User not found");
    }

    // User ke saare Lost aur Found items fetch karo
    const [lostItems, foundItems] = await Promise.all([
      LostItem.find({ postedBy: req.user.id }).sort({ createdAt: -1 }).lean(),
      FoundItem.find({ postedBy: req.user.id }).sort({ createdAt: -1 }).lean(),
    ]);

    res.render("profile", {
      user,
      lostItems: lostItems || [],
      foundItems: foundItems || [],
    });
  } catch (error) {
    console.error("Profile Error:", error);
    res.status(500).send("Error loading profile");
  }
});

// Update profile route
// ================= PROFILE UPDATE ROUTE =================
// Replace your current update route with this

app.post(
  "/profile/update",
  verifyToken,
  upload.single("profilePic"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // update values
      if (req.body.name) user.name = req.body.name;
      if (req.body.phone) user.phone = req.body.phone;
      if (req.body.bio) user.bio = req.body.bio;
      if (req.body.campus) user.campus = req.body.campus;

      if (req.file) {
        user.profilePic = `/uploads/${req.file.filename}`;
      }

      await user.save();

      res.json({
        success: true,
        message: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Update Profile Error:", error);

      res.status(500).json({
        success: false,
        message: "Server Error",
      });
    }
  },
);
app.post("/change-password", verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.json({
        success: false,
        message: "Please fill all fields",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.json({
        success: false,
        message: "New passwords do not match",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);

    res.json({
      success: false,
      message: "Server error",
    });
  }
});

// ─── MESSAGING ROUTES ────────────────────────────────────────────────────────

// POST /contact-request — Finder submits "I found your item" request
app.post("/contact-request", verifyToken, async (req, res) => {
  try {
    const { lostItemId, foundLocation, finderContact, finderMessage } = req.body;

    if (!lostItemId || !foundLocation || !finderContact) {
      return res.status(400).json({ success: false, message: "Please fill all required fields" });
    }

    // Get the lost item to find the owner and title
    const lostItem = await LostItem.findById(lostItemId);
    if (!lostItem) {
      return res.status(404).json({ success: false, message: "Lost item not found" });
    }

    // Prevent owner from contacting themselves
    if (lostItem.postedBy.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot contact yourself" });
    }

    // Prevent duplicate pending requests
    const existing = await ContactRequest.findOne({
      fromUser: req.user.id,
      lostItemId,
      status: "pending",
    });
    if (existing) {
      return res.status(409).json({ success: false, message: "You already sent a request for this item" });
    }

    const request = new ContactRequest({
      fromUser: req.user.id,
      toUser: lostItem.postedBy,
      lostItemId,
      lostItemTitle: lostItem.title || lostItem.category || "Item",
      foundLocation,
      finderContact,
      finderMessage,
    });

    await request.save();

    // Real-time: notify the owner immediately
    const populated = await request.populate("fromUser", "name userId profilePic");
    emitToUser(lostItem.postedBy, "new_notification", {
      notification: populated,
    });

    res.json({ success: true, message: "Contact request sent" });
  } catch (err) {
    console.error("Contact request error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /notifications — Owner's incoming contact requests
app.get("/notifications", verifyToken, async (req, res) => {
  try {
    const notifications = await ContactRequest.find({ toUser: req.user.id })
      .populate("fromUser", "name userId profilePic")
      .sort({ createdAt: -1 })
      .lean();

    const unreadCount = notifications.filter((n) => !n.readByOwner && n.status === "pending").length;

    // Mark all as read
    await ContactRequest.updateMany(
      { toUser: req.user.id, readByOwner: false },
      { readByOwner: true }
    );

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error("Notifications error:", err);
    res.status(500).json({ notifications: [], unreadCount: 0 });
  }
});

// GET /notifications/count — Lightweight badge count check
app.get("/notifications/count", verifyToken, async (req, res) => {
  try {
    const count = await ContactRequest.countDocuments({
      toUser: req.user.id,
      readByOwner: false,
      status: "pending",
    });
    res.json({ count });
  } catch (err) {
    res.json({ count: 0 });
  }
});

// POST /contact-request/:id/accept — Owner accepts a request
app.post("/contact-request/:id/accept", verifyToken, async (req, res) => {
  try {
    const request = await ContactRequest.findOne({
      _id: req.params.id,
      toUser: req.user.id,
    });
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    request.status = "accepted";
    await request.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /contact-request/:id/reject — Owner rejects a request
app.post("/contact-request/:id/reject", verifyToken, async (req, res) => {
  try {
    const request = await ContactRequest.findOne({
      _id: req.params.id,
      toUser: req.user.id,
    });
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    request.status = "rejected";
    await request.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /conversations — All accepted threads for the logged-in user
app.get("/conversations", verifyToken, async (req, res) => {
  try {
    const requests = await ContactRequest.find({
      $or: [{ fromUser: req.user.id }, { toUser: req.user.id }],
      status: "accepted",
    })
      .populate("fromUser", "name userId profilePic")
      .populate("toUser", "name userId profilePic")
      .sort({ updatedAt: -1 })
      .lean();

    // For each thread, get last message and unread count
    const conversations = await Promise.all(
      requests.map(async (r) => {
        const isOwner = r.toUser._id.toString() === req.user.id;
        const otherUser = isOwner ? r.fromUser : r.toUser;
        const lastMessage = await Message.findOne({ contactRequestId: r._id })
          .sort({ createdAt: -1 })
          .lean();
        const unreadCount = await Message.countDocuments({
          contactRequestId: r._id,
          sender: { $ne: req.user.id },
          read: false,
        });
        return {
          _id: r._id,
          otherUser,
          lostItemTitle: r.lostItemTitle,
          lastMessage,
          unreadCount,
        };
      })
    );

    res.json({ conversations });
  } catch (err) {
    console.error("Conversations error:", err);
    res.status(500).json({ conversations: [] });
  }
});

// GET /messages/:requestId — Get messages in a thread
app.get("/messages/:requestId", verifyToken, async (req, res) => {
  try {
    const request = await ContactRequest.findOne({
      _id: req.params.requestId,
      $or: [{ fromUser: req.user.id }, { toUser: req.user.id }],
      status: "accepted",
    });
    if (!request) return res.status(403).json({ success: false, message: "Not authorized" });

    const messages = await Message.find({ contactRequestId: req.params.requestId })
      .populate("sender", "name userId profilePic")
      .sort({ createdAt: 1 })
      .lean();

    // Mark incoming messages as read
    await Message.updateMany(
      { contactRequestId: req.params.requestId, sender: { $ne: req.user.id }, read: false },
      { read: true }
    );

    res.json({ messages });
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ messages: [] });
  }
});

// POST /messages/:requestId — Send a message in a thread
app.post("/messages/:requestId", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Message cannot be empty" });
    }

    const request = await ContactRequest.findOne({
      _id: req.params.requestId,
      $or: [{ fromUser: req.user.id }, { toUser: req.user.id }],
      status: "accepted",
    });
    if (!request) return res.status(403).json({ success: false, message: "Not authorized" });

    const message = new Message({
      contactRequestId: req.params.requestId,
      sender: req.user.id,
      text: text.trim(),
    });
    await message.save();

    // Real-time: push message to the other user in the thread
    const otherUserId =
      request.fromUser.toString() === req.user.id
        ? request.toUser
        : request.fromUser;

    const populated = await message.populate("sender", "name userId profilePic");
    emitToUser(otherUserId, "new_message", {
      requestId: req.params.requestId,
      message: populated,
    });

    res.json({ success: true, message: populated });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} ✅`);
});
