const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const userRepository = require('../repositories/userRepository');
const mailService = require('./mailService');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_this_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


class AuthService {

  async register(name, email, password) {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      const error = new Error('Email already registered');
      error.statusCode = 400;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userRepository.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      is_verified: false,
      is_google: false,
      mfa_enabled: true
    });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await userRepository.updateOtp(user.id, otpCode, otpExpiresAt);

    try {
      await mailService.sendOtpEmail(user.email, otpCode, user.name);
    } catch (mailErr) {
      console.warn(`⚠️ Failed to send verification email: ${mailErr.message}`);
    }

    const tempToken = jwt.sign({ id: user.id, isTempOtp: true }, JWT_SECRET, { expiresIn: '10m' });

    return {
      requireVerification: true,
      tempToken,
      email: user.email,
      message: 'Account created! Please verify your email with the 6-digit OTP code sent to your inbox.'
    };
  }

  async login(email, password) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Case 1: Google User trying Normal Login for the first time or setting password
    if (user.is_google) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await userRepository.updateOtp(user.id, otpCode, otpExpiresAt);
        try {
          await mailService.sendOtpEmail(user.email, otpCode, user.name);
        } catch (mailErr) {
          console.warn(`⚠️ Failed to send OTP email: ${mailErr.message}`);
        }
        const tempToken = jwt.sign({ id: user.id, isTempOtp: true, newPassword: password }, JWT_SECRET, { expiresIn: '10m' });
        return {
          requireVerification: true,
          tempToken,
          email: user.email,
          message: 'Google account detected. A 6-digit OTP has been sent to your email to verify and enable password sign-in.'
        };
      }
    } else {
      // Standard User: Verify Password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
      }
    }

    // Case 2: Unverified user (needs initial OTP verification)
    if (!user.is_verified) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await userRepository.updateOtp(user.id, otpCode, otpExpiresAt);
      try {
        await mailService.sendOtpEmail(user.email, otpCode, user.name);
      } catch (mailErr) {
        console.warn(`⚠️ Failed to send OTP email: ${mailErr.message}`);
      }
      const tempToken = jwt.sign({ id: user.id, isTempOtp: true }, JWT_SECRET, { expiresIn: '10m' });
      return {
        requireVerification: true,
        tempToken,
        email: user.email,
        message: 'Your email address is not verified yet. A 6-digit OTP code has been sent to your email.'
      };
    }

    // Case 3: Verified user with valid password -> DIRECT LOGIN!
    const token = this.generateToken(user.id);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      token
    };
  }

  async verifyOtp(tempToken, otpCode) {
    let decoded;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch (err) {
      const error = new Error('Verification session expired. Please log in again.');
      error.statusCode = 401;
      throw error;
    }

    if (!decoded.isTempOtp) {
      const error = new Error('Invalid verification session.');
      error.statusCode = 400;
      throw error;
    }

    const user = await userRepository.findById(decoded.id);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    if (!user.otp_code || user.otp_code !== otpCode.trim()) {
      const error = new Error('Invalid 6-digit OTP code. Please check your email.');
      error.statusCode = 400;
      throw error;
    }

    if (new Date() > new Date(user.otp_expires_at)) {
      const error = new Error('OTP code has expired. Please click Resend OTP.');
      error.statusCode = 400;
      throw error;
    }

    const updatePayload = {
      is_verified: true,
      otp_code: null,
      otp_expires_at: null
    };

    if (decoded.newPassword) {
      updatePayload.password = await bcrypt.hash(decoded.newPassword, 10);
    }

    const wasVerified = user.is_verified;
    await userRepository.update(user.id, updatePayload);

    if (!wasVerified) {
      try {
        await mailService.sendWelcomeEmail(user.email, user.name);
      } catch (welcomeErr) {
        console.warn(`⚠️ Failed to send Welcome email: ${welcomeErr.message}`);
      }
    }

    const token = this.generateToken(user.id);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      token
    };
  }

  async resendOtp(tempToken) {
    let decoded;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch (err) {
      const error = new Error('Verification session expired. Please log in again.');
      error.statusCode = 401;
      throw error;
    }

    const user = await userRepository.findById(decoded.id);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await userRepository.updateOtp(user.id, otpCode, otpExpiresAt);
    await mailService.sendOtpEmail(user.email, otpCode, user.name);

    return { success: true, message: 'A new 6-digit OTP code has been sent to your email.' };
  }

  async googleLogin(credential, fallbackName, fallbackEmail) {
    let name = fallbackName;
    let email = fallbackEmail;

    if (credential) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        email = payload.email;
        name = payload.name || payload.email.split('@')[0];
      } catch (err) {
        console.warn(`⚠️ Google ID Token verification warning: ${err.message}`);
      }
    }

    if (!email) {
      const error = new Error('Invalid Google account data');
      error.statusCode = 400;
      throw error;
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await userRepository.findByEmail(normalizedEmail);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
      user = await userRepository.create({
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        password: randomPassword,
        is_google: true,
        is_verified: true,
        mfa_enabled: false
      });
    } else {
      await userRepository.update(user.id, { is_google: true, is_verified: true });
    }

    if (isNewUser) {
      try {
        await mailService.sendWelcomeEmail(user.email, user.name);
      } catch (welcomeErr) {
        console.warn(`⚠️ Failed to send Welcome email: ${welcomeErr.message}`);
      }
    }

    const token = this.generateToken(user.id);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      token
    };
  }


  generateToken(userId) {
    return jwt.sign({ id: userId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (e) {
      const error = new Error('Invalid or expired token');
      error.statusCode = 401;
      throw error;
    }
  }
}

module.exports = new AuthService();

