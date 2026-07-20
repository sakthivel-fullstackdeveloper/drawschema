const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const schemaRoutes = require('./routes/schemaRoutes');
const versionRoutes = require('./routes/versionRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

// Standard middlewares
app.use(helmet());
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', schemaRoutes);
app.use('/api', versionRoutes);

// Base route for health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend is healthy',
    data: { timestamp: new Date() }
  });
});

// Centralized error handling
app.use(errorMiddleware);

module.exports = app;
