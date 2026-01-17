// Using dynamic requires for more flexibility with file extensions
const Login = require('./LoginPage').default;
const Signup = require('./SignupPage').default;
const ForgotPassword = require('./ForgotPasswordPage').default;

// Export the components with standardized names
export const LoginPage = Login;
export const SignupPage = Signup;
export const ForgotPasswordPage = ForgotPassword;

// Also export as default for direct imports
export { Login, Signup, ForgotPassword }; 