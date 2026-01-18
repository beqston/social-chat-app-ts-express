import { body } from "express-validator"

const userValidation = [
    body("username").trim().notEmpty().withMessage("Username Is Required!").isLength({min:3, max:42}).withMessage("Username must be between 3 and 42 characters").escape().isString().toLowerCase(),
    body("email").trim().notEmpty().withMessage("Email Is Required!").isEmail().withMessage("Invalid email format").normalizeEmail({gmail_remove_dots:false}).customSanitizer(email=>email.toLowerCase()).isLength({max:100}).withMessage("Email is too long"),
    body("password").trim().notEmpty().withMessage("Password is required").isLength({min:8, max:40}).withMessage("Password must be between 3 and 42 characters")
]

export default userValidation;