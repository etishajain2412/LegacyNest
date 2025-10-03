const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./configs/db');
const eventsRouter = require("./routes/events");

dotenv.config();
console.log('Loaded MONGO_URI:', process.env.MONGO_URI);

connectDB();

const app = express();
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use("/api/events", eventsRouter);


app.get('/', (req, res) => {
  res.send('🚀 Backend server is running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});