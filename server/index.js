require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));
  
app.get('/api/test', (req, res) => {
  res.json({ message: 'API working!' });
});

app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));