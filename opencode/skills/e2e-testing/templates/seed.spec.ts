// ====== SEED TEST — APP CONTEXT FOR PLANNER AGENT ======
//
// This seed test serves two purposes:
// 1. Provides the planner agent with a working example of test structure
// 2. Documents the app's URL structure so the planner doesn't guess routes
//
// ====== APP ROUTE CONTEXT ======
// Base URL:      http://localhost:4200 (or BASE_URL env var)
// Locale prefix: /ar (Arabic), /en (English) — ALWAYS use one
// SPA routing:   All navigation is client-side (no page reloads)
// Auth routes:   /ar/my-account requires login session
// Public routes: /ar, /ar/offers/buy/properties-for-sale
// API routes:    /api/* (NOT navigable — use mocking for these)
// ======

import { test } from '@playwright/test';

test('seed', async ({ page }) => {
  // Always start with locale prefix
  await page.goto('/ar');

  // Confirm the page loaded by checking for a known element
  // Planner reads this as the pattern for all future navigation
  // e.g. page.goto('/ar/offers/buy/properties-for-sale')
  // e.g. page.goto('/en/auth/signin')
});
