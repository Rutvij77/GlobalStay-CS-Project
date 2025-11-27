const User = require("../models/user.js");

// Render the user sign-up page
module.exports.renderSignUpForm = (req, res) => {
  res.render("users/signup.ejs", {
    showNavbar: false,
    showFooter: false,
    pageStyles: ["/css/auth.css"],
    pageScripts: ["/js/auth.js"],
  });
};

// Handle new user registration: validate passwords, create user, log them in
module.exports.registerUser = async (req, res) => {
  try {
    let { username, email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      req.flash("error", "Passwords do not match. Please try again.");
      return res.redirect("/signup");
    }

    const newUser = new User({ email, username });
    const registeredUser = await User.register(newUser, password);
    req.login(registeredUser, (err) => {
      if (err) {
        return next(err);
      }
      req.flash(
        "success",
        `Welcome to GlobalStay, ${username}! Your account has been created.`
      );
      return res.redirect("/listings");
    });
  } catch (err) {
    req.flash("error", err.message);
    return res.render("users/signup.ejs");
  }
};

// Render the user login page
module.exports.renderLoginForm = (req, res) => {
  res.render("users/login.ejs", {
    showNavbar: false,
    showFooter: false,
    pageStyles: ["/css/auth.css"],
    pageScripts: ["/js/auth.js"],
  });
};

// Handle user login (after successful passport authentication) and redirect
module.exports.loginUser = async (req, res) => {
  req.flash("success", "Welcome back! You have successfully logged in.");
  let redirectUrl = res.locals.redirectUrl || "/listings";
  res.redirect(redirectUrl);
};

// Handle user logout and redirect to listings page
module.exports.logoutUser = (req, res, next) => {
  req.logOut((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "You have been logged out. See you again soon!");
    res.redirect("/listings");
  });
};

// Logs in a demo user automatically
module.exports.demoLogin = async (req, res, next) => {
  try {
    const demoUsername = process.env.DEMO_USERNAME;

    if (!demoUsername) {
      throw new Error("DEMO_USERNAME is not defined in the .env file.");
    }

    const demoUserObj = await User.findOne({ username: demoUsername });

    if (!demoUserObj) {
      req.flash("error", "The demo user account is not configured correctly.");
      return res.redirect("/login");
    }

    req.login(demoUserObj.data, (err) => {
      if (err) {
        return next(err);
      }

      req.flash(
        "success",
        `Welcome back! You are now logged in as the demo user.`
      );
      res.redirect("/listings");
    });
  } catch (error) {
    console.error("Demo login error:", error);
    req.flash(
      "error",
      "Could not log in as demo user. Please try again later."
    );
    res.redirect("/login");
  }
};
