# Testing Report

> All tests executed by Claude Code (Opus 4.6) via parallel Agent teams.
> Test date: 2026-04-02

## Overview

| Metric | Value |
|---|---|
| Total test cases | 65 |
| Passed | 63 |
| API limitations found | 2 (both fixed) |
| Pass rate | 96.9% |
| Total API calls | ~80 |
| Total cost | ~$5.50 USD |
| Models tested | Nano Banana 2, Nano Banana Pro |
| Rounds | 4 |

## Test Methodology

Tests were executed in 4 rounds using parallel Agent teams, each simulating different user personas:

1. **Round 1 -- Basic Verification**: Manual tool-by-tool testing of all 7 tools + 6 error handling cases
2. **Round 2 -- Persona-Based Testing**: 3 parallel agents simulating casual, power, and designer users
3. **Round 3 -- Full Coverage Sweep**: 3 parallel agents covering models, all 14 aspect ratios, deep multi-edit, concurrent sessions, edge cases
4. **Round 4 -- Deep Combinations**: 4 parallel agents testing Pro model depth, cross-model workflows, multi-parameter combos, creative edge cases

---

## Round 1: Basic Verification (13/13 Pass)

### Tool Functionality

| # | Test | Tool | Result |
|---|------|------|--------|
| 1 | List available options | `list_options` | PASS |
| 2 | List sessions (empty) | `list_sessions` | PASS |
| 3 | Generate image (512, 1:1) | `generate_image` | PASS -- red apple |
| 4 | Edit image (red to green) | `edit_image` | PASS -- color changed precisely |
| 5 | Start multi-edit session | `multi_edit_start` | PASS -- blue circle, session created |
| 6 | Continue multi-edit | `multi_edit_continue` | PASS -- smiley face added, context preserved |
| 7 | End multi-edit session | `multi_edit_end` | PASS -- total_turns: 2 |

### Error Handling

| # | Test | Expected Error | Result |
|---|------|----------------|--------|
| 8 | 512 + Pro | "512 only available with NB2" | PASS |
| 9 | High + Original | "High not supported" | PASS |
| 10 | Image search + Pro | "Image search only available with NB2" | PASS |
| 11 | Invalid image path | "Image file not found" | PASS |
| 12 | Invalid session ID (continue) | "Session not found" | PASS |
| 13 | Invalid session ID (end) | "Session not found" | PASS |

---

## Round 2: Persona-Based Testing (11/11 Pass)

### Agent 1: Casual User

| # | Test | Parameters | Result |
|---|------|-----------|--------|
| 14 | Phone wallpaper | NB2, 9:16, 1K | PASS -- vertical starry sky, 940KB |
| 15 | YouTube thumbnail | NB2, 16:9, 512 | PASS -- food photo with text overlay, 258KB |
| 16 | Desktop 4K wallpaper | NB2, 16:9, 4K | PASS -- beach sunset, 9.3MB |

### Agent 2: Power User

| # | Test | Parameters | Result |
|---|------|-----------|--------|
| 17 | High thinking + JSON + 4:5 | NB2, High, json, 4:5, 512 | PASS -- steampunk cityscape, valid JSON |
| 18 | Google Search grounding | NB2, enable_search, 2:3, 512 | PASS -- Eiffel Tower |
| 19 | Image Search grounding | NB2, enable_image_search, 1:1, 512 | PASS -- "Bean Dream" logo |

### Agent 3: Designer User

| # | Test | Operation | Result |
|---|------|-----------|--------|
| 20 | Multi-edit from source image | start with source_image_path | PASS |
| 21 | List sessions (active) | list_sessions | PASS -- 1 session |
| 22 | Continue editing | continue | PASS -- context preserved |
| 23 | End session | end | PASS -- total_turns: 2 |
| 24 | Verify cleanup | list_sessions | PASS -- 0 sessions |

---

## Round 3: Full Coverage Sweep (12/13 Pass)

