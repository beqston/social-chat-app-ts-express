import { body } from "express-validator"

const userValidation = [
    body("username").trim().notEmpty().withMessage("Username Is Required!").isLength({min:3, max:42}).withMessage("Username must be between 3 and 42 characters").escape().isString().toLowerCase(),
    body("email").trim().notEmpty().withMessage("Email Is Required!").isEmail().withMessage("Invalid email format").normalizeEmail({gmail_remove_dots:false}).customSanitizer(email=>email.toLowerCase()).isLength({max:100}).withMessage("Email is too long"),
    body("password").trim().notEmpty().withMessage("Password is required").isLength({min:8, max:40}).withMessage("Password must be between 3 and 42 characters").matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter').matches(/[0-9]/).withMessage('Password must contain at least one number')
];

export const passwordRules = [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .isLength({min:8, max:40}).withMessage("Password must be between 3 and 42 characters"),

  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

export default userValidation;