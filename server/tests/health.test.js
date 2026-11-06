// STEP 1: Basic test (Jest + Supertest)
// NOTE: We test only /health route (no DB needed)

const request = require("supertest");
const app = require("../src/app");

describe("GET /health", () => {
  it("should return ok true", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