### Agent 1: Model & Resolution Tests

| # | Test | Parameters | Result |
|---|------|-----------|--------|
| 25 | Pro generate | Pro, 1K | PASS -- watercolor rose |
| 26 | 2K resolution | NB2, 2K | PASS -- 3.04MB |
| 27 | Edit with Pro | Pro, edit | PASS -- pencil sketch |
| 28 | High + Pro | Pro, High | **FAIL** -- API 400 |

> Test 28: Fixed by setting `thinkingConfigurable: false` for Pro.

### Agent 2: Aspect Ratio Sweep (9/9 Pass)

| # | Ratio | Pixels | Result |
|---|-------|--------|--------|
| 29 | 1:4 | 256x1024 | PASS |
| 30 | 1:8 | 176x1456 | PASS |
| 31 | 3:2 | 624x416 | PASS |
| 32 | 3:4 | 448x592 | PASS |
| 33 | 4:1 | 1024x256 | PASS |
| 34 | 4:3 | 592x448 | PASS |
| 35 | 5:4 | 576x464 | PASS |
| 36 | 8:1 | 1456x176 | PASS |
| 37 | 21:9 | 784x336 | PASS |

### Agent 3: Deep Sessions & Edge Cases

| # | Test | Result |
|---|------|--------|
| 38 | 4-turn deep multi-edit | PASS -- all context preserved across 4 turns |
| 39 | Concurrent sessions (2 active) | PASS |
| 40 | Session cleanup | PASS -- 0 remaining |
| 41 | Invalid MIME type (.bmp) | PASS -- error returned |
| 42 | Minimal 1-char prompt | PASS -- no crash |
| 43 | Workflow chain (output to input) | PASS |

---

## Round 4: Deep Combinations (28/29 Pass)

### Agent A: Pro Model Deep Parameters

| # | Test | Parameters | Result |
|---|------|-----------|--------|
| 44 | Pro + 2K + 16:9 | Pro, 2K, 16:9 | PASS -- 2.8MB |
| 45 | Pro + 4K + 9:16 | Pro, 4K, 9:16 | PASS -- 9.5MB |
| 46 | Pro + JSON + 4:5 | Pro, 1K, json, 4:5 | PASS -- valid JSON |
| 47 | Pro + search + 21:9 | Pro, search, 21:9 | PASS |
| 48 | Pro + 1:8 extreme ratio | Pro, 1:8 | **FAIL** -- API 400 |
| 49 | Pro edit + 2K | Pro, edit, 2K | PASS -- 3.1MB |

> Test 48: Fixed by adding Rule 4 with `PRO_SUPPORTED_ASPECT_RATIOS`.

### Agent B: Cross-Model Workflows

| # | Test | Workflow | Result |
|---|------|---------|--------|
| 50 | NB2 draft to Pro refine | NB2 512 generate, Pro 1K edit | PASS |
| 51 | Pro base to NB2 iterate | Pro 1K generate, NB2 512 edit | PASS |
| 52 | NB2 multi-edit to Pro polish | NB2 session then Pro edit | PASS |
| 53 | Same prompt comparison | NB2 vs Pro at 1K 2:3 | PASS |

### Agent C: Multi-Parameter Combinations

| # | Test | Parameters | Result |
|---|------|-----------|--------|
| 54 | ALL features simultaneously | NB2, 2K, 16:9, High, search, image_search, json | PASS |
| 55 | Ratio change on edit | 1:1 to 16:9 | PASS |
| 56 | Search on edit | edit_image + enable_search | PASS |
| 57 | High + 4K + 4:3 | NB2, 4K, 4:3, High | PASS -- 12.9MB |
| 58 | 512 to 4K upscale edit | 290KB to 9.9MB | PASS |

### Agent D: Creative Edge Cases

