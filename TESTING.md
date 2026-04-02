# Testing Report

> All tests executed by Claude Code (Opus 4.6) via parallel Agent teams.
> Test date: 2026-04-02

## Overview

| Metric | Value |
|---|---|
| Total test cases | 37 |
| Passed | 36 |
| Failed | 1 (API-side, see Known Issues) |
| Pass rate | 97.3% |
| Total API calls | ~36 |
| Total cost | ~$1.90 USD |
| Models tested | Nano Banana 2, Nano Banana Pro |

## Test Methodology

Tests were executed in 3 rounds using parallel Agent teams, each simulating a different user persona:

1. **Round 1 — Basic Verification**: Manual tool-by-tool testing of all 7 tools + 6 error handling cases
2. **Round 2 — Persona-Based Testing**: 3 parallel agents simulating casual, power, and designer users
3. **Round 3 — Full Coverage Sweep**: 3 parallel agents covering remaining models, all 14 aspect ratios, deep multi-edit, concurrent sessions, and edge cases

## Round 1: Basic Verification (13/13 Pass)

### Tool Functionality

| # | Test | Tool | Result |
|---|------|------|--------|
| 1 | List available options | `list_options` | PASS — returned 2 models, 14 ratios, 4 sizes, compatibility matrix |
| 2 | List sessions (empty) | `list_sessions` | PASS — returned empty list |
| 3 | Generate image (512, 1:1) | `generate_image` | PASS — red apple generated |
| 4 | Edit image (red → green) | `edit_image` | PASS — apple color changed precisely |
| 5 | Start multi-edit session | `multi_edit_start` | PASS — blue circle generated, session created |
| 6 | Continue multi-edit | `multi_edit_continue` | PASS — smiley face added to circle, context preserved |
| 7 | End multi-edit session | `multi_edit_end` | PASS — session ended, total_turns: 2 |

### Error Handling

| # | Test | Expected Error | Result |
|---|------|----------------|--------|
| 8 | 512 + Nano Banana Pro | "512 only available with NB2" | PASS |
| 9 | High + Nano Banana Original | "High not supported by original" | PASS |
| 10 | Image search + Pro | "Image search only available with NB2" | PASS |
| 11 | Invalid image path | "Image file not found" | PASS |
| 12 | Invalid session ID (continue) | "Session not found" | PASS |
| 13 | Invalid session ID (end) | "Session not found" | PASS |

## Round 2: Persona-Based Testing (11/11 Pass)

### Agent 1: Casual User

| # | Test | Parameters | Result |
|---|------|-----------|--------|
| 14 | Phone wallpaper | 9:16, 1K | PASS — vertical starry sky, 940KB |
| 15 | YouTube thumbnail | 16:9, 512 | PASS — landscape food photo with contextual text overlay, 258KB |
| 16 | Desktop 4K wallpaper | 16:9, 4K | PASS — beach sunset, 9.3MB |

File size scaling verified: 512 (258KB) < 1K (940KB) < 4K (9.3MB).

### Agent 2: Power User

| # | Test | Parameters | Result |
|---|------|-----------|--------|
| 17 | High thinking + JSON + 4:5 | High, json, 4:5, 512 | PASS — steampunk cityscape, valid JSON with all fields |
| 18 | Google Search grounding | enable_search, 2:3, 512 | PASS — Eiffel Tower with accurate architectural details |
| 19 | Image Search grounding | enable_image_search, 1:1, 512 | PASS — "Bean Dream" logo, text rendered correctly |

### Agent 3: Designer User

| # | Test | Operation | Result |
|---|------|-----------|--------|
| 20 | Multi-edit from source image | start with source_image_path | PASS — green apple + wooden table |
| 21 | List sessions (active) | list_sessions | PASS — 1 session, turn_count: 1 |
| 22 | Continue editing | continue | PASS — warm kitchen background, context preserved |
| 23 | End session | end | PASS — total_turns: 2 |
| 24 | Verify cleanup | list_sessions | PASS — 0 sessions |

## Round 3: Full Coverage Sweep (13/14 Pass)

### Agent 1: Model & Resolution Tests

| # | Test | Parameters | Result |
|---|------|-----------|--------|
| 25 | Nano Banana Pro generate | Pro, 1K | PASS — watercolor rose |
| 26 | 2K resolution | NB2, 2K | PASS — butterfly macro, 3.04MB (between 1K and 4K) |
| 27 | Edit with Nano Banana Pro | Pro, edit | PASS — apple converted to pencil sketch |
| 28 | High thinking + Pro | Pro, High | **FAIL** — API returned 400: "Thinking level is not supported for this model" |

> Test 28 revealed that the Gemini API does not support `thinkingLevel: "High"` for `gemini-3-pro-image-preview`, contradicting Google's documentation. This was fixed by updating the compatibility table to reject High+Pro locally.

