import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// The README and NOTICE say only what the package does today. Each planned feature is listed here with its ticket and the words
// that would claim it; the claim may appear in the « Planned » section only, with the ticket link.
const PLANNED = [
  { ticket: 1897, name: "French editor", claim: /French (editor|dictionary|words)|editor (in|words in) French/i },
  { ticket: 1905, name: "Krizaka tokens", claim: /Krizaka(['’]s)? tokens|@krizaka\/tokens/i },
  { ticket: 1905, name: "@krizaka/ui controls", claim: /@krizaka\/ui controls/i },
  { ticket: 1905, name: "accessibility", claim: /\baccessib/i },
  { ticket: 2261, name: "page contract", claim: /page contract/i },
];

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const readme = read("../README.md");
const notice = read("../NOTICE");
const pkg = JSON.parse(read("../packages/core/package.json"));

const PLANNED_HEADING = /^## Planned\s*$/m;
const NEXT_HEADING = /^## /m;

const splitPlanned = (text) => {
  const start = text.search(PLANNED_HEADING);
  assert.ok(start >= 0, "README has a « ## Planned » section");
  const after = text.slice(start).replace(PLANNED_HEADING, "");
  const end = after.search(NEXT_HEADING);
  const planned = end >= 0 ? after.slice(0, end) : after;
  return { planned, rest: text.slice(0, start) + (end >= 0 ? after.slice(end) : "") };
};

test("the README has a Today section and a Planned section", () => {
  assert.match(readme, /^## Today\s*$/m);
  splitPlanned(readme);
});

test("each planned feature links its ticket in the Planned section", () => {
  const { planned } = splitPlanned(readme);
  for (const { ticket, name } of PLANNED) {
    assert.ok(planned.includes(`/issues/${ticket})`), `Planned lists #${ticket} (${name}) with its link`);
  }
});

test("the README claims no planned feature outside the Planned section", () => {
  const { rest } = splitPlanned(readme);
  for (const { claim, name, ticket } of PLANNED) {
    assert.doesNotMatch(rest, claim, `README claims « ${name} » as done, it is planned (#${ticket})`);
  }
});

test("the NOTICE claims no planned feature", () => {
  for (const { claim, name, ticket } of PLANNED) {
    assert.doesNotMatch(notice, claim, `NOTICE claims « ${name} » as done, it is planned (#${ticket})`);
  }
});

test("the README gives the real package name and install command, not a future publication", () => {
  assert.doesNotMatch(readme, /to be published/i);
  assert.equal(pkg.name, "@krizaka/ui-builder");
  assert.ok(readme.includes(`npm install ${pkg.name}`), "README shows the install command");
});

test("the NOTICE credits Puck with its licence and the version the fork started from", () => {
  assert.match(notice, /Puck/);
  assert.match(notice, /MIT License/);
  assert.match(notice, /Puck 0\.24\.0/);
  assert.match(notice, /d14401c3a47947543e9de733ef1a20fb85140d52/);
});
