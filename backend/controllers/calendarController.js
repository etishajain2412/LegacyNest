const CalendarEvent = require("../models/CalendarEvent");

exports.getEvents = async (req, res) => {
  try {
    const userId = req.params.userId;

    const events = await CalendarEvent.find({
      $or: [
        { visibility: "all" },          
        { visibility: "me", userId: userId } 
      ]
    }).sort({ date: 1 });

    res.json({ success: true, events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const { userId, date, message, visibility } = req.body;
    const event = new CalendarEvent({ userId, date, message, visibility });
    await event.save();
    res.json({ success: true, event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const { date, message, visibility } = req.body;
    const event = await CalendarEvent.findByIdAndUpdate(
      req.params.id,
      { date, message, visibility },
      { new: true }
    );
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    res.json({ success: true, event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await CalendarEvent.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
