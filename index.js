// ===== LOAD ENVIRONMENT VARIABLES FIRST =====
require('dotenv').config();

// ===== MONGODB CONNECTION =====
const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/lostfoundDB")
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log(err));

// ===== USER SCHEMA =====
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  profilePic: String,
  bio: String,
  phone: String,
  campus: String,
  role: String,
  stats: {
    lost: Number,
    found: Number,
    returned: Number,
  },
  googleId: String,
  provider: String
});

const User = mongoose.model("User", userSchema);

// ===== IMPORTS =====
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const app = express();
const multer = require("multer");

// ===== APP CONFIGURATION =====
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// CORS FIX
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST");
  next();
});

// ===== SESSION SETUP =====
app.use(
  session({
    secret: "my_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  }),
);

// ===== PASSPORT SETUP =====
app.use(passport.initialize());
app.use(passport.session());

// ===== GOOGLE OAUTH STRATEGY =====
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async function(accessToken, refreshToken, profile, cb) {
        try {
            const googleEmail = profile.emails && profile.emails[0] 
                ? profile.emails[0].value 
                : 'no-email@google.com';
            
            // Check if user exists by email or Google ID
            let user = await User.findOne({ 
                $or: [
                    { email: googleEmail },
                    { googleId: profile.id }
                ]
            });

            if (user) {
                // Update Google ID if missing
                if (!user.googleId) {
                    user.googleId = profile.id;
                    user.provider = 'google';
                    if (!user.profilePic || user.profilePic === '/images/default.png') {
                        user.profilePic = profile.photos && profile.photos[0] 
                            ? profile.photos[0].value 
                            : '/images/default.png';
                    }
                    await user.save();
                }
                console.log('✅ Existing Google user logged in:', user.email);
                return cb(null, user);
            }

            // Create new user in MongoDB
            const newUser = new User({
                name: profile.displayName,
                email: googleEmail,
                password: 'google-auth-' + profile.id,
                profilePic: profile.photos && profile.photos[0] 
                    ? profile.photos[0].value 
                    : '/images/default.png',
                bio: 'Google user - bio not set',
                phone: 'Not provided',
                campus: 'Main Campus',
                role: 'Student',
                stats: { lost: 0, found: 0, returned: 0 },
                googleId: profile.id,
                provider: 'google'
            });

            await newUser.save();
            console.log('✅ New Google user saved to MongoDB:', newUser.email);
            
            return cb(null, newUser);
        } catch (error) {
            console.error('❌ Error in Google Strategy:', error);
            return cb(error, null);
        }
    }
));

// Serialize user for session
passport.serializeUser(function(user, cb) {
    cb(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async function(id, cb) {
    try {
        const user = await User.findById(id);
        cb(null, user);
    } catch (error) {
        cb(error, null);
    }
});

// ===== FILE PATHS =====
const DATA_PATH = path.join(__dirname, "foundData.json");
const LOST_DATA_PATH = path.join(__dirname, "lostData.json");
const USER_DATA_PATH = path.join(__dirname, "data.json");

// ===== FILE UPLOAD CONFIGURATION =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// ===== MOCK DATA =====
const listings = [
  {
    username: "jaaankiiiii",
    timeAgo: "3h ago",
    status: "lost",
    title: "Classic Teddy",
    category: "Accessories",
    location: "Chandigarh",
    date: "24 Mar 2026",
    image: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=400&auto=format&fit=crop",
    description: "A small toy has been reported lost recently.It is colorful and soft, making it easy to recognize. The toy was last seen in the nearby play area.It may hold special sentimental value for its owner.If anyone finds it, please return it to the lost and found section.",
  },
  {
    username: "alex_smith",
    timeAgo: "5h ago",
    status: "found",
    title: "Luxury Watch",
    category: "Electronics",
    location: "Sector 17",
    date: "01 Mar 2026",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400&auto=format&fit=crop",
    description: "A **wristwatch** has been reported lost recently. It has a simple yet elegant design with a round dial and a comfortable strap. The watch may have great personal or sentimental value to its owner. It was last seen in a public place and might have been misplaced accidentally. Anyone who finds it is kindly requested to return it to the lost and found.",
  },
  {
    username: "jaspreetKaur117",
    timeAgo: "3h ago",
    status: "lost",
    title: "Gold Earrings",
    category: "Accessories",
    location: "Chandigarh",
    date: "24 Mar 2026",
    image: "/images/earrings.png",
    description: "A **pair of earrings** has been reported lost recently. They are small, elegant, and likely made of metal with a delicate design that makes them easy to recognize. The earrings may have significant sentimental or personal value to the owner. They were last seen in a public area and might have been misplaced accidentally. Anyone who finds them is kindly requested to return them to the lost and found or contact the owner.",
  },
  {
    username: "jigyasa_24",
    timeAgo: "3h ago",
    status: "lost",
    title: "Car Keys",
    category: "Keys",
    location: "Mohali",
    date: "30 Mar 2026",
    image: "/images/keys.png",
    description: "A **set of keys** has been reported lost recently. The keys are attached to a small keychain, making them easier to identify. They were last seen in a public area and may have been dropped accidentally. These keys are important for the owner's daily use. Anyone who finds them is kindly requested to return them to the lost and found or contact the owner. 🔑",
  },
];
function verifyToken(req, res, next) {
  const bearerHeader = req.headers["authorization"];

  if (!bearerHeader) {
    return res.status(403).json({ message: "Token required" });
  }

  const token = bearerHeader.split(" ")[1];

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// ==========================================
// ===== ALL ROUTES =====
// ==========================================

// HOME ROUTE
app.get("/", (req, res) => {
  res.redirect("/Welcome");
});
app.get("/dashboard-data", verifyToken, (req, res) => {
  res.json({ listings });
});
// WELCOME PAGE
app.get("/Welcome", (req, res) => {
  res.render("Welcome", { title: "Welcome Page" });
});

// LOGIN PAGE
app.get("/login", (req, res) => {
  res.render("login");
});

// SIGNUP PAGE
app.get("/signup", (req, res) => {
  res.render("signup", { title: "signup" });
});

// ===== SIGNUP ROUTE (MongoDB) =====
app.post("/signup", upload.single("profilePic"), async (req, res) => {
  try {
    const { fullname, username, password } = req.body;

    const existingUser = await User.findOne({ email: username });
    if (existingUser) {
      return res.json({ success: false, message: "User already exists!" });
    }

    // 🔐 HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: fullname,
      email: username,
      password: hashedPassword,
      profilePic: req.file ? `/uploads/${req.file.filename}` : "/images/default.png",
      bio: "Helping the community find lost items!",
      phone: "Not added yet",
      campus: "Main Campus",
      role: "Student",
      stats: { lost: 0, found: 0, returned: 0 },
      provider: 'local'
    });

    await newUser.save();

    res.json({ success: true });

  } catch (error) {
    console.error("Signup error:", error);
    res.json({ success: false, message: "Signup failed" });
  }
});

// ===== LOGIN ROUTE (MongoDB) =====
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ email: username });

    if (!user) {
      return res.json({ success: false, message: "Invalid email or password" });
    }

    if (user.provider === 'google') {
      return res.json({
        success: false,
        message: "Use Google Sign-In"
      });
    }

    // 🔐 COMPARE HASHED PASSWORD
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({ success: false, message: "Invalid email or password" });
    }

    // 🔑 GENERATE JWT TOKEN
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Optional: still keep session (hybrid auth)
    // req.session.user = user;

    res.json({
      success: true,
      token: token,
      user: {
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.json({ success: false, message: "Login failed" });
  }
});

