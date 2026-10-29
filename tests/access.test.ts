import test from "node:test";
import assert from "node:assert/strict";
import { assertAdminUser, assertSameOrigin, boundedBody } from "../lib/access";
test("only the configured admin identity is authorized", () => {
  assert.throws(() => assertAdminUser(null, "owner@example.com"), {
    status: 401,
  });
  assert.throws(
    () =>
      assertAdminUser({ email: "stranger@example.com" }, "owner@example.com"),
    { status: 403 },
  );
  assert.throws(
    () => assertAdminUser({ email: "owner@example.com" }, undefined),
    { status: 403 },
  );
  assert.doesNotThrow(() =>
    assertAdminUser({ email: "Owner@example.com" }, "owner@example.com"),
  );
});
test("mutation origins must match, including missing and opaque origins", () => {
  for (const origin of [
    undefined,
    "null",
    "https://attacker.example",
    "https://blog.example.attacker.com",
  ]) {
    assert.throws(
      () =>
        assertSameOrigin(
          new Request("https://blog.example/api/admin/posts", {
            method: "POST",
            headers: origin ? { origin } : {},
          }),
        ),
      { status: 403 },
    );
  }
  assert.doesNotThrow(() =>
    assertSameOrigin(
      new Request("https://blog.example/api/admin/posts", {
        method: "POST",
        headers: { origin: "https://blog.example" },
      }),
    ),
  );
});
test("body limits apply even without content-length", async () => {
  const request = new Request("https://blog.example", {
    method: "POST",
    body: "more than ten bytes",
  });
  await assert.rejects(boundedBody(request, 10), { status: 413 });
  assert.equal(
    new TextDecoder().decode(
      await boundedBody(
        new Request("https://blog.example", { method: "POST", body: "ok" }),
        10,
      ),
    ),
    "ok",
  );
});

test("canonical configured origin handles internal reverse-proxy URLs without trusting Host", () => {
  const request = new Request("http://internal-server:3000/api/admin/posts", {
    method: "POST",
    headers: { origin: "https://blog.example" },
  });
  assert.doesNotThrow(() => assertSameOrigin(request, "https://blog.example"));
  assert.throws(
    () =>
      assertSameOrigin(
        new Request(request.url, {
          method: "POST",
          headers: { origin: "https://attacker.example" },
        }),
        "https://blog.example",
      ),
    { status: 403 },
  );
});

test("opaque configured origins cannot authorize a null Origin", () => {
  assert.throws(
    () =>
      assertSameOrigin(
        new Request("http://localhost/api", {
          method: "POST",
          headers: { origin: "null" },
        }),
        "javascript:alert(1)",
      ),
    { status: 503 },
  );
});
