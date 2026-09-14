import http from "node:http";

const port = Number.parseInt(process.env.PORT || "3000", 10);
const request = http.get(
  {
    hostname: "127.0.0.1",
    port,
    path: "/api/health",
    timeout: 4_000,
  },
  (response) => {
    response.resume();
    process.exit(response.statusCode === 200 ? 0 : 1);
  },
);

request.on("timeout", () => request.destroy());
request.on("error", () => process.exit(1));
