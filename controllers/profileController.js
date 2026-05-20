const User = require("../models/User");
const Post = require("../models/Post"); // Unified Post model
const bcrypt = require("bcrypt");

// GET Profile page — user ke saare lost & found posts dikhao
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // Is user ke saare posts, nayi se purani order mein
    const myPosts = await Post.find({ postedBy: req.user.id }).sort({ createdAt: -1 });

    // Status ke basis par alag karo
    const lostItems  = myPosts.filter(item => item.status === "lost");
    const foundItems = myPosts.filter(item => item.status === "found");

    res.render("profile", {
      user,
      lostItems:  lostItems  || [],
      foundItems: foundItems || [],
    });
  } catch (err) {
    console.error("Profile Fetch Error:", err);
    res.status(500).send("Server Error");
  }
};

// POST — profile info update karo
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (req.body.name)   user.name   = req.body.name;
    if (req.body.phone)  user.phone  = req.body.phone;
    if (req.body.bio)    user.bio    = req.body.bio;
    if (req.body.campus) user.campus = req.body.campus;
    if (req.file)        user.profilePic = `/uploads/${req.file.filename}`;
    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(500).json({ success: false });
  }
};

// POST — password change karo
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword)
      return res.json({ success: false, message: "Passwords do not match" });

    const user = await User.findById(req.user.id);
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match)
      return res.json({ success: false, message: "Wrong current password" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error("Change Password Error:", err);
    res.status(500).json({ success: false });
  }
};