# 1. Generic main page with no Owner profile

Date: 2026-10-15

## Status

Accepted

## Context

The app needs a main page that introduces the service and leads Guests to booking. There is exactly one Owner, so the page could present them personally ("Book a call with …", name, photo). That would need an Owner profile stored somewhere and fetched from the backend, and no such entity exists yet.

## Decision

The main page describes the service, not the Owner. Its text is static: a heading, one sentence saying a Guest picks an Event Type and a free Slot in the next 14 days without signing up, and a "Book a call" button to the booking page. The page makes no backend calls.

## Consequences

The page needs no API and no Owner profile. If the Owner's name or photo should appear later, that brings in an Owner profile entity and an endpoint to serve it, which is a separate decision.
