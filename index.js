//code for signup page to mongodb setup
// ===== MONGODB CONNECTION (ADD THIS) =====
const mongoose = require("mongoose");

// mongoose.connect("mongodb://127.0.0.1:27017/lostfoundDB", {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(() => console.log("MongoDB Connected ✅"))
// .catch(err => console.log(err));
mongoose.connect("mongodb://127.0.0.1:27017/lostfoundDB")
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log(err));

// ===== USER SCHEMA (ADD THIS) =====
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
  }
});

const User = mongoose.model("User", userSchema);

//.env file ki line
require('dotenv').config();

// // WELCOME PAGE (friend ka code)

//Jaspreet code
/////////////////////////
const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const passport = require('passport');
require('./auth/google');
const app = express();
const DATA_PATH = path.join(__dirname, "foundData.json");
const LOST_DATA_PATH = path.join(__dirname, "lostData.json");
// const fs = require("fs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true })); // This middleware parses form data
const multer = require("multer");

app.set("view engine", "ejs");
app.use(express.static("public"));

// CORS FIX
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST");
  next();
});

app.use(
  session({
    secret: "my_secret_key", // Choose a unique secret
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  }),
);

// Initialize Passport.js
app.use(passport.initialize());
app.use(passport.session());

const USER_DATA_PATH = path.join(__dirname, "data.json");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/"); // Make sure this folder exists!
  },
  filename: (req, file, cb) => {
    // Renames file to: 171023456789.jpg (prevents naming conflicts)
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });
// Mock Data - In a real app, this comes from a database
const listings = [
  {
    // id: 1,
    username: "jaaankiiiii",
    timeAgo: "3h ago",
    status: "lost",
    title: "Classic Teddy",
    category: "Accessories",
    location: "Chandigarh",
    date: "24 Mar 2026",
    image:
      "https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=400&auto=format&fit=crop",
    description:
      "A small toy has been reported lost recently.It is colorful and soft, making it easy to recognize. The toy was last seen in the nearby play area.It may hold special sentimental value for its owner.If anyone finds it, please return it to the lost and found section.",
  },
  {
    // id: 2,
    username: "alex_smith",
    timeAgo: "5h ago",
    status: "found",
    title: "Luxury Watch",
    category: "Electronics",
    location: "Sector 17",
    date: "01 Mar 2026",
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400&auto=format&fit=crop",
    description:
      "A **wristwatch** has been reported lost recently. It has a simple yet elegant design with a round dial and a comfortable strap. The watch may have great personal or sentimental value to its owner. It was last seen in a public place and might have been misplaced accidentally. Anyone who finds it is kindly requested to return it to the lost and found.",
  },
  {
    username: "jaspreetKaur117",
    timeAgo: "3h ago",
    status: "lost",
    title: "Gold Earrings",
    category: "Accessories",
    location: "Chandigarh",
    date: "24 Mar 2026",
    image: "/images/earrings.png", // Placeholder for earrings.png
    description:
      "A **pair of earrings** has been reported lost recently. They are small, elegant, and likely made of metal with a delicate design that makes them easy to recognize. The earrings may have significant sentimental or personal value to the owner. They were last seen in a public area and might have been misplaced accidentally. Anyone who finds them is kindly requested to return them to the lost and found or contact the owner.",
  },
  {
    username: "jigyasa_24",
    timeAgo: "3h ago",
    status: "lost",
    title: "Car Keys",
    category: "Keys",
    location: "Mohali",
    date: "30 Mar 2026",
    image: "/images/keys.png", // Placeholder for keys.png
    description:
      "A **set of keys** has been reported lost recently. The keys are attached to a small keychain, making them easier to identify. They were last seen in a public area and may have been dropped accidentally. These keys are important for the owner’s daily use. Anyone who finds them is kindly requested to return them to the lost and found or contact the owner. 🔑",
  },
];

// HOME ROUTE
app.get("/", (req, res) => {
  res.redirect("/Welcome");
});

// WELCOME PAGE
app.get("/Welcome", (req, res) => {
  res.render("Welcome", { title: "Welcome Page" });
});

// LOGIN PAGE (HTML)
app.get("/login", (req, res) => {
  // res.sendFile(path.join(__dirname, "views", "login.ejs"));
  res.render("login");
});

// SIGNUP PAGE (HTML)
app.get("/signup", (req, res) => {
  // res.sendFile(path.join(__dirname, "views", "signup.ejs"));
  res.render("signup", { title: "signup" });
});

// SIGNUP LOGIC
// Add these at the top of app.js
app.use(express.json());

