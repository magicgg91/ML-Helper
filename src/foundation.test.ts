import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
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
    expect(dockerfile).toContain("ENV HOSTNAME=0.0.0.0");
    expect(healthcheck).toContain('process.env.PORT || "3000"');
    expect(healthcheck).toContain('path: "/api/health"');
  });
});

// Bloc 97: the "Verify Docker Compose health" job failed on the first push to
// main since that step was written (CI run 34835198084). It never set
// ML_HELPER_IMAGE, so compose used its own :dev default while the job had
// built and loaded :latest — "No such image: ghcr.io/magicgg91/ml-helper:dev",
// in under a second, before any container existed. Two files each spelled the
// tag out on their own, and only the main branch made them disagree.
describe("CI image tag", () => {
  const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
  const compose = readFileSync("docker-compose.yml", "utf8");

  it("hands Docker Compose the very image the job just built", () => {
    // The name is the link between the two files: compose reads this variable,
    // so the workflow has to be what sets it.
    expect(compose).toContain("${ML_HELPER_IMAGE:-");
    expect(workflow).toMatch(/^\s+ML_HELPER_IMAGE: /m);
  });

  it("spells the registry tag exactly once, so no step can drift", () => {
    // Every other reference goes through ML_HELPER_IMAGE. A second literal is
    // how the branch-dependent tag came apart in the first place. Comment
    // lines don't count — the one above quotes the tag on purpose.
    const effective = workflow
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("#"))
      .join("\n");
    const literals = effective.match(/ghcr\.io\/magicgg91\/ml-helper:/g) ?? [];
    expect(literals).toHaveLength(1);
  });
});
