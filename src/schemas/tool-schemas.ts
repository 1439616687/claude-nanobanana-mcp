// =============================================================================
// nanobanana-mcp-server — Zod Schemas for All 7 Tools
// =============================================================================

import { z } from "zod";
import {
  MODEL_ID_VALUES,
  SUPPORTED_ASPECT_RATIOS,
  SUPPORTED_IMAGE_SIZES,
  SUPPORTED_THINKING_LEVELS,
  SUPPORTED_RESPONSE_FORMATS,
  DEFAULT_MODEL,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_IMAGE_SIZE,
  DEFAULT_THINKING_LEVEL,
  DEFAULT_RESPONSE_FORMAT,
} from "../constants.js";

// -----------------------------------------------------------------------------
// Shared Field Builders
// -----------------------------------------------------------------------------

const modelField = z
  .enum(MODEL_ID_VALUES)
  .default(DEFAULT_MODEL)
  .describe(
    "Which Nano Banana model to use. " +
    "'gemini-3.1-flash-image-preview' (Nano Banana 2): fast, 4K, 512 support, High thinking, image search, up to 14 ref images. Best for speed, high-volume generation, and quick iteration. " +
    "'gemini-3-pro-image-preview' (Nano Banana Pro): premium, built-in always-on thinking, up to 11 ref images, 9 aspect ratios only (no extreme ratios like 1:4, 1:8, 4:1, 8:1, 21:9). Best for complex compositions, faithful text rendering, and photorealistic scenes. " +
    "AUTO-INFERENCE: speed/volume/thumbnails/drafts -> Nano Banana 2, complex scene/text rendering/photorealism -> Nano Banana Pro. " +
    "Default: gemini-3.1-flash-image-preview."
  );

const aspectRatioField = z
  .enum(SUPPORTED_ASPECT_RATIOS)
  .default(DEFAULT_ASPECT_RATIO)
  .describe(
    "Aspect ratio of the generated image. " +
    "Auto-inference guide: phone wallpaper -> '9:16', desktop wallpaper -> '16:9', " +
    "Instagram post -> '4:5', YouTube thumbnail -> '16:9', logo/icon/avatar -> '1:1', " +
    "ultrawide/cinematic -> '21:9', portrait photo -> '2:3' or '3:4', " +
    "landscape photo -> '3:2' or '4:3'. " +
    "All 14 options: 1:1, 1:4, 1:8, 2:3, 3:2, 3:4, 4:1, 4:3, 4:5, 5:4, 8:1, 9:16, 16:9, 21:9 (Nano Banana 2). " +
    "Nano Banana Pro supports 9 only: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9. " +
    "Default: '1:1'."
  );

const imageSizeField = z
  .enum(SUPPORTED_IMAGE_SIZES)
  .default(DEFAULT_IMAGE_SIZE)
  .describe(
    "Resolution tier for the output image. " +
    "'512': fast drafts/thumbnails (Nano Banana 2 only). " +
    "'1K': standard quality, good for most uses. " +
    "'2K': high quality for detailed images. " +
    "'4K': maximum quality for print/large display. " +
    "Auto-inference: quick draft/thumbnail -> '512', standard use -> '1K', " +
    "detailed work -> '2K', print poster/high-res -> '4K'. " +
    "Note: '512' only works with model 'gemini-3.1-flash-image-preview'. " +
    "Values are case-sensitive: use '1K', not '1k'. " +
    "Default: '1K'."
  );

const thinkingLevelField = z
  .enum(SUPPORTED_THINKING_LEVELS)
  .default(DEFAULT_THINKING_LEVEL)
  .describe(
    "How much internal reasoning the model uses before generating. " +
    "'minimal': faster, suitable for straightforward prompts. " +
    "'High': deeper reasoning for complex scenes, detailed compositions, or text rendering. " +
    "Note: 'High' is only configurable on 'gemini-3.1-flash-image-preview' (Nano Banana 2). " +
    "Nano Banana Pro has built-in always-on thinking (do not set 'High' for Pro). " +
    "Auto-inference: complex scene or detailed illustration -> 'High' (with Nano Banana 2). " +
    "Default: 'minimal'."
  );

const enableSearchField = z
  .boolean()
  .default(false)
  .describe(
    "Enable Google Search grounding to incorporate real-world data into image generation. " +
    "Useful when the prompt references current events, real places, real products, or needs factual accuracy. " +
    "Auto-inference: any mention of real-world data, current events, or specific real entities -> true. " +
    "Default: false."
  );