// app.post("/signup", upload.single("profilePic"), (req, res) => {
  app.post("/signup", upload.single("profilePic"), (req, res) => {
  const { fullname, username, password } = req.body;
  const USER_DATA_PATH = path.join(__dirname, "data.json");

  // 1. Read existing users
  let users = [];
  if (fs.existsSync(USER_DATA_PATH)) {
    users = JSON.parse(fs.readFileSync(USER_DATA_PATH, "utf8") || "[]");
  }

  // 2. Check if user already exists
  if (users.find((u) => u.email === username)) {
    return res.json({ success: false, message: "User already exists!" });
  }

  // 3. Create new user object (Matching your profile.ejs keys)
  const newUser = {
    name: fullname, // Saved as 'name' for the profile
    email: username, // Saved as 'email'
    password: password,

    profilePic: req.file ? `/uploads/${req.file.filename}` : "/images/default.png",

    bio: "Helping the community find lost items!",
    phone: "Not added yet",
    campus: "Main Campus",
    role: "Student",
    stats: { lost: 0, found: 0, returned: 0 },
  };

  // 4. Save to file
  users.push(newUser);
  fs.writeFileSync(USER_DATA_PATH, JSON.stringify(users, null, 2));
  ////////////////////////////(here added signup to mongodb code)
  // ===== SAVE USER TO MONGODB (ADD THIS) =====
const mongoUser = new User({
  name: fullname,
  email: username,
  password: password,
  profilePic: req.file 
    ? `/uploads/${req.file.filename}` 
    : "/images/default.png",
  bio: "Helping the community find lost items!",
  phone: "Not added yet",
  campus: "Main Campus",
  role: "Student",
  stats: { lost: 0, found: 0, returned: 0 },
});

mongoUser.save()
  .then(() => console.log("User saved to MongoDB ✅"))
  .catch(err => console.log(err));
  //////////////////////////////(ended here)

  // 5. Tell the frontend it worked
  res.json({ success: true });
});



// LOGIN LOGIC
// Make sure you have this middleware at the top of your app.js to read JSON
app.use(express.json());



// 404 PAGE

//dashboard and forms
app.get("/dashboard", (req, res) => {
  res.render("dashboard", { listings: listings });
});

// Route to show the form
app.get("/report-found", (req, res) => {
  res.render("report-found");
});

// Route to handle form submission
app.post("/report-found", (req, res) => {
  // 1. Read existing data
  fs.readFile(DATA_PATH, "utf8", (err, data) => {
    let listings = [];
    if (!err && data) {
      listings = JSON.parse(data);
    }

    // 2. Create new item object from form fields
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

    // 3. Add to array and save back to JSON file
    listings.push(newItem);
    fs.writeFile(DATA_PATH, JSON.stringify(listings, null, 2), (err) => {
      if (err) return res.send("Error saving data.");
      res.redirect("/dashboard"); // Redirect user to see their new post
    });
  });
});
app.get("/report-lost", (req, res) => {
  res.render("report-lost"); // This looks for views/report-lost.ejs
});
// Route to handle LOST form submission
app.post("/submit-lost-report", upload.single("itemImage"), (req, res) => {
  fs.readFile(LOST_DATA_PATH, "utf8", (err, data) => {
    let listings = err ? [] : JSON.parse(data || "[]");

    const newLostItem = {
      id: Date.now(),
      username: `${req.body.firstName} ${req.body.lastName}`,
      timeAgo: "Just now",
      status: "lost", // Mark as lost
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

// --- FIXED LOGIN LOGIC ---
/////////////////(login using mongodb(jigyasa))
// ===== MONGODB LOGIN (ADD THIS ABOVE EXISTING LOGIN) =====
app.post("/login", async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const mongoUser = await User.findOne({ email: username });

    if (mongoUser && mongoUser.password === password) {
      req.session.user = mongoUser;
      return res.json({ success: true });
    }

    // Agar MongoDB me nahi mila → next login (JSON wala) run hoga
    next();

  } catch (err) {
    console.log(err);
    next();
  }
});
///////////////////(code ended (login to mongodb))
app.post("/login", (req, res) => {
  const { username, password } = req.body; // username is the email from your form

  // Read users from your JSON file
  const users = JSON.parse(fs.readFileSync(USER_DATA_PATH, "utf8") || "[]");

  // Find the specific user
  const foundUser = users.find(
    (u) => u.email === username && u.password === password,
  );

  if (foundUser) {
    // SAVE THE FOUND USER OBJECT INTO THE SESSION
    req.session.user = foundUser;
    res.json({ success: true });
  } else {
    res.json({ success: false, message: "Invalid email or password" });
  }
});

// --- FIXED PROFILE ROUTE ---
app.get("/profile", (req, res) => {
  // Check if a user is logged in via session
  if (req.session.user) {
    // Render the profile using the session data (NOT hardcoded data)
    res.render("profile", { user: req.session.user });
  } else {
    // If no session exists, send them back to login
    res.redirect("/login");
  }
});

// --- GOOGLE AUTH ROUTES ---
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication
    req.session.user = req.user;
    res.redirect('/dashboard');
  }
);

app.use((req, res) => {
  res.status(404).render("pageNotFound", { title: "Page Not Found" });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});