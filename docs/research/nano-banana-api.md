# Nano Banana / Gemini Image Generation API Reference

> **Research date**: 2026-04-01
> **Status**: VERIFIED via live web fetch of https://ai.google.dev/gemini-api/docs/image-generation
> **Sources**: Google AI for Developers, Google DeepMind, TechCrunch

---

## 1. Model IDs (Verified)

| Marketing Name | Model ID | Notes |
|---|---|---|
| Nano Banana 2 | `gemini-3.1-flash-image-preview` | Latest (Feb 26, 2026). Fast, high-volume. 4K support, text rendering, up to 14 ref images |
| Nano Banana Pro | `gemini-3-pro-image-preview` | Premium. Advanced reasoning ("Thinking"), high-fidelity text, complex instructions |
| Nano Banana (original) | `gemini-2.5-flash-image` | Original model |

"Nano Banana" is Google's official marketing name for Gemini's native image generation capability.

---

## 2. REST API Endpoint and Authentication

### Endpoint
```
POST https://generativelanguage.googleapis.com/v1beta/models/{MODEL_ID}:generateContent
```

### Authentication
- Environment variable: `GEMINI_API_KEY`
- Header: `x-goog-api-key: {GEMINI_API_KEY}`
- Required headers: `Content-Type: application/json`

---

## 3. Request Body Structures

### 3.1 Text-to-Image Generation
```json
{
  "contents": [{
    "parts": [
      {"text": "Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme"}
    ]
  }],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"]
  }
}
```

### 3.2 Image Editing (Text + Image Input)
```json
{
  "contents": [{
    "parts": [
      {"text": "Create a picture of my cat eating a nano-banana in a fancy restaurant"},
      {
        "inline_data": {
          "mime_type": "image/jpeg",
          "data": "<BASE64_IMAGE_DATA>"
        }
      }
    ]
  }],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"]
  }
}
```

**Note**: Field names use snake_case in REST API: `inline_data`, `mime_type`.