const enableImageSearchField = z
  .boolean()
  .default(false)
  .describe(
    "Enable Google Image Search grounding for visual reference from the web. " +
    "Only available with model 'gemini-3.1-flash-image-preview' (Nano Banana 2). " +
    "Useful when the user wants to base the output on a particular visual style or real-world appearance. " +
    "Enabling this implicitly enables web search as well. " +
    "Auto-inference: 'based on this photo style' or 'like these images' -> true. " +
    "Default: false."
  );

const responseFormatField = z
  .enum(SUPPORTED_RESPONSE_FORMATS)
  .default(DEFAULT_RESPONSE_FORMAT)
  .describe(
    "Output format for the text portion of the response. " +
    "'markdown': human-friendly formatted text with image path. " +
    "'json': machine-readable JSON object with all metadata. " +
    "Default: 'markdown'."
  );

// =============================================================================
// Tool 1: nanobanana_generate_image
// =============================================================================

export const GenerateImageSchema = z
  .object({
    prompt: z
      .string()
      .min(1, "Prompt must not be empty")
      .max(32000, "Prompt exceeds maximum length")
      .describe(
        "Detailed description of the image to generate. " +
        "GOLDEN RULE: Describe the scene as a narrative paragraph, NOT a keyword list. " +
        "The model's core strength is deep language understanding — a descriptive paragraph always produces better results than disconnected words. " +
        "PROMPT TEMPLATES BY CATEGORY — pick the matching template and fill in the placeholders: " +
        "Photorealistic: 'A photorealistic [shot type] of [subject], [action/expression], set in [environment]. Illuminated by [lighting], creating a [mood] atmosphere. Captured with a [camera/lens], emphasizing [key textures/details].' " +
        "Sticker/Icon: 'A [style] sticker of [subject], featuring [characteristics] and a [color palette]. The design has [line style] and [shading]. The background must be white.' (Note: transparent backgrounds are NOT supported.) " +
        "Product/Commercial: 'A photo of [product] on [surface]. [Lighting description]. [Brand/text integration details]. [Magazine/ad context if applicable].' " +
        "Infographic/Text: 'Create a [style] infographic explaining [topic] as [creative analogy]. Show [elements]. Style like [reference], suitable for [audience].' " +
        "Isometric 3D: 'A 45° top-down isometric miniature 3D [style] scene of [location], featuring [landmarks/elements]. Soft refined textures with PBR materials and gentle lighting. [Title text] in bold at top-center.' " +
        "Scientific/Technical: '[Artist/style reference] style [illustration type] of [subject]. Detailed drawings of [components] on [medium texture] with notes in [language].' " +
        "Text/Typography: '[Format] with the text \"[exact text]\" in [font style]. [Placement and sizing details]. [Additional design elements].' " +
        "Nature/Wildlife: 'Use image search to find accurate images of [species]. Create a [ratio] wallpaper of this [subject], with [composition style].' " +
        "Data Visualization: 'Visualize [real-world data] as a [chart/infographic style]. Add [visual elements].' (Enable search for real-time data.) " +
        "EXPANSION EXAMPLE: user says 'a cat' -> 'A photorealistic close-up of a fluffy orange tabby cat sitting on a sunlit windowsill, gazing outside with curious green eyes. Warm golden hour light streams through the window, highlighting the fine texture of its fur. Captured with an 85mm portrait lens with soft bokeh background of a cozy apartment. Serene and peaceful mood.'"
      ),
    model: modelField,
    aspect_ratio: aspectRatioField,
    image_size: imageSizeField,
    thinking_level: thinkingLevelField,
    enable_search: enableSearchField,
    enable_image_search: enableImageSearchField,
    response_format: responseFormatField,
  })
  .strict();

// =============================================================================
// Tool 2: nanobanana_edit_image
// =============================================================================

