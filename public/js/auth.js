// Class responsible for handling authentication-related validations (signup/login)
class AuthValidator {
  constructor() {
    this.init();
  }

  // Initialize validator by setting up password toggle, validation, and event bindings
  init() {
    this.setupPasswordToggle();
    this.setupValidation();
    this.bindEvents();
  }

  // Setup password visibility toggle for password and confirm password fields
  setupPasswordToggle() {
    const toggles = [
      { button: "togglePassword", field: "password" },
      { button: "toggleConfirmPassword", field: "confirmPassword" },
    ];

    toggles.forEach(({ button, field }) => {
      const toggleButton = document.getElementById(button);
      const passwordField = document.getElementById(field);

      if (toggleButton && passwordField) {
        toggleButton.addEventListener("click", () => {
          if (passwordField.type === "password") {
            passwordField.type = "text";
            toggleButton.classList.remove("fa-eye");
            toggleButton.classList.add("fa-eye-slash");
          } else {
            passwordField.type = "password";
            toggleButton.classList.remove("fa-eye-slash");
            toggleButton.classList.add("fa-eye");
          }
        });
      }
    });
  }

  // Show error message and apply invalid styles for an input
  showError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorElement = document.getElementById(inputId + "Error");
    const successElement = document.getElementById(inputId + "Success");

