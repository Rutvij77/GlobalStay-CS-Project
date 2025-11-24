// Wrapper to handle async errors in routes and pass them to Express error handler
module.exports = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