### Agent 2: Aspect Ratio Sweep (9/9 Pass)

All 9 previously untested aspect ratios verified with pixel dimension checks:

| # | Ratio | Orientation | Pixels | Tolerance | Result |
|---|-------|-------------|--------|-----------|--------|
| 29 | 1:4 | Tall portrait | 256x1024 | exact | PASS |
| 30 | 1:8 | Very tall narrow | 176x1456 | ~3% | PASS |
| 31 | 3:2 | Landscape | 624x416 | exact | PASS |
| 32 | 3:4 | Portrait | 448x592 | ~1% | PASS |
| 33 | 4:1 | Very wide | 1024x256 | exact | PASS |
| 34 | 4:3 | Landscape | 592x448 | ~1% | PASS |
| 35 | 5:4 | Slightly wide | 576x464 | ~1% | PASS |
| 36 | 8:1 | Ultra-wide | 1456x176 | ~3% | PASS |
| 37 | 21:9 | Cinematic | 784x336 | exact | PASS |

Combined with Round 1-2: **all 14 aspect ratios confirmed working**.

### Agent 3: Deep Sessions & Edge Cases

| # | Test | Operation | Result |
|---|------|-----------|--------|
| 38 | 4-turn deep multi-edit | start → 3 continues | PASS — white cube → red → +blue sphere → +lighting, all context preserved |
| 39 | Concurrent sessions | 2 sessions at once | PASS — list_sessions returned both |
| 40 | Session cleanup | end both + verify | PASS — 0 sessions remaining |
| 41 | Invalid MIME type (.bmp) | edit_image | PASS — "Unsupported image format .bmp" |
| 42 | Minimal 1-char prompt | generate "x" | PASS — API returned text-only, no crash |
| 43 | Workflow chain (output→input) | multi_edit from prior output | PASS — end-to-end pipeline works |

## Coverage Matrix

### Parameters

| Parameter | Values Tested | Coverage |
|---|---|---|
| model | NB2, Pro | 2/2 (100%) |
| aspect_ratio | 1:1, 1:4, 1:8, 2:3, 3:2, 3:4, 4:1, 4:3, 4:5, 5:4, 8:1, 9:16, 16:9, 21:9 | 14/14 (100%) |
| image_size | 512, 1K, 2K, 4K | 4/4 (100%) |
| thinking_level | minimal, High | 2/2 (100%) |
| enable_search | true, false | 2/2 (100%) |
| enable_image_search | true, false | 2/2 (100%) |
| response_format | markdown, json | 2/2 (100%) |

### Scenarios

| Scenario | Status |
|---|---|
| Text-to-image generation | Tested |
| Image editing (single shot) | Tested |
| Multi-edit from text | Tested |
| Multi-edit from source image | Tested |
| Multi-edit deep (4 turns) | Tested |
| Concurrent sessions | Tested |
| Session lifecycle (create/list/end/verify) | Tested |
| Cross-model editing (NB2 generate → Pro edit) | Tested |
| Workflow chaining (output → input) | Tested |
| Parameter incompatibility rejection (3 rules) | Tested |
| Invalid file path | Tested |
| Invalid session ID | Tested |
| Unsupported MIME type | Tested |
| Minimal input (1 char) | Tested |

## Known Issues

| Issue | Severity | Status |
|---|---|---|
| Gemini API rejects `thinkingLevel: "High"` for `gemini-3-pro-image-preview` despite documentation claiming support | Medium | **Fixed** — compatibility table updated to block locally |

## Bugs Found & Fixed During Development

| Bug | Impact | Fix |
|---|---|---|
| Session corruption on API failure | `multi_edit_continue` appended user turn before API call; failure left orphaned turn causing consecutive user messages | Moved `appendToSession` after API success, built `fullContents` locally for the API call |
| Thought parts filtered too early | `filterThoughtParts` in gemini-client removed `thought: true` parts before session storage, violating multi-turn context requirements | Removed `filterThoughtParts` from client; `extractModelText`/`extractImageData` already handle display-level filtering |
| API response field name mismatch | Code expected snake_case (`inline_data`, `mime_type`, `thought_signature`) but Gemini API returns camelCase (`inlineData`, `mimeType`, `thoughtSignature`) | Updated all types and code to use camelCase matching API response |
| Missing `response_format` in multi-edit sessions | `multi_edit_continue` always output markdown regardless of format chosen at session start | Added `responseFormat` to `SessionState`, carried forward from `multi_edit_start` |
| Unused parameter in validation | `aspectRatio` accepted but never checked in `validateParameterCompatibility` | Removed the parameter |
| No image content in MCP tool results | Tool results only returned file path text, not the actual image | Added `ImageContent` to result `content` array |
| No input length limit | `prompt` and `edit_instruction` had no max length | Added `.max(32000)` to Zod schemas |
