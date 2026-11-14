import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Vulnerability reports reach Krizaka, never the upstream project (krizaka-internal#1904). The fork had kept Puck's SECURITY.md,
// which sent reports to the upstream maintainers.
const policy = readFileSync("SECURITY.md", "utf8");

test("the security policy never sends reports to the upstream project", () => {
  assert.doesNotMatch(policy, /puckeditor\.com|security@puck/i);
});

test("the security policy names Krizaka's private reporting channels", () => {
  assert.match(policy, /Report a vulnerability/);
  assert.match(policy, /krizaka\.com\/en\/contact/);
});

test("the security policy states the 7-day upstream cherry-pick", () => {
  assert.match(
    policy,
    /cherry-pick it into this\s+fork within 7 days of the advisory/
  );
});
