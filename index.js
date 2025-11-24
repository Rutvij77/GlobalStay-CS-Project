// Load environment variables from .env file in development mode
if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

// Import dependencies
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const { setUserLocals } = require("./middleware");

// Import route files
const listingRouter = require("./routes/listingRoutes.js");
const reviewRouter = require("./routes/reviewRoutes.js");
const userRouter = require("./routes/userRoutes.js");
const bookingRouter = require("./routes/bookingRoutes.js");

const app = express();

// Connect to MongoDB
const MONGO_URL = "mongodb://127.0.0.1:27017/globestay";

main()
  .then(() => {
    console.log("Connected to DB.");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

// Set EJS as view engine and configure views folder
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

// Middlewares
app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(methodOverride("_method")); // Support PUT & DELETE from forms
app.use(express.static(path.join(__dirname, "public"))); // Serve static files

// Session setup
const store = MongoStore.create({
  mongoUrl: MONGO_URL,
  crypto: {
    secret: process.env.SESSION_SECRET,
  },
  touchAfter: 24 * 3600, // 1day
});

app.set("trust proxy", 1);

const sessionOptions = {
  store,
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
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Enable custom middleware to make currUser + hasListings
// available in all EJS templates
app.use(setUserLocals);

// Flash messages + current user available in all views
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
  let { statusCode = 500, message = "Something went wrong!" } = err;
  res.status(statusCode).render("error.ejs", { message });
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
