const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./configs/db');
const cookieParser=require('cookie-parser')
const passport=require('./configs/passport')

//Routes
const authRoutes=require('./routes/authRoutes')
const storyRoutes = require('./routes/storyRoutes.js');
const profileRoutes = require('./routes/profileRoutes.js');

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 
app.use(cookieParser());
app.use(passport.initialize());
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.get('/', (req, res) => {
  res.send('🚀 Backend server is running!');
});


//apis
app.use('/api/stories', storyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile',profileRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});