export const EditImageSchema = z
  .object({
    edit_instruction: z
      .string()
      .min(1, "Edit instruction must not be empty")
      .max(32000, "Edit instruction exceeds maximum length")
      .describe(
        "Description of how to edit the source image. " +
        "GOLDEN RULE: Describe edits as specific narrative instructions, not keywords. " +
        "EDIT TEMPLATES: " +
        "Style transfer: 'Convert this image to a [style] style, with [specific characteristics like brush strokes, color palette, line weight].' " +
        "Background change: 'Replace the background with [detailed new environment], keeping the [subject] exactly as it is.' " +
        "Object manipulation: 'Add [object with details] to [position]. It should [interaction with scene].' / 'Remove [object] and fill the area naturally.' " +
        "Text overlay: 'Add the text \"[exact text]\" in [font style] at [position]. [Color and size details].' " +
        "Enhancement: 'Enhance [specific aspects]: improve [lighting/color/detail], add [effects like bokeh, vignette], adjust [tone/mood].' " +
        "Localization: 'Update this [content type] to be in [language]. Do not change any other elements.' " +
        "Logo/brand integration: 'Place this [element] on [product/context]. The [element] is perfectly integrated into [surface].' " +
        "EXPANSION EXAMPLE: 'make it better' -> 'Enhance the color vibrancy, improve lighting contrast with warmer tones, sharpen fine details, and add a subtle golden-hour color grading to create a more inviting atmosphere.'"
      ),
    source_image_path: z
      .string()
      .min(1, "Source image path must not be empty")
      .describe(
        "Absolute file path to the source image to edit. " +
        "Supported formats: PNG (.png), JPEG (.jpg, .jpeg), WebP (.webp), GIF (.gif). " +
        "The file must exist and be readable."
      ),
    model: modelField,
    aspect_ratio: aspectRatioField,
    image_size: imageSizeField,
    thinking_level: thinkingLevelField,
    enable_search: enableSearchField,
    enable_image_search: enableImageSearchField,
    response_format: responseFormatField,
  })
  .strict();

// =============================================================================
// Tool 3: nanobanana_multi_edit_start
// =============================================================================

export const MultiEditStartSchema = z
  .object({
    prompt: z
      .string()
      .min(1, "Prompt must not be empty")
      .max(32000, "Prompt exceeds maximum length")
      .describe(
        "Initial prompt for the multi-turn editing session. " +
        "This can be a text-to-image prompt (if no source_image_path) or an edit instruction " +
        "(if a source image is provided). The session will preserve full conversation history " +
        "for iterative refinement. " +
        "PROMPT OPTIMIZATION: Same golden rule as generate — describe scenes as narrative paragraphs, use the same template patterns. " +
        "Multi-edit is ideal for: progressive scene building (empty room -> add window -> add furniture -> add lighting), " +
        "iterative design (logo draft -> refine colors -> adjust text -> finalize), " +
        "style exploration (generate base -> try sketch -> try watercolor -> try oil painting)."
      ),
    source_image_path: z
      .string()
      .min(1, "Source image path must not be empty")
      .optional()
      .describe(
        "Optional absolute file path to a source image to start editing from. " +
        "If omitted, the session starts with text-to-image generation. " +
        "If provided, the session starts with an edit of this image. " +
        "Supported formats: PNG, JPEG, WebP, GIF."
      ),
    model: modelField,
    aspect_ratio: aspectRatioField,
    image_size: imageSizeField,
    thinking_level: thinkingLevelField,
    enable_search: enableSearchField,
    enable_image_search: enableImageSearchField,
    response_format: responseFormatField,
  })
  .strict();

// =============================================================================
// Tool 4: nanobanana_multi_edit_continue
// =============================================================================

export const MultiEditContinueSchema = z
  .object({
    session_id: z
      .string()
      .min(1, "Session ID must not be empty")
      .describe(
        "The session ID returned by nanobanana_multi_edit_start. " +
        "Use nanobanana_list_sessions to see active sessions if the ID is unknown."
      ),
    edit_instruction: z
      .string()
      .min(1, "Edit instruction must not be empty")
      .max(32000, "Edit instruction exceeds maximum length")
      .describe(
        "Description of the next edit to apply to the session's current image. " +
        "The full conversation history (all previous turns) is sent to the model, " +
        "so the instruction can reference previous changes. " +
        "Examples: 'now make the background blue', 'add more detail to the foreground', " +
        "'undo the last color change and try a warmer palette instead'."
      ),
  })
  .strict();

// =============================================================================
// Tool 5: nanobanana_multi_edit_end
// =============================================================================

export const MultiEditEndSchema = z
  .object({
    session_id: z
      .string()
      .min(1, "Session ID must not be empty")
      .describe(
        "The session ID to end. This frees the in-memory conversation history. " +
        "All previously saved images remain on disk. " +
        "Use nanobanana_list_sessions to find active session IDs."
      ),
  })
  .strict();

