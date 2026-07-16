import assert from "node:assert/strict";
import test from "node:test";

import {
  detectSocialPlatform,
  normalizeSocialLink,
} from "./social-links";

test("detects a platform from a URL without a scheme", () => {
  assert.equal(detectSocialPlatform("instagram.com/studenthub"), "instagram");
});

test("detects a platform when a full URL is pasted", () => {
  assert.equal(
    detectSocialPlatform("https://www.linkedin.com/in/student-hub"),
    "linkedin",
  );
});

test("normalizes an HTTP profile URL to HTTPS", () => {
  assert.deepEqual(
    normalizeSocialLink({
      platform: "github",
      value: "http://github.com/studenthub",
    }),
    {
      success: true,
      data: {
        platform: "github",
        url: "https://github.com/studenthub",
      },
    },
  );
});

test("builds an Instagram URL from a username", () => {
  assert.deepEqual(
    normalizeSocialLink({ platform: "instagram", value: "student.hub" }),
    {
      success: true,
      data: {
        platform: "instagram",
        url: "https://www.instagram.com/student.hub",
      },
    },
  );
});

test("keeps the TikTok at-sign profile prefix for username input", () => {
  assert.deepEqual(
    normalizeSocialLink({ platform: "tiktok", value: "@studenthub" }),
    {
      success: true,
      data: {
        platform: "tiktok",
        url: "https://www.tiktok.com/@studenthub",
      },
    },
  );
});

test("keeps the YouTube at-sign profile prefix for handle input", () => {
  assert.deepEqual(
    normalizeSocialLink({ platform: "youtube", value: "/@studenthub" }),
    {
      success: true,
      data: {
        platform: "youtube",
        url: "https://www.youtube.com/@studenthub",
      },
    },
  );
});

test("does not duplicate LinkedIn's in path", () => {
  assert.deepEqual(
    normalizeSocialLink({ platform: "linkedin", value: "/in/student-hub" }),
    {
      success: true,
      data: {
        platform: "linkedin",
        url: "https://www.linkedin.com/in/student-hub",
      },
    },
  );
});

test("rejects a social hostname lookalike", () => {
  const result = normalizeSocialLink({
    platform: "instagram",
    value: "instagram.com.evil.test/studenthub",
  });

  assert.equal(result.success, false);
});

test("rejects URL credentials", () => {
  const result = normalizeSocialLink({
    platform: "website",
    value: "https://user:password@example.com/profile",
  });

  assert.equal(result.success, false);
});

test("rejects non-web protocols", () => {
  const result = normalizeSocialLink({
    platform: "website",
    value: "javascript:alert(1)",
  });

  assert.equal(result.success, false);
});

test("adds HTTPS to a website without a scheme", () => {
  assert.deepEqual(
    normalizeSocialLink({
      platform: "website",
      value: "example.com/profile",
    }),
    {
      success: true,
      data: {
        platform: "website",
        url: "https://example.com/profile",
      },
    },
  );
});
