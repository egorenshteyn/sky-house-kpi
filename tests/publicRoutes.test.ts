import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPublicRoute } from "../lib/publicRoutes";

describe("isPublicRoute", () => {
  it("allows standalone estimator, image assets, and auth endpoints", () => {
    assert.equal(isPublicRoute("/dillon-beach-revenue-estimator"), true);
    assert.equal(isPublicRoute("/images/dillon-beach-hero.jpg"), true);
    assert.equal(isPublicRoute("/api/auth/session"), true);
  });

  it("keeps private app pages and APIs protected", () => {
    assert.equal(isPublicRoute("/"), false);
    assert.equal(isPublicRoute("/api/bookings"), false);
    assert.equal(isPublicRoute("/admin"), false);
  });
});
