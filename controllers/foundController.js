const {
  FoundItem,
} = require("../models/LostFound");

exports.showFoundForm = (req, res) => {
  res.render("report-found");
};

exports.reportFound = async (
  req,
  res,
) => {
  try {
    const {
      founderName,
      brandColor,
      itemType,
      location,
      foundDate,
      description,
      contactEmail,
      contactPhone,
    } = req.body;

    const imagePath = req.file
      ? `/uploads/${req.file.filename}`
      : null;

    const foundItem = new FoundItem({
      founderName,
      brandColor,
      itemType,
      location,
      foundDate,
      description,
      contactEmail,
      contactPhone,
      imagePath,
      postedBy: req.user.id,
    });

    await foundItem.save();

    res.redirect("/dashboard");
  } catch (err) {
    console.log(err);

    res.render("report-found");
  }
};