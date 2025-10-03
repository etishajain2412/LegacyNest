const FamilyCircle = require("../models/familyCircle");

exports.createFamilyCircle = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Circle name is required" });
    }

    const familyCircle = new FamilyCircle({
      name,
      description,
      createdBy: req.user.id,
      members: [
        {
          user: req.user.id,
          role: "admin",
        },
      ],
    });

    await familyCircle.save();

    res.status(201).json({
      message: "Family circle created successfully",
      familyCircle,
    });
  } catch (error) {
    console.error("Error creating family circle:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