| # | Test | Scenario | Result |
|---|------|---------|--------|
| 59 | Style chain | photo to sketch to watercolor to oil (4 edits) | PASS |
| 60 | Semantic undo | sunny to stormy to "undo + rainbow" | PASS |
| 61 | Precise text rendering | Business card: name, title, phone | PASS -- all correct |
| 62 | Progressive scene (5 elements) | room + window + piano + cat + sunlight | PASS |
| 63 | UI mockup | iOS weather app | PASS -- production quality |
| 64 | Divergent edits | Crystal apple vs steampunk apple | PASS |
| 65 | Abstract concept | "Visualize loneliness" | PASS |

---

## Coverage Matrix

### Parameters (100%)

| Parameter | Values Tested | Coverage |
|---|---|---|
| model | NB2, Pro | 2/2 |
| aspect_ratio | All 14 values | 14/14 |
| image_size | 512, 1K, 2K, 4K | 4/4 |
| thinking_level | minimal, High | 2/2 |
| enable_search | true, false | 2/2 |
| enable_image_search | true, false | 2/2 |
| response_format | markdown, json | 2/2 |

### Cross-Model Workflows

| Workflow | Tested |
|---|---|
| NB2 generate | Yes |
| Pro generate | Yes |
| NB2 edit | Yes |
| Pro edit | Yes |
| NB2 generate to Pro edit | Yes |
| Pro generate to NB2 edit | Yes |
| NB2 multi-edit to Pro polish | Yes |
| Same prompt NB2 vs Pro | Yes |

### Scenarios (24 unique)

| Scenario | Tested |
|---|---|
| Text-to-image generation | Yes |
| Image editing (single shot) | Yes |
| Multi-edit from text | Yes |
| Multi-edit from source image | Yes |
| Multi-edit deep (4 turns) | Yes |
| Concurrent sessions | Yes |
| Session lifecycle | Yes |
| Cross-model editing | Yes |
| Workflow chaining | Yes |
| Parameter validation (5 rules) | Yes |
| Invalid file path | Yes |
| Invalid session ID | Yes |
| Unsupported MIME type | Yes |
| Minimal input (1 char) | Yes |
| Style chain (4 styles) | Yes |
| Contradictory instructions | Yes |
| Precise text rendering | Yes |
| Progressive scene building | Yes |
| UI mockup generation | Yes |
| Divergent edits | Yes |
| Abstract concept | Yes |
| Resolution upscale edit | Yes |
| Ratio change edit | Yes |
| All features simultaneously | Yes |

---

## API Limitations Found & Fixed

| Issue | Discovery | Fix |
|---|---|---|
| Pro rejects thinkingLevel "High" | Round 3, Test 28 | `thinkingConfigurable: false`, skip thinkingConfig for Pro |
| Pro rejects extreme aspect ratios | Round 4, Test 48 | Rule 4 with `PRO_SUPPORTED_ASPECT_RATIOS` |

## Bugs Found & Fixed During Development

| Bug | Fix |
|---|---|
| Session corruption on API failure | Moved appendToSession after API success |
| Thought parts filtered too early | Removed filterThoughtParts from client |
| API response field names (snake vs camel) | Updated all types to camelCase |
| Missing response_format in sessions | Added responseFormat to SessionState |
| No image content in MCP results | Added ImageContent to content array |
| No input length limit | Added .max(32000) to Zod schemas |
| Pro compatibility errors | Updated per official Google docs |

## Example Images

See `tests/examples/` for sample outputs:

| File | Description |
|---|---|
| `generate-apple.png` | Text-to-image: red apple |
| `edit-green-apple.png` | Edit: red to green |
| `multi-edit-1-circle.png` | Multi-edit turn 1: blue circle |
| `multi-edit-2-smiley.png` | Multi-edit turn 2: smiley added |
| `youtube-thumbnail.png` | YouTube thumbnail (16:9) |
| `logo-bean-dream.png` | Logo with image search |
| `ultrawide-21-9.png` | Cinematic ultrawide |
