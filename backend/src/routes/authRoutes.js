const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authValidator = require('../validators/authValidator');
const validate = require('../middleware/validatorMiddleware');

router.post('/register', authValidator.register, validate, authController.register);
router.post('/login', authValidator.login, validate, authController.login);
router.post('/verify-otp', authValidator.verifyOtp, validate, authController.verifyOtp);
router.post('/resend-otp', authValidator.resendOtp, validate, authController.resendOtp);
router.post('/google', authController.googleLogin);

module.exports = router;


