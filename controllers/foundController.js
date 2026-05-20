// const {
//   FoundItem,
// } = require("../models/LostFound");

// exports.showFoundForm = (req, res) => {
//   res.render("report-found");
// };

// exports.reportFound = async (
//   req,
//   res,
// ) => {
//   try {
//     const {
//       founderName,
//       brandColor,
//       itemType,
//       location,
//       foundDate,
//       description,
//       contactEmail,
//       contactPhone,
//     } = req.body;

//     const imagePath = req.file
//       ? `/uploads/${req.file.filename}`
//       : null;

//     const foundItem = new FoundItem({
//       founderName,
//       brandColor,
//       itemType,
//       location,
//       foundDate,
//       description,
//       contactEmail,
//       contactPhone,
//       imagePath,
//       postedBy: req.user.id,
//     });

//     await foundItem.save();

//     res.redirect("/dashboard");
//   } catch (err) {
//     console.log(err);

//     res.render("report-found");
//   }
// };
// const Post = require("../models/Post");

// // GET — found form dikhao
// exports.showFoundForm = (req, res) => {
//   res.render("report-found");
// };

// // POST — found item save karo
// exports.reportFound = async (req, res) => {
//   try {
//     const { title, category, description, location, foundDate } = req.body;

//     const newPost = new Post({
//       status: "found",                          // ← zaruri: "found" set karo
//       title,
//       category,
//       description,
//       location,
//       foundDate: foundDate ? new Date(foundDate) : Date.now(),
//       imagePath: req.file ? `/uploads/${req.file.filename}` : "",
//       postedBy: req.user.id,                    // ← zaruri: logged-in user ki id
//     });

//     await newPost.save();
//     res.redirect("/dashboard");
//   } catch (err) {
//     console.error("Report Found Error:", err);
//     res.status(500).send("Server Error");
//   }
// };
const Post = require("../models/Post");

exports.showFoundForm = (req, res) => {
  res.render("report-found");
};

exports.reportFound = async (req, res) => {
  try {
    // report-found.ejs ke actual form field names:
    // founderName, email, phone, relation, itemType, brandColor, location, foundDate, details
    const { itemType, brandColor, location, foundDate, details } = req.body;

    const newPost = new Post({
      status: "found",
      title: brandColor || itemType || "Found Item",  // profile card mein title dikhega
      category: itemType || "",
      description: details || "",
      location: location || "",
      foundDate: foundDate ? new Date(foundDate) : new Date(),
      imagePath: req.file ? `/uploads/${req.file.filename}` : "",
      // Legacy fields bhi save karo (profile.ejs inhe bhi use karta hai)
      itemType: itemType || "",
      brandColor: brandColor || "",
      postedBy: req.user.id,
    });

    await newPost.save();
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Report Found Error:", err);
    res.status(500).send("Server Error");
  }
};