// const {
//   LostItem,
// } = require("../models/LostFound");

// exports.showLostForm = (req, res) => {
//   res.render("report-lost");
// };

// exports.reportLost = async (
//   req,
//   res,
// ) => {
//   try {
//     const {
//       firstName,
//       lastName,
//       phone,
//       category,
//       description,
//       dateLost,
//       location,
//       locationDetails,
//     } = req.body;

//     const imagePath = req.file
//       ? `/uploads/${req.file.filename}`
//       : null;

//     const lostItem = new LostItem({
//       reporterName:
//         firstName + " " + lastName,

//       title: category,
//       category,
//       location,
//       dateLost,
//       description,
//       contactPhone: phone,
//       locationDetails,
//       imagePath,
//       postedBy: req.user.id,
//     });

//     await lostItem.save();

//     res.redirect("/dashboard");
//   } catch (err) {
//     console.log(err);

//     res.render("report-lost", {
//       error: "Server Error",
//     });
//   }
// };
// const Post = require("../models/Post");

// // GET — lost form dikhao
// exports.showLostForm = (req, res) => {
//   res.render("report-lost");
// };

// // POST — lost item save karo
// exports.reportLost = async (req, res) => {
//   try {
//     const { title, category, description, location, dateLost } = req.body;

//     const newPost = new Post({
//       status: "lost",                          // ← zaruri: "lost" set karo
//       title,
//       category,
//       description,
//       location,
//       dateLost: dateLost ? new Date(dateLost) : Date.now(),
//       imagePath: req.file ? `/uploads/${req.file.filename}` : "",
//       postedBy: req.user.id,                   // ← zaruri: logged-in user ki id
//     });

//     await newPost.save();
//     res.redirect("/dashboard");
//   } catch (err) {
//     console.error("Report Lost Error:", err);
//     res.status(500).send("Server Error");
//   }
// };
const Post = require("../models/Post");

exports.showLostForm = (req, res) => {
  res.render("report-lost");
};

exports.reportLost = async (req, res) => {
  try {
    // report-lost.ejs ke actual form field names:
    // firstName, lastName, phone, category, description, dateLost, location, locationDetails
    const { firstName, lastName, category, description, location, dateLost } = req.body;

    const newPost = new Post({
      status: "lost",
      title: `${firstName || ""} ${lastName || ""}`.trim(),
      category: category || "",
      description: description || "",
      location: location || "",
      dateLost: dateLost ? new Date(dateLost) : new Date(),
      imagePath: req.file ? `/uploads/${req.file.filename}` : "",
      postedBy: req.user.id,
    });

    await newPost.save();
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Report Lost Error:", err);
    res.status(500).send("Server Error");
  }
};