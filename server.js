const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGO_URI = 'mongodb+srv://PCCOE:PCCOE@pccoe-learning-tool.4z08jj2.mongodb.net/studentDB?retryWrites=true&w=majority&appName=PCCOE-Learning-Tool';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Error:', err));

// Schemas
const studentSchema = new mongoose.Schema({
  name: String,
  prn: { type: String, unique: true },
  department: String,
  division: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'Student' }
});

const teacherSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  department: String,
  designation: String,
  role: { type: String, default: 'Teacher' }
});

// Password Hashing
studentSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

teacherSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Models
const Student = mongoose.model('Student', studentSchema);
const Teacher = mongoose.model('Teacher', teacherSchema);

// Routes

// Student Registration
app.post('/api/student/register', async (req, res) => {
  try {
    const { name, prn, department, division, email, password } = req.body;

    if (!name || !prn || !department || !division || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const existing = await Student.findOne({ $or: [{ email }, { prn }] });
    if (existing) return res.status(400).json({ success: false, message: 'Student already exists' });

    const newStudent = new Student({ name, prn, department, division, email, password });
    await newStudent.save();
    res.status(201).json({ success: true, message: 'Student registered successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// Teacher Registration
app.post('/api/teacher/register', async (req, res) => {
  try {
    const { name, email, department, password } = req.body;
    
    if (!name || !email || !department || !password) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    
    const newTeacher = new Teacher({ name, email, department, password });
    await newTeacher.save();
    
    res.status(201).json({
      success: true,
      message: 'Teacher registered successfully',
      data: {
        _id: newTeacher._id,
        name: newTeacher.name,
        email: newTeacher.email,
        department: newTeacher.department,
        role: newTeacher.role
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// ... [keep all your existing imports and setup] ...

// Simplified Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Email, password & role required' });
    }

    let user;
    if (role === 'Student') {
      user = await Student.findOne({ email });
    } else if (role === 'Teacher') {
      user = await Teacher.findOne({ email });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    if (!user) return res.status(404).json({ success: false, message: `${role} not found` });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Incorrect password' });

    // Return user data without password
    const userData = user.toObject();
    delete userData.password;

    res.status(200).json({
      success: true,
      message: `${role} logged in successfully`,
      user: userData
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Login error' });
  }
});

// ... [keep all your other routes] ...
// Protected route example
app.get('/api/protected', (req, res) => {
  // In a real app, you would verify the token here
  res.json({ success: true, message: 'Protected data' });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is healthy' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});