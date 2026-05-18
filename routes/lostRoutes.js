const express = require("express");

const router = express.Router();

const verifyToken = require(
  "../middleware/authMiddleware",
);

const upload = require(
  "../utils/multer",
);

const lostController = require(
  "../controllers/lostController",
);

router.get(
  "/report-lost",
  verifyToken,
  lostController.showLostForm,
);

router.post(
  "/report-lost",
  verifyToken,
  upload.single("itemImage"),
  lostController.reportLost,
);

module.exports = router;