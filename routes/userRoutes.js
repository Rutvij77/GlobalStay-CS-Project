const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware.js");
const userController = require("../controllers/userController.js");
const WebAppStrategy = require("ibmcloud-appid").WebAppStrategy;
const User = require("../models/user.js");
const { AUTH_CONTEXT } = WebAppStrategy;

// Signup
// router
//   .route("/signup")
//   .get(userController.renderSignUpForm) // Show signup form
//   .post(wrapAsync(userController.registerUser)); // Create new user

// // Login
// router
//   .route("/login")
//   .get(userController.renderLoginForm) // Show login form
//   .post(
//     saveRedirectUrl,
//     passport.authenticate("local", {
//       failureRedirect: "/login",
//       failureFlash: true,
//     }),
//     wrapAsync(userController.loginUser) // Authenticate & login user
//   );

// // Logout
// router.get("/logout", userController.logoutUser); // Logout user

// Route to trigger demo login
router.post("/login/demo", userController.demoLogin);

// Login → redirect user to App ID login page
router.get(
  "/login",
  passport.authenticate(WebAppStrategy.STRATEGY_NAME, {
    forceLogin: true,
  })
);

// App ID callback route
router.get("/auth/callback", (req, res, next) => {
  passport.authenticate(
    WebAppStrategy.STRATEGY_NAME,
    { keepSessionInfo: true },
    (err, user, info) => {
      // Handle Errors
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.redirect("/login");
      }

      // Manually Log In (triggers serializeUser in app.js)
      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }

        try {
          // Extract data from IBM User Object
          const appIdSub = user.sub || user.appIdSub;
          const email = user.email;
          const username = user.name;

          // Find or Create User in MongoDB
          let dbUserObj = await User.findOne({ appIdSub });

          if (!dbUserObj) {
            dbUserObj = new User({ appIdSub, email, username });
            await dbUserObj.save();
          }

          // Ensure req.user matches the Database User (internal ID)
          req.user = dbUserObj.data;

          // Redirect to original destination or default
          const redirectUrl = req.session.redirectUrl || "/listings";
          delete req.session.redirectUrl;
          return res.redirect(redirectUrl);
        } catch (dbError) {
          console.error("Error saving user:", dbError);
          req.flash("error", "Error saving user data.");
          return res.redirect("/listings");
        }
      });
    }
  )(req, res, next);
});

// Logout
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy();
    res.redirect("/listings");
  });
});

module.exports = router;
