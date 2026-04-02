# claude-nanobanana-mcp

MCP server for AI image generation and editing via Google's Nano Banana (Gemini Image) API. Provides 7 tools for text-to-image generation, image editing, and multi-turn iterative refinement sessions.

> **This project was entirely developed, debugged, and tested by [Claude Code](https://claude.ai/claude-code) (Claude Opus 4.6).** From architecture design to implementation, bug fixes, API compatibility testing, and this documentation — all produced through human-AI collaboration in Claude Code sessions.

## Examples

| Generate | Edit | Multi-Edit | Ultrawide |
|:---:|:---:|:---:|:---:|
| ![generate](examples/generate-apple.png) | ![edit](examples/edit-green-apple.png) | ![multi](examples/multi-edit-2-smiley.png) | ![wide](examples/ultrawide-21-9.png) |
| "A red apple" | "Change to green" | 2-turn session | 21:9 cinematic |

## Prerequisites

- **Node.js 18+**
- **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/apikey)

## Install

```bash
git clone https://github.com/1439616687/claude-nanobanana-mcp.git
cd claude-nanobanana-mcp
npm install
npm run build
```

## Register in Claude Code

**User scope** (all projects):
```bash
claude mcp add nanobanana --scope user -e GEMINI_API_KEY=your-key -- node /absolute/path/claude-nanobanana-mcp/dist/index.js
```

**Local scope** (current project only):
```bash
claude mcp add nanobanana -e GEMINI_API_KEY=your-key -- node /absolute/path/claude-nanobanana-mcp/dist/index.js
```

After registering, restart your Claude Code session to load the tools.

## Tools

| Tool | Purpose | API Call |
|------|---------|:---:|
| `nanobanana_generate_image` | Text-to-image generation | Yes |
| `nanobanana_edit_image` | Edit existing image with instruction | Yes |
| `nanobanana_multi_edit_start` | Start iterative editing session | Yes |
| `nanobanana_multi_edit_continue` | Continue editing in session | Yes |
| `nanobanana_multi_edit_end` | End session, free memory | No |
| `nanobanana_list_sessions` | List active sessions | No |
| `nanobanana_list_options` | List models, params, compatibility | No |

### Usage Examples

```
"Draw a cartoon cat wearing a top hat, phone wallpaper"
  → auto-infers model: NB2, aspect_ratio: 9:16

"Edit this image to look like a pencil sketch"
  → uses nanobanana_edit_image with source_image_path

"Let's design a logo step by step"
  → starts multi_edit_start, then continue for each iteration
```

## Parameters

| Parameter | Values | Default | Notes |
|---|---|---|---|
| `model` | `gemini-3.1-flash-image-preview`, `gemini-3-pro-image-preview` | `gemini-3.1-flash-image-preview` | Nano Banana 2 (fast) or Pro (premium) |
| `aspect_ratio` | 14 options: `1:1` `1:4` `1:8` `2:3` `3:2` `3:4` `4:1` `4:3` `4:5` `5:4` `8:1` `9:16` `16:9` `21:9` | `1:1` | All ratios work with both models |
| `image_size` | `512` `1K` `2K` `4K` | `1K` | `512` = Nano Banana 2 only |
| `thinking_level` | `minimal` `High` | `minimal` | `High` = Nano Banana 2 only |
| `enable_search` | `true` `false` | `false` | Google Search grounding |
| `enable_image_search` | `true` `false` | `false` | Image search (Nano Banana 2 only) |
| `response_format` | `markdown` `json` | `markdown` | Output format |

### Model Compatibility

| Feature | Nano Banana 2 | Nano Banana Pro |
|---|:---:|:---:|
| Model ID | `gemini-3.1-flash-image-preview` | `gemini-3-pro-image-preview` |
| imageSize "512" | Yes | No |
| thinkingLevel "High" | Yes | No |
| Image Search | Yes | No |
| Max ref images | 14 | 11 |

### Auto-Inference

Claude automatically infers optimal parameters from context:

| User Intent | Inferred Parameters |
|---|---|
| "phone wallpaper" | `aspect_ratio: "9:16"` |
| "desktop wallpaper" | `aspect_ratio: "16:9"` |
| "YouTube thumbnail" | `aspect_ratio: "16:9"` |
| "Instagram post" | `aspect_ratio: "4:5"` |
| "print poster" | `image_size: "4K"`, `model: Pro` |
| "quick draft" | `image_size: "512"` |
| "complex scene" | `thinking_level: "High"` |
| "real-world reference" | `enable_search: true` |

## Output

Generated images are saved to `nanobanana-output/` in the current working directory with filenames like `1711929600000-a3f2.png`.

## Testing

This project has been comprehensively tested with **37 test cases across 6 dimensions**, achieving a **36/37 pass rate**. See [TESTING.md](TESTING.md) for the full report.

### Test Coverage Summary

| Dimension | Tested | Result |
|---|---|---|
| 7 tools (all operations) | 7/7 | Pass |
| 2 models (actual generation) | 2/2 | Pass |
| 4 resolutions (512/1K/2K/4K) | 4/4 | Pass |
| 14 aspect ratios | 14/14 | Pass |
| Advanced features (search, High thinking, JSON) | 5/5 | Pass |
| Error handling & edge cases | 10/10 | Pass |

Total API calls used for testing: ~36 (~$1.90 USD).

## Architecture

```
src/
├── index.ts              # MCP server init, 7 tool registrations, StdioServerTransport
├── types.ts              # All TypeScript interfaces
├── constants.ts          # Model IDs, enums, defaults, compatibility table
├── schemas/
│   └── tool-schemas.ts   # Zod schemas with rich .describe() for all 7 tools
├── services/
│   ├── gemini-client.ts  # HTTP client for Gemini REST API
│   ├── image-handler.ts  # Read/write images to disk as base64
│   ├── session-manager.ts# In-memory session store with 30min auto-expiry
│   └── shared-utils.ts   # Param validation, config builders, response extraction
└── tools/
    ├── generate.ts       # nanobanana_generate_image handler
    ├── edit.ts           # nanobanana_edit_image handler
    ├── multi-edit.ts     # multi_edit_start/continue/end handlers
    └── info.ts           # list_sessions, list_options handlers
```

## Built with Claude Code

This entire project was created through human-AI collaboration using [Claude Code](https://claude.ai/claude-code):

- **Architecture & Implementation**: Designed and coded from scratch by Claude Opus 4.6
- **Code Review & Bug Fixes**: Claude identified and fixed 2 bugs (session corruption on API failure, premature thought-part filtering), 4 design issues, and an API field naming mismatch (camelCase vs snake_case)
- **Testing**: 37 comprehensive tests executed via parallel Agent teams simulating casual users, power users, and designer workflows
- **Documentation**: README, test reports, and commit messages all authored by Claude

No human-written code in this repository.

## License

MIT
