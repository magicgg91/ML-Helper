import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
describe("foundation", () => {
  it("runs unit tests", () => {
    expect(true).toBe(true);
  });
});

describe("Docker healthcheck", () => {
  it("uses the Node runtime and the internal application port", () => {
    const compose = readFileSync("docker-compose.yml", "utf8");
    const dockerfile = readFileSync("Dockerfile", "utf8");
    const healthcheck = readFileSync("docker-healthcheck.mjs", "utf8");

    expect(compose).toContain('["CMD", "node", "/app/docker-healthcheck.mjs"]');
    expect(compose).toContain("start_period: 60s");
    expect(compose).not.toMatch(/wget|curl/);
    expect(dockerfile).toContain(
      "docker-healthcheck.mjs ./docker-healthcheck.mjs",
    );
    expect(healthcheck).toContain('process.env.PORT || "3000"');
    expect(healthcheck).toContain('path: "/api/health"');
  });
});
