const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // for parsing JSON requests

// MongoDB connection
const MONGO_URI = 'mongodb+srv://PCCOE:PCCOE@pccoe-learning-tool.4z08jj2.mongodb.net/studentDB?retryWrites=true&w=majority&appName=PCCOE-Learning-Tool';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Error:', err));

// SCHEMAS
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

// Password Hashing (pre-save)
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

// MODELS
const Student = mongoose.model('Student', studentSchema);
const Teacher = mongoose.model('Teacher', teacherSchema);

// ROUTES

// ✅ Student Registration
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


// Teacher registration
app.post('/api/teacher/register', async (req, res) => {
    try {
        const { name, email, department, password } = req.body;
        
        // Simple validation
        if (!name || !email || !department || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        
        // Check if email already exists
        const existingTeacher = await Teacher.findOne({ email: email });
        if (existingTeacher) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }
        
        // Create new teacher
        const newTeacher = new Teacher({
            name,
            email,
            department,
            role: "Teacher",
            password
        });
        
        // Save to database
        await newTeacher.save();
        
        res.status(201).json({
            success: true,
            message: 'Teacher registered successfully',
            data: {
                _id: newTeacher._id,
                name: newTeacher.name,
                email: newTeacher.email,
                department: newTeacher.department,
                role: newTeacher.role,
                createdAt: newTeacher.createdAt,
                __v: newTeacher.__v
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Get all teachers
app.get('/api/teachers', async (req, res) => {
    try {
        const teachers = await Teacher.find({}, { password: 0 }); // Exclude password
        res.json({
            success: true,
            data: teachers
        });
    } catch (error) {
        console.error('Get teachers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
// ✅ Get all students
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find({}, { password: 0 }); // exclude password
    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ✅ Get student by ID
app.get('/api/student/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id, { password: 0 });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ✅ Get all teachers
app.get('/api/teachers', async (req, res) => {
  try {
    const teachers = await Teacher.find({}, { password: 0 });
    res.json({ success: true, data: teachers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ✅ Get teacher by ID
app.get('/api/teacher/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id, { password: 0 });
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }
    res.json({ success: true, data: teacher });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});
app.get('/api/student/email/:email', async (req, res) => {
  try {
    const student = await Student.findOne({ email: req.params.email }, { password: 0 });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Unified Login (Student/Teacher)
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

    res.status(200).json({
      success: true,
      message: `${role} logged in successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Login error' });
  }
});

// ✅ Health Check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is healthy' });
});

app.get('/api/login', async (req, res) => {
  try {
    const { email, password, role } = req.query;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Email, password, and role are required' });
    }

    let user;
    if (role === 'Student') {
      user = await Student.findOne({ email });
    } else if (role === 'Teacher') {
      user = await Teacher.findOne({ email });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: `${role} not found` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const { password: _, ...userData } = user._doc;

    res.status(200).json({
      success: true,
      message: `${role} logged in successfully`,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});


// START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
