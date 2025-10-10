const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
  return { accessToken, refreshToken };
};

const setCookies = (res, accessToken, refreshToken, userData) => {
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.cookie("user", JSON.stringify(userData), {
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// --------------- REGISTER ---------------
const register = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already exists" });

    const newUser = new User({ name, username, email, password });
    await newUser.save();

    const { accessToken, refreshToken } = generateTokens(newUser._id);
    await User.findByIdAndUpdate(newUser._id, { refreshToken });

    const userData = {
      id: newUser._id,
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
    };

    setCookies(res, accessToken, refreshToken, userData);

    res.status(201).json({ message: "Registered successfully", user: userData });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// --------------- LOGIN ---------------
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });
    if (!user) return res.status(400).json({ message: "User not found" });
    if (!user.password)
      return res.status(400).json({ message: "Use Google login instead" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const { accessToken, refreshToken } = generateTokens(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken });

    const userData = {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
    };

    setCookies(res, accessToken, refreshToken, userData);
    res.json({ message: "Login successful", user: userData });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// --------------- GOOGLE CALLBACK ---------------
const googleCallback = async (req, res) => {
let frontendUrl = process.env.FRONTEND_URL_PROD;
if (req.headers.host.includes('localhost')) {
  frontendUrl = process.env.FRONTEND_URL_DEV;
}

  try {
    const user = req.user;
    console.log(user);
    if (!user)
      return res.redirect(`${frontendUrl}/login?error=Authentication failed`);

    const { accessToken, refreshToken } = generateTokens(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken });

    const userData = {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
    };

    setCookies(res, accessToken, refreshToken, userData);
    console.log(frontendUrl)
    res.redirect(`${frontendUrl}/profile`);
  } catch (err) {
    res.redirect(`${frontendUrl}/login?error=Server error`);
  }
};

// --------------- REFRESH TOKEN ---------------
const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken)
      return res.status(401).json({ message: "No refresh token" });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken)
      return res.status(403).json({ message: "Invalid refresh token" });

    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_ACCESS_SECRET, {
      expiresIn: "15m",
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.json({ message: "Token refreshed" });
  } catch (err) {
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

// --------------- LOGOUT ---------------
const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const decoded = jwt.decode(refreshToken);
      if (decoded?.id) await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
    }
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.clearCookie("user");
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { register, login, refreshAccessToken, googleCallback, logout };
