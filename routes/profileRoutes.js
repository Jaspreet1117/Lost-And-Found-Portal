const express = require("express");

const router = express.Router();

const verifyToken = require(
  "../middleware/authMiddleware",
);

const upload = require(
  "../utils/multer",
);

const profileController = require(
  "../controllers/profileController",
);

router.get(
  "/profile",
  verifyToken,
  profileController.getProfile,
);

router.post(
  "/profile/update",
  verifyToken,
  upload.single("profilePic"),
  profileController.updateProfile,
);

router.post(
  "/change-password",
  verifyToken,
  profileController.changePassword,
);

module.exports = router;