// ====== VISION ASSERTION UTILITY ======
// Programmatic visual verification using MiniMax vision API.
// No MCP tools required — call this directly in Playwright tests.
//
// Prerequisites:
//   MINIMAX_API_KEY env var (get from https://platform.minimax.io)
//
// Install:
//   npm install @anthropic-ai/sdk
//
// Usage:
//   import { assertVisualState } from '../utils/vision-assertion';
//
//   await assertVisualState(page, {
//     description: 'Describe the login button:',
//     expected: { textContent: 'Sign In', backgroundColor: '#c91014' },
//   });

import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

interface VisualCheck {
  description: string;
  expected?: {
    backgroundColor?: string;
    textContent?: string;
    borderRadius?: string;
    state?: 'visible' | 'hidden' | 'disabled' | 'focused';
  };
  additionalChecks?: string[];
}

interface VisionResult {
  description: string;
  matches: boolean;
  details: string;
}

function formatPrompt(check: VisualCheck): string {
  const lines = [check.description];
  if (check.expected) {
    for (const [key, value] of Object.entries(check.expected)) {
      if (value) lines.push(`- ${key}: ${value}`);
    }
  }
  if (check.additionalChecks) {
    lines.push('', 'Also check:', ...check.additionalChecks);
  }
  return lines.join('\n');
}

function extractResult(text: string): VisionResult {
  const lower = text.toLowerCase();
  const matches = !lower.includes('no') && !lower.includes('not') && !lower.includes('incorrect');
  return { description: text, matches, details: text };
}

// ---- Option A: Anthropic SDK (recommended) ----
// npm install @anthropic-ai/sdk
export async function assertVisualStateAnthropic(
  page: Page,
  check: VisualCheck,
  options?: { screenshotPath?: string },
): Promise<VisionResult> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({
    apiKey: process.env.MINIMAX_API_KEY!,
    baseURL: 'https://api.minimax.io/anthropic/v1',
  });

  const screenshotPath = options?.screenshotPath ?? '.playwright-mcp/vision-check.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const imageBuffer = fs.readFileSync(screenshotPath);
  const base64Image = imageBuffer.toString('base64');

  const response = await client.messages.create({
    model: 'MiniMax-M2.7',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: formatPrompt(check) },
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: base64Image },
          },
        ],
      },
    ],
  });

  const text = (response.content[0] as { text: string }).text;
  return extractResult(text);
}

// ---- Option B: HTTP fetch (no SDK dependency) ----
export async function assertVisualState(
  page: Page,
  check: VisualCheck,
  options?: { screenshotPath?: string; model?: string },
): Promise<VisionResult> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error('MINIMAX_API_KEY env var is required');

  const screenshotPath = options?.screenshotPath ?? '.playwright-mcp/vision-check.png';
  const dir = path.dirname(screenshotPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await page.screenshot({ path: screenshotPath, fullPage: true });
  const imageBuffer = fs.readFileSync(screenshotPath);
  const base64Image = imageBuffer.toString('base64');

  const response = await fetch('https://api.minimax.io/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: options?.model ?? 'MiniMax-M2.7',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: formatPrompt(check) },
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: base64Image },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Vision API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const text = (data.content as Array<{ text: string }>)[0]?.text ?? '';
  return extractResult(text);
}

// ---- Option C: expect-style assertion ----
export async function expectVisualState(
  page: Page,
  check: VisualCheck,
  options?: { screenshotPath?: string },
): Promise<void> {
  const result = await assertVisualState(page, check, options);
  if (!result.matches) {
    throw new Error(
      `Visual assertion failed.\nDescription: ${check.description}\nExpected: ${JSON.stringify(check.expected)}\nVision response: ${result.details}`,
    );
  }
}
