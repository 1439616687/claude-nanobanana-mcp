// =============================================================================
// nanobanana-mcp-server — Shared Utility Functions
// =============================================================================

import {
  MODEL_IDS,
  PARAMETER_COMPATIBILITY,
  CHARACTER_LIMIT,
} from "../constants.js";

import type {
  GenerationConfig,
  GeminiSearchTool,
  GeminiPart,
  ImageConfig,
  ThinkingConfig,
  ValidationResult,
  GeminiResponseBody,
} from "../types.js";

// -----------------------------------------------------------------------------
// Parameter Compatibility Validation
// -----------------------------------------------------------------------------

/**
 * Validates that the given parameter combination is compatible with the
 * selected model.  Returns { valid: true } when everything checks out, or
 * { valid: false, error: "..." } with an actionable fix suggestion.
 */
export function validateParameterCompatibility(
  model: string,
  imageSize: string,
  enableImageSearch: boolean,
  thinkingLevel: string,
): ValidationResult {
  const compat = PARAMETER_COMPATIBILITY[model];

  // Unknown model — should not happen if Zod validated, but guard anyway
  if (!compat) {
    return {
      valid: false,
      error: `Unknown model "${model}". Use one of: ${Object.values(MODEL_IDS).join(", ")}`,
    };
  }

  // Rule 1: imageSize "512" requires Nano Banana 2
  if (imageSize === "512" && !compat.imageSize512) {
    return {
      valid: false,
      error:
        `Image size "512" is only available with Nano Banana 2 (${MODEL_IDS.NANO_BANANA_2}). ` +
        `Either switch to model "${MODEL_IDS.NANO_BANANA_2}" or choose a different image size (1K, 2K, 4K).`,
    };
  }

  // Rule 2: thinkingLevel "High" only supported by Nano Banana 2
  if (thinkingLevel === "High" && !compat.thinkingHigh) {
    return {
      valid: false,
      error:
        `Thinking level "High" is only supported by Nano Banana 2 (${MODEL_IDS.NANO_BANANA_2}). ` +
        `Either switch to model "${MODEL_IDS.NANO_BANANA_2}" or use thinking level "minimal".`,
    };
  }

  // Rule 3: Image search requires Nano Banana 2
  if (enableImageSearch && !compat.imageSearch) {
    return {
      valid: false,
      error:
        `Image search grounding is only available with Nano Banana 2 (${MODEL_IDS.NANO_BANANA_2}). ` +
        `Either switch to model "${MODEL_IDS.NANO_BANANA_2}" or disable image search.`,
    };
  }

  return { valid: true };
}

// -----------------------------------------------------------------------------
// Generation Config Builder
// -----------------------------------------------------------------------------

/**
 * Constructs the generationConfig object for a Gemini API request.
 * Always includes responseModalities; imageConfig and thinkingConfig are
 * added only when non-default values are supplied.
 */
export function buildGenerationConfig(
  imageSize?: string,
  aspectRatio?: string,
  thinkingLevel?: string,
): GenerationConfig {
  const config: GenerationConfig = {
    responseModalities: ["TEXT", "IMAGE"],
  };

  // Build imageConfig if either value is provided
  if (imageSize || aspectRatio) {
    const imageConfig: ImageConfig = {};
    if (aspectRatio) {
      imageConfig.aspectRatio = aspectRatio;
    }
    if (imageSize) {
      imageConfig.imageSize = imageSize;
    }
    config.imageConfig = imageConfig;
  }

  // Build thinkingConfig if a non-minimal level is requested
  if (thinkingLevel && thinkingLevel !== "minimal") {
    const thinkingConfig: ThinkingConfig = {
      thinkingLevel,
      includeThoughts: true,
    };
    config.thinkingConfig = thinkingConfig;
  }

  return config;
}

// -----------------------------------------------------------------------------
// Tools Config Builder
// -----------------------------------------------------------------------------

/**
 * Constructs the `tools` array for the Gemini API request based on search
 * flags.  Returns undefined when no search is requested so the field can be
 * omitted from the request body.
 *
 * Rule 4: If image search is enabled, web search is implied — the config
 * includes both webSearch and imageSearch.
 */
