// testDashboard.js
const axios = require("axios");

const BASE_URL = "http://localhost:5000/api/dashboard";

// If you need authentication for some endpoints, put your JWT here
const TOKEN = "YOUR_JWT_TOKEN_HERE";

const headers = TOKEN
  ? { Authorization: `Bearer ${TOKEN}` }
  : {};

async function testEndpoints() {
  const endpoints = [
    { method: "get", url: "/kpis" },
    { method: "get", url: "/performance" },
    { method: "get", url: "/sla-status" },
    { method: "get", url: "/alerts" },
    { method: "get", url: "/charts" },
    { method: "get", url: "/overview" },
    { method: "get", url: "/alerts-summary" },
    { method: "get", url: "/sync-status" },
    { method: "get", url: "/sync-logs" },
    { method: "get", url: "/export" },
    { method: "post", url: "/sync" },
    { method: "get", url: "/advanced-kpis" },
    { method: "get", url: "/departments" },
    { method: "post", url: "/feedback", data: { message: "Test feedback", page: "dashboard" } },
    { method: "get", url: "/test" },
  ];

  for (const ep of endpoints) {
    try {
      const res = await axios({
        method: ep.method,
        url: BASE_URL + ep.url,
        headers,
        data: ep.data || undefined,
      });

      console.log(`✅ [${ep.method.toUpperCase()}] ${ep.url}`);
      console.log("Response:", res.data);
    } catch (err) {
      console.error(`❌ [${ep.method.toUpperCase()}] ${ep.url}`);
      if (err.response) {
        console.error("Status:", err.response.status);
        console.error("Response:", err.response.data);
      } else {
        console.error("Error:", err.message);
      }
    }
    console.log("----------------------------------------------------");
  }
}

testEndpoints();
