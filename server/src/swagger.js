// STEP 1: swagger libraries
const swaggerJSDoc = require("swagger-jsdoc");

// STEP 2: swagger config (very simple)
function createSwaggerSpec() {
  const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Flight Booking API",
        version: "1.0.0",
        description: "Simple MERN training backend with auth, flights, bookings, payments."
      },
      servers: [{ url: "http://localhost:5000" }]
    },
    // NOTE: we keep docs inside routes.js comments (easy for learning)
    apis: ["./src/routes.js"]
  };

  return swaggerJSDoc(options);
}

module.exports = { createSwaggerSpec };