    if (input && errorElement) {
      input.classList.add("is-invalid");
      input.classList.remove("is-valid");
      errorElement.textContent = message;
      errorElement.classList.add("show");
      if (successElement) successElement.classList.remove("show");
    }
    return false;
  }

  // Show success state and apply valid styles for an input
  showSuccess(inputId, message = "") {
    const input = document.getElementById(inputId);
    const errorElement = document.getElementById(inputId + "Error");
    const successElement = document.getElementById(inputId + "Success");

    if (input) {
      input.classList.add("is-valid");
      input.classList.remove("is-invalid");
      if (errorElement) errorElement.classList.remove("show");
      if (successElement && message) {
        successElement.textContent = message;
        successElement.classList.add("show");
      }
    }
    return true;
  }

  // Clear validation states (error/success) for an input
  clearValidation(inputId) {
    const input = document.getElementById(inputId);
    const errorElement = document.getElementById(inputId + "Error");
    const successElement = document.getElementById(inputId + "Success");

    if (input) {
      input.classList.remove("is-valid", "is-invalid");
      if (errorElement) errorElement.classList.remove("show");
      if (successElement) successElement.classList.remove("show");
    }
  }

  // Validate if a required input is filled
  validateRequired(inputId, fieldName) {
    const input = document.getElementById(inputId);
    if (!input) return false;

    const value = input.value.trim();
    if (!value) {
      return this.showError(inputId, `${fieldName} is required`);
    }
    return this.showSuccess(inputId);
  }

  // Validate email format and display corresponding messages
  validateEmail(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return false;

    const email = input.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      return this.showError(inputId, "Email is required");
    }

    if (!emailRegex.test(email)) {
      return this.showError(inputId, "Please enter a valid email address");
    }

    return this.showSuccess(inputId, "Email format is valid");
  }

  // Validate username for length, characters, and allowed format
  validateUsername(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return false;

    const username = input.value.trim();

    if (!username) {
      return this.showError(inputId, "Username is required");
    }

    if (username.length < 3) {
      return this.showError(inputId, "Username must be at least 3 characters");
    }

    if (username.length > 20) {
      return this.showError(
        inputId,
        "Username must be less than 20 characters"
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return this.showError(
        inputId,
        "Username can only contain letters, numbers, and underscores"
      );
    }

    return this.showSuccess(inputId, "Username looks good!");
  }

  // Validate password strength based on multiple criteria
  validatePassword(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return false;

    const password = input.value;

    if (!password) {
      return this.showError(inputId, "Password is required");
    }

    const validation = this.getPasswordValidation(password);

    if (!validation.isValid) {
      const requirements = [];
      if (!validation.minLength) requirements.push("8+ characters");
      if (!validation.hasUppercase) requirements.push("1 uppercase letter");
      if (!validation.hasLowercase) requirements.push("1 lowercase letter");
      if (!validation.hasNumber) requirements.push("1 number");
      if (!validation.hasSpecialChar) requirements.push("1 special character");

      return this.showError(
        inputId,
        `Password must contain: ${requirements.join(", ")}`
      );
    }

    return this.showSuccess(inputId, "Strong password!");
  }

  // Validate if confirm password matches the original password
  validateConfirmPassword(
    passwordId = "password",
    confirmId = "confirmPassword"
  ) {
    const passwordInput = document.getElementById(passwordId);
    const confirmInput = document.getElementById(confirmId);

    if (!passwordInput || !confirmInput) return false;

    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;

    if (!confirmPassword) {
      return this.showError(confirmId, "Please confirm your password");
    }

    if (password !== confirmPassword) {
      return this.showError(confirmId, "Passwords do not match");
    }

    return this.showSuccess(confirmId, "Passwords match!");
  }

  // Check password against strength rules and return validation details
  getPasswordValidation(password) {
    const minLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
      password
    );
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);

    return {
      isValid:
        minLength &&
        hasNumber &&
        hasSpecialChar &&
        hasUppercase &&
        hasLowercase,
      minLength,
      hasNumber,
      hasSpecialChar,
      hasUppercase,
      hasLowercase,
    };
  }

  // Calculate password strength score (0–5) based on validation rules
  getPasswordStrength(password) {
    let strength = 0;
    const validation = this.getPasswordValidation(password);

    if (validation.minLength) strength++;
    if (validation.hasUppercase) strength++;
    if (validation.hasLowercase) strength++;
    if (validation.hasNumber) strength++;
    if (validation.hasSpecialChar) strength++;

    return strength;
  }

  // Update password strength bar and requirement indicators dynamically
  updatePasswordStrength(password) {
    const strengthBar = document.getElementById("passwordStrengthBar");
    const requirements = document.querySelectorAll(".requirement");

    if (strengthBar) {
      const strength = this.getPasswordStrength(password);

      strengthBar.classList.remove(
        "strength-weak",
        "strength-fair",
        "strength-medium",
        "strength-good",
        "strength-strong"
      );

      if (password.length > 0) {
        switch (strength) {
          case 0:
            break;
          case 1:
            strengthBar.classList.add("strength-weak"); // Red - 20%
            break;
          case 2:
            strengthBar.classList.add("strength-fair"); // Orange - 40%
            break;
          case 3:
            strengthBar.classList.add("strength-medium"); // Yellow - 60%
            break;
          case 4:
            strengthBar.classList.add("strength-good"); // Light Green - 80%
            break;
          case 5:
            strengthBar.classList.add("strength-strong"); // Green - 100%
            break;
        }
      }
    }

    if (requirements.length > 0) {
      const validation = this.getPasswordValidation(password);

      requirements.forEach((req) => {
        const id = req.id;
        req.classList.remove("met");

        if (id === "lengthReq" && validation.minLength) {
          req.classList.add("met");
        } else if (id === "uppercaseReq" && validation.hasUppercase) {
          req.classList.add("met");
        } else if (id === "lowercaseReq" && validation.hasLowercase) {
          req.classList.add("met");
        } else if (id === "numberReq" && validation.hasNumber) {
          req.classList.add("met");
        } else if (id === "specialReq" && validation.hasSpecialChar) {
          req.classList.add("met");
        }
      });
    }
  }

  // Decide which validation setup to run based on login or signup page
  setupValidation() {
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    if (loginForm) {
      this.setupLoginValidation();
    }

    if (signupForm) {
      this.setupSignupValidation();
    }
  }

  // Setup validation logic for login form fields
  setupLoginValidation() {
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    if (usernameInput) {
      usernameInput.addEventListener("input", () => {
        if (usernameInput.value.trim()) {
          this.clearValidation("username");
        }
      });

      usernameInput.addEventListener("blur", () => {
        this.validateRequired("username", "Username");
      });
    }

    if (passwordInput) {
      passwordInput.addEventListener("input", () => {
        if (passwordInput.value.trim()) {
          this.clearValidation("password");
        }
      });

      passwordInput.addEventListener("blur", () => {
        this.validateRequired("password", "Password");
      });
    }
  }

  // Setup validation logic for signup form fields
  setupSignupValidation() {
    const usernameInput = document.getElementById("username");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");

    if (usernameInput) {
      usernameInput.addEventListener("input", () => {
        if (usernameInput.value.trim()) {
          this.clearValidation("username");
        }
      });

      usernameInput.addEventListener("blur", () => {
        this.validateUsername("username");
      });
    }

    if (emailInput) {
      emailInput.addEventListener("input", () => {
        if (emailInput.value.trim()) {
          this.clearValidation("email");
        }
      });

      emailInput.addEventListener("blur", () => {
        this.validateEmail("email");
      });
    }

    if (passwordInput) {
      passwordInput.addEventListener("input", () => {
        const password = passwordInput.value;
        this.updatePasswordStrength(password);

        if (password.trim()) {
          this.clearValidation("password");
        }

        if (confirmPasswordInput && confirmPasswordInput.value) {
          this.validateConfirmPassword();
        }
      });

      passwordInput.addEventListener("blur", () => {
        this.validatePassword("password");
      });
    }

    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener("input", () => {
        if (
          confirmPasswordInput.value &&
          passwordInput &&
          passwordInput.value
        ) {
          this.validateConfirmPassword();
        }
      });

      confirmPasswordInput.addEventListener("blur", () => {
        this.validateConfirmPassword();
      });
    }
  }

  // Validate login form fields before submission
  validateLoginForm() {
    let isValid = true;

    if (!this.validateRequired("username", "Username")) {
      isValid = false;
    }

    if (!this.validateRequired("password", "Password")) {
      isValid = false;
    }

    return isValid;
  }

  // Validate signup form fields before submission
  validateSignupForm() {
    let isValid = true;

    if (!this.validateUsername("username")) {
      isValid = false;
    }

    if (!this.validateEmail("email")) {
      isValid = false;
    }

    if (!this.validatePassword("password")) {
      isValid = false;
    }

    if (!this.validateConfirmPassword()) {
      isValid = false;
    }

    return isValid;
  }

  // Bind event listeners for login, signup forms, and input clearing on page load
  bindEvents() {
    // Login form submission
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();

        if (this.validateLoginForm()) {
          console.log("Login form is valid and ready for submission");
          loginForm.submit();
        }
      });
    }

    // Signup form submission
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
      signupForm.addEventListener("submit", (e) => {
        e.preventDefault();

        if (this.validateSignupForm()) {
          console.log("Signup form is valid and ready for submission");
          signupForm.submit();
        }
      });
    }

    // Clear validation on page load
    document.addEventListener("DOMContentLoaded", () => {
      const inputs = document.querySelectorAll(".form-control");
      inputs.forEach((input) => {
        this.clearValidation(input.id);
      });
    });
  }
}

