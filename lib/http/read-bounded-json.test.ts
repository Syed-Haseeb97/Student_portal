import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_IMPORT_BODY_BYTES, readBoundedJson } from "./read-bounded-json";

function request(body: string, contentLength?: string) {
  return new Request("http://localhost/import", {
    method: "POST",
    headers: contentLength === undefined ? {} : { "content-length": contentLength },
    body,
  });
}

test("accepts valid JSON up to the byte limit", async () => {
  const json = JSON.stringify({ ok: true });
  const withinLimit = json + " ".repeat(MAX_IMPORT_BODY_BYTES - Buffer.byteLength(json));
  assert.equal(Buffer.byteLength(withinLimit), MAX_IMPORT_BODY_BYTES);
  assert.deepEqual(await readBoundedJson(request(withinLimit)), { ok: true, value: { ok: true } });
});

test("rejects an oversized body when Content-Length is missing", async () => {
  const body = " ".repeat(MAX_IMPORT_BODY_BYTES + 1);
  const req = request(body);
  assert.equal(req.headers.has("content-length"), false);
  assert.deepEqual(await readBoundedJson(req), { ok: false, reason: "too_large" });
});

test("rejects an oversized body when Content-Length understates its size", async () => {
  const body = " ".repeat(MAX_IMPORT_BODY_BYTES + 1);
  assert.deepEqual(await readBoundedJson(request(body, "1")), { ok: false, reason: "too_large" });
});

test("rejects an oversized body even when Content-Length matches", async () => {
  const body = " ".repeat(MAX_IMPORT_BODY_BYTES + 1);
  assert.deepEqual(
    await readBoundedJson(request(body, String(Buffer.byteLength(body)))),
    { ok: false, reason: "too_large" },
  );
});

test("cancels the request stream as soon as it exceeds the limit", async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(MAX_IMPORT_BODY_BYTES + 1));
    },
    cancel() {
      cancelled = true;
    },
  });
  const req = new Request("http://localhost/import", {
    method: "POST",
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  assert.deepEqual(await readBoundedJson(req), { ok: false, reason: "too_large" });
  assert.equal(cancelled, true);
});

test("reports malformed JSON separately from oversized input", async () => {
  assert.deepEqual(await readBoundedJson(request("{")), { ok: false, reason: "invalid_json" });
});

test("maps request stream failures to invalid JSON", async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.error(new Error("synthetic request stream failure"));
    },
  });
  const req = new Request("http://localhost/import", {
    method: "POST",
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  assert.deepEqual(await readBoundedJson(req), { ok: false, reason: "invalid_json" });
});

test("counts UTF-8 bytes rather than JavaScript characters", async () => {
  const body = JSON.stringify({ value: "é".repeat(MAX_IMPORT_BODY_BYTES / 2) });
  assert.ok(Buffer.byteLength(body) > MAX_IMPORT_BODY_BYTES);
  assert.deepEqual(await readBoundedJson(request(body)), { ok: false, reason: "too_large" });
});
