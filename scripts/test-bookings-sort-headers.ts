import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import BookingsTableHeader from "../app/bookings/BookingsTableHeader";

const html = renderToStaticMarkup(
  React.createElement(BookingsTableHeader, {
    activeSort: "checkIn",
    direction: "desc",
    searchParams: {
      q: "lee family",
      channel: "Airbnb",
      status: "booked",
    },
  }),
);

for (const label of [
  "Guest",
  "Channel",
  "Status",
  "Booking Date",
  "Check-in",
  "Check-out",
  "Nights",
  "Revenue",
  "ADR",
]) {
  assert.match(html, new RegExp(`>${label}<|>${label}<span`), `${label} should have a sortable header`);
}
assert.doesNotMatch(html, />Phone</, "Phone should not be a bookings table header");
assert.equal((html.match(/aria-sort=/g) || []).length, 9, "every visible column should expose sort state");
assert.match(html, /aria-sort="descending"[^>]*>.*Sort by Check-in ascending/);
assert.match(html, /Sort by Check-in ascending[^>]*href="\/bookings\?q=lee\+family&amp;channel=Airbnb&amp;status=booked&amp;sort=checkIn&amp;direction=asc"/);
assert.match(html, /Sort by Guest ascending[^>]*href="\/bookings\?q=lee\+family&amp;channel=Airbnb&amp;status=booked&amp;sort=guest&amp;direction=asc"/);
assert.match(html, /aria-hidden="true"[^>]*>↓<\/span>/, "active direction should have a subtle visual indicator");

console.log("Bookings sortable header tests passed");
