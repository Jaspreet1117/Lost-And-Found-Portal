// const User = require("../models/User");

// const bcrypt = require("bcrypt");
const User = require("../models/User");
// Apne project ke actual Lost aur Found models ko yahan require karein
const Lost = require("../models/Lost"); 
const Found = require("../models/Found"); 

const bcrypt = require("bcrypt");

// GET Profile page with user's specific posts
exports.getProfile = async (req, res) => {
  try {
    // 1. User ki profile details fetch karein
    const user = await User.findById(req.user.id);

    // 2. Sirf is logged-in user ke kiye hue Lost aur Found reports fetch karein
    // Maan lete hain ki models mein user ki id 'postedBy' ya 'userId' naam se save hoti hai
    const lostItems = await Lost.find({ postedBy: req.user.id }).sort({ createdAt: -1 });
    const foundItems = await Found.find({ postedBy: req.user.id }).sort({ createdAt: -1 });

    // 3. Ye saara data profile.ejs template ko pass kar dein
    res.render("profile", { 
      user, 
      lostItems: lostItems || [], 
      foundItems: foundItems || [] 
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
};

// exports.getProfile = async (req, res) => {
//   try {
//     // 1. Logged-in user ki details fetch karein
//     const user = await User.findById(req.user.id);

//     // 2. Is user ke dwara post kiye gaye Lost Items fetch karein
//     const lostItems = await LostItem.find({ postedBy: req.user.id }).sort({ createdAt: -1 });

//     // 3. Is user ke dwara post kiye gaye Found Items fetch karein
//     const foundItems = await FoundItem.find({ postedBy: req.user.id }).sort({ createdAt: -1 });

//     // 4. Sabhi data ko profile view me pass karein
//     res.render("profile", { 
//       user, 
//       lostItems, 
//       foundItems 
//     });
//   } catch (err) {
//     console.log(err);
//     res.status(500).send("Server Error");
//   }
// };

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