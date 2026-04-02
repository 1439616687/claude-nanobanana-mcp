// =============================================================================
// nanobanana-mcp-server — Gemini REST API Client
// =============================================================================

import { API_BASE_URL } from "../constants.js";
import { formatErrorResponse } from "./shared-utils.js";

import type {
  GenerationConfig,
  GeminiContent,
  GeminiResponseBody,
  GeminiSearchTool,
} from "../types.js";

// -----------------------------------------------------------------------------
// Internal Helpers
// -----------------------------------------------------------------------------

/**
 * Reads the GEMINI_API_KEY from the environment.
 * Throws immediately if the key is missing or empty.
 */
function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not set. " +
        "Obtain a key from https://aistudio.google.com/apikey and set it in your environment.",
    );
  }
  return key;
}

/**
 * Constructs the full endpoint URL for a given model ID.
 */
function buildRequestUrl(modelId: string): string {
  return `${API_BASE_URL}/${modelId}:generateContent`;
}

/**
 * Builds the request body, omitting `tools` when it is undefined so the
 * field doesn't appear in the serialized JSON.
 */
function buildRequestBody(
  contents: GeminiContent[],
  generationConfig: GenerationConfig,
  tools?: GeminiSearchTool[],
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    contents,
    generationConfig,
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
  }
  return body;
}

/**
 * Sends the POST request and returns the parsed response body.
 * Throws on network errors; returns the body (which may contain an `error`
 * field) on HTTP errors so the caller can inspect it.
 */
async function sendRequest(
  url: string,
  body: Record<string, unknown>,
): Promise<GeminiResponseBody> {
  const apiKey = getApiKey();

  console.error(`[gemini-client] POST ${url}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const responseBody = (await response.json()) as GeminiResponseBody;

  if (!response.ok) {
    // The response body already has the error structure; log and return it.
    const errMsg = responseBody.error
      ? formatErrorResponse(responseBody.error)
      : `HTTP ${response.status}: ${response.statusText}`;
    console.error(`[gemini-client] API error: ${errMsg}`);
    return responseBody;
  }

  return responseBody;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Generates an image from a text prompt.
 *
 * @param prompt        - The text prompt describing the desired image.
 * @param model         - Gemini model ID to use.
 * @param config        - GenerationConfig (responseModalities, imageConfig, thinkingConfig).
 * @param tools         - Optional search tools array.
 * @returns Parsed, thought-filtered GeminiResponseBody.
 */
export async function generateImage(
  prompt: string,
  model: string,
  config: GenerationConfig,
  tools?: GeminiSearchTool[],
): Promise<GeminiResponseBody> {
  const contents: GeminiContent[] = [
    {
      role: "user",
      parts: [{ text: prompt }],
    },
  ];

  const url = buildRequestUrl(model);
  const body = buildRequestBody(contents, config, tools);
  const response = await sendRequest(url, body);

  return response;
}

/**
 * Edits an existing image using a text instruction.
 *
 * @param imageBase64   - Base64-encoded image data (no data URI prefix).
 * @param mimeType      - MIME type of the source image (e.g., "image/png").
 * @param instruction   - Text instruction describing the desired edit.
 * @param model         - Gemini model ID to use.
 * @param config        - GenerationConfig.
 * @param tools         - Optional search tools array.
 * @returns Parsed, thought-filtered GeminiResponseBody.
 */
export async function editImage(
  imageBase64: string,
  mimeType: string,
  instruction: string,
  model: string,
  config: GenerationConfig,
  tools?: GeminiSearchTool[],
): Promise<GeminiResponseBody> {
  const contents: GeminiContent[] = [
    {
      role: "user",
      parts: [
        { text: instruction },
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64,
          },
        },
      ],
    },
  ];

  const url = buildRequestUrl(model);
  const body = buildRequestBody(contents, config, tools);
  const response = await sendRequest(url, body);

  return response;
}

/**
 * Sends a multi-turn conversation to Gemini, preserving the full history
 * (including thought_signature parts from prior model responses).
 *
 * @param contents      - Full conversation history as a GeminiContent array.
 * @param model         - Gemini model ID to use.
 * @param config        - GenerationConfig.
 * @param tools         - Optional search tools array.
 * @returns Parsed, thought-filtered GeminiResponseBody.
 */
export async function multiTurnGenerate(
  contents: GeminiContent[],
  model: string,
  config: GenerationConfig,
  tools?: GeminiSearchTool[],
): Promise<GeminiResponseBody> {
  const url = buildRequestUrl(model);
  const body = buildRequestBody(contents, config, tools);
  const response = await sendRequest(url, body);

  return response;
}
