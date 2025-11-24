// Load environment variables from .env file in development mode
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// Import dependencies
const express = require("express");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const WebAppStrategy = require("ibmcloud-appid").WebAppStrategy;
const User = require("./models/user.js");
const { setUserLocals } = require("./middleware");

// Import route files
const listingRouter = require("./routes/listingRoutes.js");
const reviewRouter = require("./routes/reviewRoutes.js");
const userRouter = require("./routes/userRoutes.js");
const bookingRouter = require("./routes/bookingRoutes.js");

const app = express();

// Set EJS as view engine and configure views folder
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

// Middlewares
app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(methodOverride("_method")); // Support PUT & DELETE from forms
app.use(express.static(path.join(__dirname, "public"))); // Serve static files

const sessionOptions = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 week
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
};

app.use(session(sessionOptions));
app.use(flash());

// Passport.js authentication setup
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new WebAppStrategy({
    tenantId: process.env.TENANT_ID,
    clientId: process.env.CLIENT_ID,
    secret: process.env.SECRET,
    oauthServerUrl: process.env.OAUTH_SERVER_URL,
    redirectUri: process.env.REDIRECT_URI,
  })
);

// Serialize: store only unique ID in session
passport.serializeUser((user, cb) => {
  cb(null, user.sub || user.appIdSub);
});

// Deserialize: find user based on stored ID
passport.deserializeUser(async (id, cb) => {
  try {
    const user = await User.findOne({ appIdSub: id });
    cb(null, user);
  } catch (err) {
    cb(err, null);
  }
});

// Add locals (currUser + hasListings)
app.use(setUserLocals);

// Flash messages + current user in all views
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

//Routes
//Listings Route
app.use("/listings", listingRouter);
//Reviews Route
app.use("/listings/:id/reviews", reviewRouter);
//User Route
app.use("/", userRouter);
//Booking Route
app.use("/listings/:id/bookings", bookingRouter);

// Handle 404 errors
app.all(/.*/, (req, res, next) => {
  next(new ExpressError(404, "Page not found!"));
});

// Centralized error handler
app.use((err, req, res, next) => {
  const { statusCode = 500, message = "Something went wrong!" } = err;
  res.status(statusCode).render("error.ejs", { message });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
