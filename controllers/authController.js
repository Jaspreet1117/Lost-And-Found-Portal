const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.signup = async (req, res) => {
  try {
    const { fullname, username, password, userId } = req.body;

    const existing = await User.findOne({
      email: username,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({
      name: fullname,
      email: username,
      password: hashed,
      userId,
    });

    await user.save();

    res.json({
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      email: username,
    });

    if (!user) {
      return res.json({
        success: false,
      });
    }

    const match = await bcrypt.compare(
      password,
      user.password,
    );

    if (!match) {
      return res.json({
        success: false,
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
    );

    res.cookie("token", token);

    res.json({
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
    });
  }
};