// Utility helper object for common authentication-related UI actions
const AuthUtils = {
  // Show loading state on button
  showButtonLoading(buttonSelector, loadingText = "Loading...") {
    const button = document.querySelector(buttonSelector);
    if (button) {
      button.dataset.originalText = button.innerHTML;
      button.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>${loadingText}`;
      button.disabled = true;
    }
  },

  // Hide loading state on button
  hideButtonLoading(buttonSelector) {
    const button = document.querySelector(buttonSelector);
    if (button && button.dataset.originalText) {
      button.innerHTML = button.dataset.originalText;
      button.disabled = false;
      delete button.dataset.originalText;
    }
  },

  // Clear all fields and reset validation states in a form
  clearForm(formSelector) {
    const form = document.querySelector(formSelector);
    if (form) {
      const inputs = form.querySelectorAll("input");
      const validator = new AuthValidator();

      inputs.forEach((input) => {
        input.value = "";
        validator.clearValidation(input.id);
      });

      // Reset password strength bar
      const strengthBar = document.getElementById("passwordStrengthBar");
      if (strengthBar) {
        strengthBar.className = "password-strength-bar";
      }

      // Reset requirement indicators
      const requirements = document.querySelectorAll(".requirement");
      requirements.forEach((req) => {
        req.classList.remove("met");
      });
    }
  },

  // Focus the first input field that has a validation error
  focusFirstError() {
    const firstError = document.querySelector(".form-control.is-invalid");
    if (firstError) {
      firstError.focus();
    }
  },
};

// Initialize the authentication validator once the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  new AuthValidator();
});

// Export classes/utilities for external usage (Node.js/CommonJS compatibility)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { AuthValidator, AuthUtils };
}
