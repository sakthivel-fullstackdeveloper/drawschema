const authService = require('../services/authService');

class AuthController {
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      const { user, token } = await authService.register(name, email, password);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { user, token }
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      res.status(200).json({
        success: true,
        message: result.message || 'Login successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(req, res, next) {
    try {
      const { tempToken, otpCode } = req.body;
      const result = await authService.verifyOtp(tempToken, otpCode);

      res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async resendOtp(req, res, next) {
    try {
      const { tempToken } = req.body;
      const result = await authService.resendOtp(tempToken);

      res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async googleLogin(req, res, next) {
    try {
      const { credential, name, email } = req.body;
      const result = await authService.googleLogin(credential, name, email);

      res.status(200).json({
        success: true,
        message: 'Google login successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();