export function buildToolsConfig(
  enableSearch: boolean,
  enableImageSearch: boolean,
): GeminiSearchTool[] | undefined {
  // Image search implies web search
  if (enableImageSearch) {
    return [
      {
        google_search: {
          searchTypes: {
            webSearch: {},
            imageSearch: {},
          },
        },
      },
    ];
  }

  if (enableSearch) {
    return [{ google_search: {} }];
  }

  return undefined;
}

// -----------------------------------------------------------------------------
// Candidate Parts Extraction
// -----------------------------------------------------------------------------

/**
 * Extracts parts from the first candidate in a Gemini API response.
 * Handles API-level errors, safety blocks, and empty responses in one place.
 *
 * @param response - The raw Gemini API response body.
 * @param context  - Human-readable context for error messages (e.g., "Image generation", "Image edit").
 * @returns Object with `parts` on success, or `error` string on failure.
 */
export function extractCandidateParts(
  response: GeminiResponseBody,
  context: string,
): { parts: GeminiPart[] } | { error: string } {
  // Handle API-level errors
  if (response.error) {
    return { error: formatErrorResponse(response.error) };
  }

  // Extract parts from first candidate
  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts) {
    if (candidate?.finishReason === "SAFETY") {
      return {
        error: `Error: ${context} was blocked by safety filters. Try rephrasing your prompt to avoid potentially sensitive content.`,
      };
    }
    return {
      error: `Error: The model returned no content. Try a more descriptive prompt or a different model.`,
    };
  }

  return { parts: candidate.content.parts };
}

// -----------------------------------------------------------------------------
// Error Formatting
// -----------------------------------------------------------------------------

/**
 * Extracts an actionable message from an API error or unknown thrown value.
 * Provides specific fix suggestions based on known HTTP status codes.
 */
export function formatErrorResponse(error: unknown): string {
  // Handle structured Gemini API error objects
  if (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    "message" in error
  ) {
    const apiError = error as { code: number; message: string; status?: string };
    return formatApiErrorByCode(apiError.code, apiError.message);
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  // Handle string errors
  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred. Please try again.";
}

// -----------------------------------------------------------------------------
// Text / Image Extraction Helpers
// -----------------------------------------------------------------------------

/**
 * Truncates text to the given limit with an indicator when exceeded.
 */
export function truncateText(text: string, limit: number = CHARACTER_LIMIT): string {
  if (text.length <= limit) return text;
  return (
    text.substring(0, limit - 100) +
    `\n\n[Response truncated. Original length: ${text.length} chars]`
  );
}

/**
 * Extracts non-thought text parts from a list of Gemini response parts.
 */
export function extractModelText(parts: GeminiPart[]): string {
  return parts
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text as string)
    .join("\n")
    .trim();
}

/**
 * Finds the first non-thought inline image part from a list of Gemini response parts.
 */
export function extractImageData(
  parts: GeminiPart[],
): { data: string; mimeType: string } | null {
  for (const part of parts) {
    if (part.inlineData && !part.thought) {
      return { data: part.inlineData.data, mimeType: part.inlineData.mimeType };
    }
  }
  return null;
}

/**
 * Maps HTTP status codes to actionable user-facing messages.
 */
function formatApiErrorByCode(code: number, message: string): string {
  switch (code) {
    case 400:
      if (message.toLowerCase().includes("safety")) {
        return (
          `Image generation was blocked by safety filters: ${message}. ` +
          `Try rephrasing your prompt to avoid potentially sensitive content.`
        );
      }
      return (
        `Bad request (400): ${message}. ` +
        `Check that your parameters are valid and the prompt is well-formed.`
      );

    case 403:
      return (
        `Authentication failed (403): ${message}. ` +
        `Verify that GEMINI_API_KEY is set correctly and has not expired.`
      );

    case 429:
      return (
        `Rate limit exceeded (429): ${message}. ` +
        `Wait a moment before retrying, or reduce the frequency of requests.`
      );

    case 500:
      return (
        `Gemini server error (500): ${message}. ` +
        `This is a temporary issue on Google's side. Please retry in a few seconds.`
      );

    case 503:
      return (
        `Gemini service is temporarily overloaded (503): ${message}. ` +
        `Please wait a moment and try again.`
      );

    default:
      return `Gemini API error (${code}): ${message}.`;
  }
}
