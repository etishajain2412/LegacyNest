const User = require('../models/User.js');
const bcrypt = require('bcryptjs');

const getProfile = async (req, res) => {
  try {
    
    const user = await User.findById(req.user.id).select('-password -refreshToken');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const isOAuthUser = !user.password;
    res.json({ ...user.toObject(), isOAuthUser });
  } catch (error) {
    console.error('getProfile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


const updateProfile = async (req, res) => {
  try {
    const { name, birthYear } = req.body;

    if ((name === undefined || name === null || String(name).trim() === '') && birthYear === undefined) {
      return res.status(400).json({ message: 'Provide name and/or birthYear to update' });
    }

    const updates = {};

    if (name !== undefined) {
      if (String(name).trim() === '') {
        return res.status(400).json({ message: 'Name cannot be empty' });
      }
      updates.name = String(name).trim();
    }

    if (birthYear !== undefined) {
      const by = Number(birthYear);
      const currentYear = new Date().getFullYear();
      if (!Number.isFinite(by) || !Number.isInteger(by)) {
        return res.status(400).json({ message: 'birthYear must be an integer' });
      }
      if (by < 1900 || by > currentYear) {
        return res.status(400).json({ message: `birthYear must be between 1900 and ${currentYear}` });
      }
      updates.birthYear = by;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


const updateBirthYear = async (req, res) => {
  try {
    const { birthYear } = req.body;

    if (birthYear === undefined) {
      return res.status(400).json({ message: 'birthYear is required' });
    }

    const by = Number(birthYear);
    const currentYear = new Date().getFullYear();
    if (!Number.isFinite(by) || !Number.isInteger(by)) {
      return res.status(400).json({ message: 'birthYear must be an integer' });
    }
    if (by < 1900 || by > currentYear) {
      return res.status(400).json({ message: `birthYear must be between 1900 and ${currentYear}` });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { birthYear: by },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Birth year updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('updateBirthYear error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('updatePassword error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


module.exports = {
  getProfile,
  updateProfile,
  updateBirthYear,
  updatePassword
};
