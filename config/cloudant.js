const { CloudantV1 } = require("@ibm-cloud/cloudant");
const { IamAuthenticator } = require("ibm-cloud-sdk-core");

// Load environment variables
require("dotenv").config();

// 1. Authenticate
const authenticator = new IamAuthenticator({
  apikey: process.env.CLOUDANT_API_KEY,
});

// 2. Connect to Service
const service = new CloudantV1({
  authenticator: authenticator,
});

service.setServiceUrl(process.env.CLOUDANT_URL);

console.log("Connected to IBM Cloudant...");

module.exports = service;
