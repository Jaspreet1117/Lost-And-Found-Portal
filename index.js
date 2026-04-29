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
    const { fullname, username, password } = req.body;

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

    const hashed = await bcrypt.hash(password, 10);
    const profilePic = req.file
      ? `/uploads/${req.file.filename}`
      : "/images/default.png";

    const user = new User({
      name: fullname,
      email: username,
      password: hashed,
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
      LostItem.find().sort({ createdAt: -1 }).lean(),
      FoundItem.find().sort({ createdAt: -1 }).lean(),
    ]);

    // Tag each item with its status so the dashboard template can filter
    const lost = lostItems.map((item) => ({ ...item, status: "lost" }));
    const found = foundItems.map((item) => ({ ...item, status: "found" }));

    // Merge and sort newest first
    const posts = [...lost, ...found].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    res.render("dashboard", { posts });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.render("dashboard", { posts: [] });
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

      const imagePath = req.file ? req.file.filename : null;

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

      const imagePath = req.file ? req.file.filename : null;

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
      return res.json({ success: true, message: "Found item reported!" });
    } catch (err) {
      console.error("Report found error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },
);
// ================= PROFILE ROUTE =================
// Replace your current /profile route with this

app.get("/profile", verifyToken, async (req, res) => {
  try {
    // IMPORTANT:
    // use req.user.id NOT req.userId

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).send("User not found");
    }

    res.render("profile", { user });
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
// ─── Logout ───────────────────────────────────────────────────────────────────
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

app.listen(process.env.PORT || 3000, () =>
  console.log(`Server: http://localhost:${process.env.PORT || 3000}`),
);
