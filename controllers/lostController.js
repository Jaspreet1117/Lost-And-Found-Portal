const {
  LostItem,
} = require("../models/LostFound");

exports.showLostForm = (req, res) => {
  res.render("report-lost");
};

exports.reportLost = async (
  req,
  res,
) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      category,
      description,
      dateLost,
      location,
      locationDetails,
    } = req.body;

    const imagePath = req.file
      ? `/uploads/${req.file.filename}`
      : null;

    const lostItem = new LostItem({
      reporterName:
        firstName + " " + lastName,

      title: category,
      category,
      location,
      dateLost,
      description,
      contactPhone: phone,
      locationDetails,
      imagePath,
      postedBy: req.user.id,
    });

    await lostItem.save();

    res.redirect("/dashboard");
  } catch (err) {
    console.log(err);

    res.render("report-lost", {
      error: "Server Error",
    });
  }
};