### 3.3 Multi-Turn Conversation with Image Config
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [{"text": "Create a vibrant infographic explaining photosynthesis..."}]
    },
    {
      "role": "model",
      "parts": [{"inline_data": {"mime_type": "image/png", "data": "<PREVIOUS_IMAGE_DATA>"}}]
    },
    {
      "role": "user",
      "parts": [{"text": "Update this infographic to be in Spanish..."}]
    }
  ],
  "tools": [{"google_search": {}}],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "imageConfig": {
      "aspectRatio": "16:9",
      "imageSize": "2K"
    }
  }
}
```

### 3.4 Multiple Reference Images
```json
{
  "contents": [{
    "parts": [
      {"text": "An office group photo of these people, they are making funny faces."},
      {"inline_data": {"mime_type": "image/png", "data": "<BASE64_IMG_1>"}},
      {"inline_data": {"mime_type": "image/png", "data": "<BASE64_IMG_2>"}},
      {"inline_data": {"mime_type": "image/png", "data": "<BASE64_IMG_3>"}},
      {"inline_data": {"mime_type": "image/png", "data": "<BASE64_IMG_4>"}},
      {"inline_data": {"mime_type": "image/png", "data": "<BASE64_IMG_5>"}}
    ]
  }],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "imageConfig": {
      "aspectRatio": "5:4",
      "imageSize": "2K"
    }
  }
}
```

---

## 4. GenerationConfig Structure (Verified)

```json
{
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "imageConfig": {
      "aspectRatio": "16:9",
      "imageSize": "2K"
    },
    "thinkingConfig": {
      "thinkingLevel": "High",
      "includeThoughts": true
    }
  }
}
```

**Important**: The wrapper object is `imageConfig` (NOT `imageSizeOptions`).

---

## 5. Parameter Enum Values (Verified)

### 5.1 aspectRatio
```
"1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9"
```

### 5.2 imageSize
```
"512", "1K", "2K", "4K"
```
- Must use uppercase 'K' (e.g., "1K" not "1k")
- "512" has no suffix
- "512" is available only for gemini-3.1-flash-image-preview (Nano Banana 2)

### 5.3 thinkingLevel
```
"minimal", "High"
```
- Default: "minimal"
- "High" requires Nano Banana 2 (gemini-3.1-flash-image-preview) - verify Pro support

### 5.4 responseModalities
```
"TEXT", "IMAGE"
```
For image generation, use: `["TEXT", "IMAGE"]` or `["IMAGE"]`

---

## 6. Response Body Structure

### 6.1 Standard Response with Thought Signatures
```json
{
  "candidates": [{
    "content": {
      "parts": [
        {
          "inline_data": {"data": "<base64_image_data>", "mime_type": "image/png"},
          "thought": true
        },
        {
          "text": "Step-by-step guide text...",
          "thought_signature": "<Signature_A>"
        },
        {
          "inline_data": {"data": "<base64_image_data>", "mime_type": "image/png"},
          "thought_signature": "<Signature_B>"
        }
      ]
    }
  }],
  "groundingMetadata": {
    "searchEntryPoint": {
      "rendered_content": "<HTML_AND_CSS>"
    },
    "groundingChunks": [
      {"uri": "https://example.com"}
    ]
  }
}
```

### 6.2 Thought Signature Handling Rules
1. All `inline_data` parts with image mime_type in the response should have a signature
2. Parts with `"thought": true` do NOT include signatures — filter these from output
3. `thought_signature` is an opaque token — preserve exactly as received
4. Include thought_signature parts verbatim when building multi-turn conversation history
5. Never display thought_signature to the user or modify it

### 6.3 Error Response
```json
{
  "error": {
    "code": 400,
    "message": "Image generation failed due to safety filters.",
    "status": "INVALID_ARGUMENT"
  }
}
```

Common error codes: 400 (bad request/safety), 403 (invalid key), 429 (rate limit), 500 (server error), 503 (overloaded)

### 6.4 Safety-Blocked Response
```json
{
  "candidates": [{
    "finishReason": "SAFETY",
    "safetyRatings": [{"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "probability": "HIGH", "blocked": true}]
  }]
}
```

---

## 7. Google Search Grounding (Verified)

### Web Search Only
```json
{
  "tools": [{"google_search": {}}],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "imageConfig": {"aspectRatio": "16:9"}
  }
}
```

### Image Search Grounding (Nano Banana 2 / 3.1 Flash Only)
```json
{
  "tools": [{"google_search": {"searchTypes": {"webSearch": {}, "imageSearch": {}}}}],
  "generationConfig": {
    "responseModalities": ["IMAGE"]
  }
}
```

**Key**: Use snake_case `google_search` in REST API. Image search grounding uses nested `searchTypes` with `webSearch` and `imageSearch`.

---

## 8. Per-Model Parameter Compatibility

| Parameter | Nano Banana 2 (3.1 Flash) | Nano Banana Pro (3 Pro) | Nano Banana (2.5 Flash) |
|---|---|---|---|
| imageSize "512" | Yes | No | No |
| imageSize "1K"/"2K"/"4K" | Yes | Yes | Yes |
| thinkingLevel "High" | Yes | Yes (advanced reasoning) | No |
| enable_image_search | Yes | No | No |
| Multi-image refs | 10 object + 4 character (14) | 6 object + 5 character (11) | Limited |
| aspectRatio (all 14) | Yes | Yes | Yes |

---

## 9. Multi-Image Reference Limits

| Model | Object Images | Character Images | Total |
|---|---|---|---|
| Nano Banana 2 (gemini-3.1-flash-image-preview) | Up to 10 | Up to 4 | 14 |
| Nano Banana Pro (gemini-3-pro-image-preview) | Up to 6 | Up to 5 | 11 |

---

## 10. Pricing (as of 2026)

| Model | Per Image (approx) |
|---|---|
| Nano Banana (gemini-2.5-flash-image) | $0.039 |
| Nano Banana 2 (gemini-3.1-flash-image-preview) | $0.045 - $0.151 |
| Nano Banana Pro (gemini-3-pro-image-preview) | $0.134+ |

---

## 11. Implementation Notes

1. All generated images include SynthID watermarks
2. Use `responseModalities: ["TEXT", "IMAGE"]` to activate image generation
3. REST API uses snake_case field names: `inline_data`, `mime_type`, `google_search`
4. Base64 image data: no data URI prefix (no `data:image/png;base64,`)
5. For image editing: text prompt and image can be in same parts array
6. Input image MIME types: `image/png`, `image/jpeg`, `image/webp`, `image/gif`
