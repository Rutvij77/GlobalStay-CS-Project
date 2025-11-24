// Custom error class for Express apps
// Lets you throw errors with a status code and message
class ExpressError extends Error {
  constructor(statusCode, message) {
    super(); // call parent Error constructor
    this.statusCode = statusCode;
    this.message = message;
  }
}

module.exports = ExpressError;
