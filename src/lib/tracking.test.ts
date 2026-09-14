import { describe, expect, it } from "vitest";
import {
  parseTrackingScriptUrl,
  parseTrackingWebsiteId,
  trackingConnectOrigin,
} from "./tracking";

// Bloc 100/A: the value an admin types ends up as a <script src> on every page
// of the site, public and admin — so what it accepts is a security boundary,
// not just input polish.
describe("tracking script URL", () => {
  it.each([
    "https://stats.example.com/script.js",
    // A self-hosted tracker on a private network is a legitimate http target.
    "http://192.168.1.10:3000/script.js",
  ])("accepts %s", (url) => expect(parseTrackingScriptUrl(url)).toBe(url));

  it("trims what the admin pasted", () =>
    expect(parseTrackingScriptUrl("  https://stats.example.com/s.js  ")).toBe(
      "https://stats.example.com/s.js",
    ));

  it.each([
    ["an empty field, which is how tracking is turned off", ""],
    ["a field of spaces", "   "],
    ["nothing stored at all", null],
  ])("reads %s as no tracking", (_, value) =>
    expect(parseTrackingScriptUrl(value)).toBeNull(),
  );

  it.each([
    ["a typo that is not a URL", "stats.example.com/script.js"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a data: URL", "data:text/javascript,alert(1)"],
    ["a URL carrying credentials", "https://user:pass@stats.example.com/s.js"],
  ])("refuses %s", (_, value) =>
    expect(parseTrackingScriptUrl(value)).toBeNull(),
  );
});

// Bloc 101: the identifier the script tag carries next to its src. React
// escapes attribute values, so nothing here can inject markup — what this
// refuses is a value that is not an identifier at all, which means the admin
// pasted something else and would otherwise only find out from the tracker.
describe("tracking site identifier", () => {
  it.each([
    [
      "a UUID, which is what Umami gives",
      "25931871-50b0-4123-a327-09f9c60cff18",
    ],
    ["a short opaque key", "abc_123.XY"],
  ])("accepts %s", (_, value) =>
    expect(parseTrackingWebsiteId(value)).toBe(value),
  );

  it("trims what the admin pasted", () =>
    expect(parseTrackingWebsiteId("  abc-123  ")).toBe("abc-123"));

  it.each([
    ["an empty field — plenty of trackers need no identifier", ""],
    ["a field of spaces", "   "],
    ["nothing stored at all", null],
  ])("reads %s as no identifier", (_, value) =>
    expect(parseTrackingWebsiteId(value)).toBeNull(),
  );

  it.each([
    ["a double quote", 'abc" data-evil="1'],
    ["a single quote", "abc' onload='x"],
    ["an angle bracket", "abc<script>"],
    ["a backtick", "abc`x`"],
    ["an inner space, so a whole pasted tag is caught", "abc def"],
    ["a newline", "abc\nx"],
  ])("refuses %s", (_, value) =>
    expect(parseTrackingWebsiteId(value)).toBeNull(),
  );

  it("refuses an absurdly long value", () =>
    expect(parseTrackingWebsiteId("a".repeat(201))).toBeNull());
});

// Bloc 100/B: the nonce lets the script LOAD; connect-src decides where it may
// send what it measures. This is the origin named there.
describe("tracking origin for connect-src", () => {
  it("keeps the origin alone, dropping path, query and fragment", () =>
    expect(
      trackingConnectOrigin("https://stats.example.com/script.js?id=1#x"),
    ).toBe("https://stats.example.com"));

  it("keeps a non-default port, which is part of the origin", () =>
    expect(trackingConnectOrigin("http://192.168.1.10:3000")).toBe(
      "http://192.168.1.10:3000",
    ));

  it.each([
    ["unset", undefined],
    ["empty", ""],
    ["not a URL", "stats.example.com"],
    ["a non-http scheme", "ftp://stats.example.com"],
  ])("yields nothing when %s, leaving the policy untouched", (_, value) =>
    expect(trackingConnectOrigin(value)).toBeNull(),
  );

  it("cannot inject extra directives into the policy", () => {
    // Passing the value through URL is what makes this structural: whatever
    // an operator puts in the variable, only a scheme/host/port comes out.
    expect(
      trackingConnectOrigin("https://evil.example.com; script-src *"),
    ).toBeNull();
    expect(
      trackingConnectOrigin("https://evil.example.com/a; script-src *"),
    ).toBe("https://evil.example.com");
  });
});
