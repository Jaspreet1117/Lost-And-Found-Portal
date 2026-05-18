const express = require("express");

const router = express.Router();

const verifyToken = require(
  "../middleware/authMiddleware",
);

const upload = require(
  "../utils/multer",
);

const foundController = require(
  "../controllers/foundController",
);

router.get(
  "/report-found",
  verifyToken,
  foundController.showFoundForm,
);

router.post(
  "/report-found",
  verifyToken,
  upload.single("itemImage"),
  foundController.reportFound,
);

module.exports = router;