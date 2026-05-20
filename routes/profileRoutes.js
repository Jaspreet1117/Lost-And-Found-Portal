// const express = require("express");

// const router = express.Router();

// const verifyToken = require(
//   "../middleware/authMiddleware",
// );

// const upload = require(
//   "../utils/multer",
// );

// const profileController = require(
//   "../controllers/profileController",
// );

// router.get(
//   "/profile",
//   verifyToken,
//   profileController.getProfile,
// );

// router.post(
//   "/profile/update",
//   verifyToken,
//   upload.single("profilePic"),
//   profileController.updateProfile,
// );

// router.post(
//   "/change-password",
//   verifyToken,
//   profileController.changePassword,
// );

// module.exports = router;
const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");

// Agar aapke paas koi auth middleware hai (jaise ensureAuth ya isLoggedIn) toh use lagayein
// Agar middleware nahi hai, toh abhi bina middleware ke test karne ke liye 'ensureAuth' hatakar check kar sakte hain
const { ensureAuth } = require("../middleware/authMiddleware"); 

// Middleware ko route ke beech mein pass karein taaki req.user.id null na aaye
router.get("/", ensureAuth, profileController.getProfile);
router.post("/update", ensureAuth, profileController.updateProfile);
router.post("/change-password", ensureAuth, profileController.changePassword);

module.exports = router;