// =============================================================================
// Tool 6: nanobanana_list_sessions
// =============================================================================

export const ListSessionsSchema = z.object({}).strict();

// =============================================================================
// Tool 7: nanobanana_list_options
// =============================================================================

export const ListOptionsSchema = z.object({}).strict();

// =============================================================================
// Tool Descriptions (for registerTool)
// =============================================================================

export const TOOL_DESCRIPTIONS = {
  nanobanana_generate_image: `Generate an image from a text description using Google's Nano Banana (Gemini Image) API.

WHEN TO USE: When the user wants to create a new image from scratch. Trigger words: "draw", "generate", "create", "make an image", "picture of", "illustration of". Do NOT use this if the user provides a source image to edit (use nanobanana_edit_image instead) or wants iterative refinement (use nanobanana_multi_edit_start).

GOLDEN RULE (from Google): "Describe the scene, don't just list keywords. The model's core strength is its deep language understanding. A narrative, descriptive paragraph will almost always produce a better, more coherent image than a list of disconnected words."

PROMPT STRATEGY — Always expand short user requests using this structure:
1. Subject: What is the main subject? Add specificity (species, material, emotion, pose).
2. Setting/Environment: Where? Indoor/outdoor, time of day, weather, surroundings.
3. Lighting: Golden hour, studio, dramatic, soft diffused, neon, backlit, rim light.
4. Style: photorealistic, watercolor, oil painting, anime, 3D render, isometric, kawaii, Da Vinci sketch, cel-shading.
5. Composition: close-up, wide-angle, aerial, 45° isometric, overhead shot, bird's eye.
6. Mood: serene, dramatic, joyful, mysterious, nostalgic, energetic.
7. Camera (for photorealism): lens (85mm f/1.4, 50mm), depth of field (bokeh), shot type.
8. Color palette: warm earth tones, neon cyberpunk, pastel, monochrome, complementary.
9. Text (if needed): exact text in quotes, font style, placement, size.

REFERENCE PROMPTS FROM GOOGLE:
- Portrait: "A photorealistic close-up portrait of an elderly Japanese ceramicist with deep, sun-etched wrinkles and a warm, knowing smile. He is carefully inspecting a freshly glazed tea bowl. Set in his rustic, sun-drenched workshop. Illuminated by soft, golden hour light streaming through a window. Captured with an 85mm portrait lens with soft bokeh. Serene and masterful mood."
- Sticker: "A kawaii-style sticker of a happy red panda wearing a tiny bamboo hat, munching on a green bamboo leaf. Bold, clean outlines, simple cel-shading, vibrant color palette. The background must be white."
- Product: "A photo of a glossy magazine cover with the large bold words 'Nano Banana' in serif font. A portrait of a person in a sleek dress, playfully holding the number 2. Issue number and date in the corner with a barcode. The magazine is on a shelf against an orange plastered wall."
- Isometric: "A clear, 45° top-down isometric miniature 3D cartoon scene of London, featuring iconic landmarks. Soft, refined textures with PBR materials and gentle lifelike lighting. Title 'London' in large bold text at top-center, weather icon beneath, then date and temperature."
- Scientific: "Da Vinci style anatomical sketch of a dissected Monarch butterfly. Detailed drawings of the head, wings, and legs on textured parchment with notes in English."
- Data: "Visualize the current weather forecast for the next 5 days in San Francisco as a clean, modern weather chart. Add a visual on what I should wear each day." (with enable_search: true)

IMPORTANT NOTES:
- Transparent backgrounds are NOT supported — specify "white background" or a solid color.
- For text rendering, be explicit about exact text, font, placement, and size.
- For stickers/icons, always specify "background must be white" and include line/shading style.

AUTO-INFERENCE RULES:
- Phone wallpaper -> aspect_ratio: "9:16"
- Desktop wallpaper -> aspect_ratio: "16:9"
- YouTube thumbnail -> aspect_ratio: "16:9", image_size: "2K"
- Instagram post -> aspect_ratio: "4:5"
- Logo / icon / avatar -> aspect_ratio: "1:1"
- Print poster / high-res -> image_size: "4K"
- Quick draft / thumbnail -> image_size: "512"
- Real-world data / real places / current events -> enable_search: true
- Visual style reference / species accuracy -> enable_image_search: true
- Complex scene / detailed composition / text rendering -> thinking_level: "High" (NB2 only)

Returns: The saved image file path and any text the model generated alongside the image.`,

  nanobanana_edit_image: `Edit an existing image using a text instruction via Google's Nano Banana (Gemini Image) API.

WHEN TO USE: When the user provides a specific source image file and wants to modify it. The user must provide both an image path and an edit instruction. Do NOT use this for creating images from scratch (use nanobanana_generate_image) or for iterative multi-step editing (use nanobanana_multi_edit_start).

GOLDEN RULE: Describe edits as specific narrative instructions. Expand vague requests into detailed, actionable descriptions.

EDIT STRATEGIES:
- Style transfer: "Convert this to [style] with [specific characteristics]" — e.g., "pencil sketch with cross-hatching", "watercolor with soft bleeding edges", "oil painting with thick impasto brush strokes"
- Background change: "Replace the background with [detailed environment], keeping the [subject] unchanged"
- Object add/remove: "Add [specific object] at [position]" / "Remove [object] and fill naturally"
- Text overlay: "Add the text '[exact text]' in [font] at [position]"
- Enhancement: "Enhance [specific aspects]: improve [what], add [effects], adjust [tone]"
- Localization: "Update this to be in [language]. Do not change any other elements."
- Brand integration: "Put this logo on [product/context]. The logo is perfectly integrated into [surface]."
- Aspect ratio change: "Expand the scene to [wider/taller] composition showing [new elements]"

REFERENCE EDIT PROMPTS FROM GOOGLE:
- Brand: "Put this logo on a high-end ad for a banana scented perfume. The logo is perfectly integrated into the bottle."
- Localize: "Update this infographic to be in Spanish. Do not change any other elements of the image."
- Style mashup: "Make one person a pencil sketch, another claymation, keep the rest photorealistic."

AUTO-INFERENCE RULES: Same as generate_image for model, aspect_ratio, image_size, thinking_level, and search settings.

Returns: The saved edited image file path and any text the model generated.`,

  nanobanana_multi_edit_start: `Start a multi-turn image editing session for iterative refinement.

WHEN TO USE: When the user wants to make multiple rounds of changes to an image, refining it step by step. Use this instead of nanobanana_edit_image when the user signals iterative intent: "let's work on this", "I'll want to tweak it", "start an editing session", or when the task clearly requires multiple rounds of changes.

Do NOT use this for a single one-shot edit where the user does not need iterative refinement (use nanobanana_edit_image instead).

Can start from:
1. Text only (no source_image_path): generates an initial image, then allows edits
2. Source image + prompt: applies first edit, then allows further edits

The session preserves full conversation history including thought_signatures for optimal multi-turn results.

PROMPT OPTIMIZATION: Same rules as generate_image for the initial prompt.

Sessions expire after 30 minutes of inactivity.

Returns: Session ID (needed for continue/end calls), saved image path, and model text.`,

  nanobanana_multi_edit_continue: `Continue editing within an active multi-turn session.

WHEN TO USE: After nanobanana_multi_edit_start has created a session. The user provides a new edit instruction and the session ID. The full conversation history is sent to the model, enabling context-aware edits that can reference previous changes.

Examples of good edit instructions:
- "now change the background to a sunset"
- "make the text larger and bolder"
- "undo the color change and try a cooler palette"
- "add more detail to the character's face"

Returns: Updated image path, turn count, and any model text.`,

  nanobanana_multi_edit_end: `End a multi-turn editing session and free its memory.

WHEN TO USE: When the user is done editing and wants to close the session, or when they explicitly say "done", "finish", "end session". All previously saved images remain on disk — only the in-memory conversation history is freed.

Returns: Session summary with total turns completed.`,

  nanobanana_list_sessions: `List all active multi-turn editing sessions.

WHEN TO USE: When the user asks about in-progress editing work, wants to find a session ID, or asks "what sessions are active". Also useful before multi_edit_continue if the session ID is unknown.

Returns: List of active sessions with IDs, models, turn counts, and timestamps.`,

  nanobanana_list_options: `List all available models, parameters, and their compatibility.

WHEN TO USE: When the user asks "what models are available", "what options do I have", "what aspect ratios are supported", or needs guidance on parameter selection. Also useful for understanding which features work with which models.

Returns: Complete list of models (with feature flags), aspect ratios, image sizes, thinking levels, and the full parameter compatibility matrix.`,
} as const;