// ===== DASHBOARD ROUTE =====
app.get("/dashboard", verifyToken, (req, res) => {
  res.render("dashboard", { listings });
});

// ===== REPORT FOUND ROUTES =====
app.get("/report-found", (req, res) => {
  res.render("report-found");
});

app.post("/report-found", (req, res) => {
  fs.readFile(DATA_PATH, "utf8", (err, data) => {
    let listings = [];
    if (!err && data) {
      listings = JSON.parse(data);
    }

    const newItem = {
      id: Date.now(),
      username: req.body.founderName,
      timeAgo: "Just now",
      status: "found",
      title: req.body.itemTitle,
      category: req.body.itemType,
      location: req.body.location,
      date: req.body.date,
      image: req.body.image || "https://via.placeholder.com/400",
      description: req.body.description,
    };

    listings.push(newItem);
    fs.writeFile(DATA_PATH, JSON.stringify(listings, null, 2), (err) => {
      if (err) return res.send("Error saving data.");
      res.redirect("/dashboard");
    });
  });
});

// ===== REPORT LOST ROUTES =====
app.get("/report-lost", (req, res) => {
  res.render("report-lost");
});

app.post("/submit-lost-report", upload.single("itemImage"), (req, res) => {
  fs.readFile(LOST_DATA_PATH, "utf8", (err, data) => {
    let listings = err ? [] : JSON.parse(data || "[]");

    const newLostItem = {
      id: Date.now(),
      username: `${req.body.firstName} ${req.body.lastName}`,
      timeAgo: "Just now",
      status: "lost",
      title: req.body.category,
      category: req.body.category,
      location: req.body.location,
      date: req.body.dateLost,
      image: req.file
        ? `/uploads/${req.file.filename}`
        : "https://via.placeholder.com/400",
      description: req.body.description,
    };

    listings.push(newLostItem);

    fs.writeFile(LOST_DATA_PATH, JSON.stringify(listings, null, 2), (err) => {
      if (err) return res.status(500).send("Error saving data.");
      res.redirect("/dashboard");
    });
  });
});

// ===== PROFILE ROUTE =====
app.get("/profile", verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.render("profile", { user });
});

// ===== GOOGLE AUTH ROUTES =====
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  async (req, res) => {
    try {
      // 🔑 CREATE JWT FOR GOOGLE USER
      const token = jwt.sign(
        { id: req.user._id, email: req.user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      // Redirect with token (frontend can store it)
      res.redirect(`/dashboard?token=${token}`);

    } catch (error) {
      console.error('❌ Google callback error:', error);
      res.redirect('/login');
    }
  }
);

// ===== LOGOUT ROUTE =====
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect("/login");
  });
});

// ===== 404 PAGE =====
app.use((req, res) => {
  res.status(404).render("pageNotFound", { title: "Page Not Found" });
});

// ===== START SERVER =====
app.listen(3000, () => {
  console.log(" Server running on http://localhost:3000");
});

