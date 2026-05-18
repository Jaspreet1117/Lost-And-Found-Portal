const User = require("../models/User");

const bcrypt = require("bcrypt");

exports.getProfile = async (
  req,
  res,
) => {
  try {
    const user = await User.findById(
      req.user.id,
    );

    res.render("profile", { user });
  } catch (err) {
    console.log(err);
  }
};

exports.updateProfile = async (
  req,
  res,
) => {
  try {
    const user = await User.findById(
      req.user.id,
    );

    if (req.body.name)
      user.name = req.body.name;

    if (req.body.phone)
      user.phone = req.body.phone;

    if (req.body.bio)
      user.bio = req.body.bio;

    if (req.body.campus)
      user.campus = req.body.campus;

    if (req.file) {
      user.profilePic = `/uploads/${req.file.filename}`;
    }

    await user.save();

    res.json({
      success: true,
    });
  } catch (err) {
    console.log(err);
  }
};

exports.changePassword = async (
  req,
  res,
) => {
  try {
    const {
      oldPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    if (
      newPassword !== confirmPassword
    ) {
      return res.json({
        success: false,
      });
    }

    const user = await User.findById(
      req.user.id,
    );

    const match = await bcrypt.compare(
      oldPassword,
      user.password,
    );

    if (!match) {
      return res.json({
        success: false,
      });
    }

    const hashed = await bcrypt.hash(
      newPassword,
      10,
    );

    user.password = hashed;

    await user.save();

    res.json({
      success: true,
    });
  } catch (err) {
    console.log(err);
  }
};