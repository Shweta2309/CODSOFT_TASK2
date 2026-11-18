const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const jwt = require(`jsonwebtoken`);
const nodemailer = require('nodemailer');
require('dotenv').config();
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch(error => console.log('MongoDB connection error:', error.message));

// Resume storage folder
const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use('/uploads', express.static(uploadDir));
const authenticateToken = (req, res, next) => {
const authHeader = req.headers['authorization'];

const token = authHeader && authHeader.split(' ')[1];

if (!token) {
return res.status(401).json({
message: 'Access denied. Please login.'
});
}

jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
if (err) {
return res.status(403).json({
message: 'Invalid or expired token'
});
}

req.user = user;  
next();

});
};

const authorizeRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({
        message: 'Access denied. You do not have permission.'
      });
    }

    next();
  };
};

const Job = mongoose.model('Job', new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, required: true },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true }));
console.log('Job collection:',Job.collection.name);

// Application model
const Application = mongoose.model('Application', new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  name: { type: String, required: true },
  email: { type: String, required: true },
  resume: { type: String, required: true }
}, { timestamps: true }));

// Resume upload settings
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
 filename: (req, file, cb) => {
  const uniqueName = require('crypto').randomUUID();
  cb(null, uniqueName + '.pdf');
}
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' &&
        path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF resumes are allowed'));
    }
  }
});
// User Registration API
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: 'Please fill all required fields'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: 'Please enter a valid email address'
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'Email already registered'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const role = req.body.role;

if (!['candidate', 'employer'].includes(role)) {
  return res.status(400).json({
    message: 'Invalid user role'
  });
}

const user = await User.create({
  name: name.trim(),
  email: normalizedEmail,
  password: hashedPassword,
  role: role
});

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Email already registered'
      });
    }

    res.status(500).json({
      message: 'Registration failed'
    });
  }
});

// User Login API
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error.message);

    res.status(500).json({
      message: 'Login failed. Please try again.'
    });
  }
});

// Get all jobs
app.get('/api/jobs', async (req, res) => {
  try {
    res.json(await Job.find().sort({ createdAt: -1 }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Post a new job
app.post('/api/jobs', authenticateToken, authorizeRole('employer'), async (req, res) => {
  try {
    const { title, company, location, type } = req.body;

    const job = await Job.create({
      title,
      company,
      location,
      type,
      postedBy: req.user.id
    });

    res.status(201).json(job);
  } catch (error) {
    res.status(400).json({ message: 'Could not create job' });
  }
});

// Edit a job
app.put('/api/jobs/:id', authenticateToken, authorizeRole('employer'), async (req, res) => {
  try {
    const { title, company, location, type } = req.body;
    console.log('Job ID:', req.params.id);
console.log('Logged-in employer ID:', req.user.id);

console.log('Job ID:', req.params.id);
console.log('Employer ID:', req.user.id);

const existingJob = await Job.findById(req.params.id);
console.log('Raw MongoDB document:', await Job.collection.findOne({
  _id: new mongoose.Types.ObjectId(req.params.id)
}));
console.log('Job found:', existingJob);
console.log('Posted By:', existingJob?.postedBy);

    const job = await Job.findOneAndUpdate(
      {
        _id: req.params.id,
        postedBy: req.user.id
      },
      {
        title,
        company,
        location,
        type
      },
      { new: true, runValidators: true }
    );

    if (!job) {
      return res.status(404).json({
        message: 'Job not found or you are not authorized to edit it'
      });
    }

    res.json(job);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a job
app.delete('/api/jobs/:id', authenticateToken, authorizeRole('employer'), async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({
      _id: req.params.id,
      postedBy: req.user.id
    });

    if (!job) {
      return res.status(404).json({
        message: 'Job not found or you are not authorized to delete it'
      });
    }

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Apply for a job with resume
app.post('/api/applications', authenticateToken,authorizeRole('candidate'),
  upload.single('resume'),
  async (req, res) => {
    try {
      const { jobId } = req.body;

      const user = await User.findById(req.user.id);

      if (!user) {
        if (req.file) {
          fs.unlink(req.file.path, () => {});
        }

        return res.status(404).json({
          message: 'User not found'
        });
      }

      if (!mongoose.isValidObjectId(jobId)) {
        return res.status(400).json({
          message: 'Invalid job ID'
        });
      }

      const job = await Job.findById(jobId);

      if (!job) {
        return res.status(404).json({
          message: 'Job not found'
        });
      }

      const existingApplication = await Application.findOne({
  jobId: jobId,
  email: user.email
});

if (existingApplication) {
  if (req.file) {
    fs.unlink(req.file.path, () => {});
  }

  return res.status(409).json({
    message: 'You have already applied for this job'
  });
}

      if (!req.file) {
        return res.status(400).json({
          message: 'Resume is required'
        });
      }

      const application = await Application.create({
        jobId,
        name: user.name,
        email: user.email,
        resume: req.file.filename
      });

      try {
        await transporter.sendMail({
          from: `"JobFinder" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: 'Application Submitted Successfully',
          text: `Hello ${user.name},

Your application for ${job.title} at ${job.company} has been submitted successfully.

Thank you for using JobFinder!`
        });

        console.log('Confirmation email sent successfully!');
      } catch (emailError) {
        console.log('Email sending failed:', emailError.message);
      }

      res.status(201).json({
        message: 'Application submitted successfully!',
        application
      });

    } catch (error) {
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }

      res.status(400).json({
        message: error.message
      });
    }
  }
);
// Candidate Dashboard API
app.get('/api/candidate-applications', authenticateToken, authorizeRole('candidate'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }
    console.log('Logged-in candidate email:',user.email);
    const applications = await Application.find({
      email: user.email
    }).populate('jobId');

    console.log('Application found:',applications.length);

    res.json(applications);

  } catch (error) {
    res.status(500).json({
      message: 'Error fetching applications',
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
