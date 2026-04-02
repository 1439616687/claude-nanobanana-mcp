// =============================================================================
// nanobanana-mcp-server — Tool Handlers: Multi-Turn Editing
//   nanobanana_multi_edit_start
//   nanobanana_multi_edit_continue
//   nanobanana_multi_edit_end
// =============================================================================

import { generateImage, multiTurnGenerate } from "../services/gemini-client.js";
import { readImageAsBase64, saveBase64Image } from "../services/image-handler.js";
import {
  createSession,
  getSession,
  appendToSession,
  deleteSession,
} from "../services/session-manager.js";
import {
  validateParameterCompatibility,
  buildGenerationConfig,
  buildToolsConfig,
  formatErrorResponse,
  truncateText,
  extractModelText,
  extractImageData,
  extractCandidateParts,
} from "../services/shared-utils.js";

import type {
  MultiEditStartParams,
  MultiEditContinueParams,
  MultiEditEndParams,
  ToolResult,
  GeminiPart,
  GeminiContent,
} from "../types.js";

/**
 * Counts conversation turns (user messages) in a session's contents.
 */
function countTurns(contents: GeminiContent[]): number {
  return contents.filter((c) => c.role === "user").length;
}

// =============================================================================
// Handler: nanobanana_multi_edit_start
// =============================================================================

/**
 * Starts a multi-turn image editing session.
 *
 * Can start from text only (generating an initial image) or from
 * a source image + edit prompt.
 */
export async function handleMultiEditStart(
  params: MultiEditStartParams,
): Promise<ToolResult> {
  try {
    // 1. Validate parameter compatibility
    const validation = validateParameterCompatibility(
      params.model,
      params.image_size,
      params.aspect_ratio,
      params.enable_image_search,
      params.thinking_level,
    );
    if (!validation.valid) {
      return {
        content: [{ type: "text" as const, text: `Error: ${validation.error}` }],
        isError: true,
      };
    }

    // 2. Build generation config and tools config
    const generationConfig = buildGenerationConfig(
      params.model,
      params.image_size,
      params.aspect_ratio,
      params.thinking_level,
    );
    const tools = buildToolsConfig(params.enable_search, params.enable_image_search);

    // 3. Build initial user content parts
    const userParts: GeminiPart[] = [];

    // If a source image is provided, load it and include as inline_data
    if (params.source_image_path) {
      let sourceImage: { data: string; mimeType: string };
      try {
        sourceImage = await readImageAsBase64(params.source_image_path);
      } catch (readError: unknown) {
        const message =
          readError instanceof Error ? readError.message : String(readError);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Could not read source image at "${params.source_image_path}". ${message}`,
            },
          ],
          isError: true,
        };
      }
      userParts.push({
        inlineData: {
          mimeType: sourceImage.mimeType,
          data: sourceImage.data,
        },
      });
    }

    userParts.push({ text: params.prompt });

    const userContent: GeminiContent = { role: "user", parts: userParts };
    const initialContents: GeminiContent[] = [userContent];

    // 4. Call the Gemini API
    let response;
    if (params.source_image_path) {
      // Multi-turn style call when we have image + text
      response = await multiTurnGenerate(
        initialContents,
        params.model,
        generationConfig,
        tools,
      );
    } else {
      // Text-only generation for the first turn
      response = await generateImage(
        params.prompt,
        params.model,
        generationConfig,
        tools,
      );
    }

    // 5. Extract parts from response (handles API errors, safety blocks, empty responses)
    const extraction = extractCandidateParts(response, "Image generation");
    if ("error" in extraction) {
      return {
        content: [{ type: "text" as const, text: extraction.error }],
        isError: true,
      };
    }
    const parts = extraction.parts;

    // 6. Extract image data
    const imageData = extractImageData(parts);
    if (!imageData) {
      const modelText = extractModelText(parts);
      return {
        content: [
          {
            type: "text" as const,
            text: modelText
              ? `The model did not generate an image but returned text: ${truncateText(modelText)}`
              : "Error: The model did not return an image. Try a more descriptive prompt.",
          },
        ],
        isError: !modelText,
      };
    }

    // 7. Save the generated image
    const imagePath = await saveBase64Image(imageData.data, "multi-edit");

    // 8. Create session with the conversation history
    // Build the model response content (preserve ALL parts for thought_signature)
    const modelContent: GeminiContent = {
      role: "model",
      parts,
    };

    const { sessionId } = createSession(params.model, initialContents, generationConfig, tools, params.response_format);
    appendToSession(sessionId, modelContent);

    // 9. Extract model text
    const modelText = extractModelText(parts);

    // 10. Build structured content
    const structuredContent: Record<string, unknown> = {
      session_id: sessionId,
      image_path: imagePath,
      model_used: params.model,
      turn_count: 1,
    };
    if (modelText) {
      structuredContent.model_text = modelText;
    }

    // 11. Build text content
    let textContent: string;
    if (params.response_format === "json") {
      textContent = truncateText(JSON.stringify(structuredContent, null, 2));
    } else {
      const lines: string[] = [
        `**Multi-Edit Session Started**`,
        ``,
        `**Session ID:** ${sessionId}`,
        `**Image Path:** ${imagePath}`,
        `**Model:** ${params.model}`,
        `**Turn:** 1`,
      ];
      if (params.source_image_path) {
        lines.push(`**Source Image:** ${params.source_image_path}`);
      }
      if (modelText) {
        lines.push(``, `**Model Response:**`, truncateText(modelText));
      }
      lines.push(
        ``,
        `Use \`nanobanana_multi_edit_continue\` with session_id "${sessionId}" to continue editing.`,
      );
      textContent = lines.join("\n");
    }

    return {
      content: [
        { type: "text" as const, text: textContent },
        { type: "image" as const, data: imageData.data, mimeType: imageData.mimeType },
      ],
      structuredContent,
    };
  } catch (error: unknown) {
    return {
      content: [{ type: "text" as const, text: formatErrorResponse(error) }],
      isError: true,
    };
  }
}

// =============================================================================
// Handler: nanobanana_multi_edit_continue
// =============================================================================

/**
 * Continues editing within an existing multi-turn session.
 *
 * Builds the full conversation history locally, sends it to the model,
 * and only appends turns to the session after a successful API response.
 * This prevents session corruption on API failures.
 */
export async function handleMultiEditContinue(
  params: MultiEditContinueParams,
): Promise<ToolResult> {
  try {
    // 1. Retrieve the session
    const session = getSession(params.session_id);
    if (!session) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: Session "${params.session_id}" not found. It may have expired or been ended. ` +
              `Use nanobanana_list_sessions to see active sessions, or nanobanana_multi_edit_start to begin a new session.`,
          },
        ],
        isError: true,
      };
    }

    // 2. Build the new user content (do NOT append to session yet)
    const userContent: GeminiContent = {
      role: "user",
      parts: [{ text: params.edit_instruction }],
    };

    // 3. Build full conversation history including the new user turn
    const fullContents: GeminiContent[] = [...session.contents, userContent];

    // 4. Retrieve generation config and tools from the session
    const { generationConfig, tools } = session;

    // 5. Call the Gemini API with the full conversation history
    const response = await multiTurnGenerate(
      fullContents,
      session.modelId,
      generationConfig,
      tools,
    );

    // 6. Extract parts from response
    const extraction = extractCandidateParts(response, "Edit");
    if ("error" in extraction) {
      return {
        content: [{ type: "text" as const, text: extraction.error }],
        isError: true,
      };
    }
    const parts = extraction.parts;

    // 7. API succeeded — now append both turns to session
    appendToSession(params.session_id, userContent);
    const modelContent: GeminiContent = {
      role: "model",
      parts,
    };
    appendToSession(params.session_id, modelContent);

    // 8. Extract image data
    const imageData = extractImageData(parts);
    if (!imageData) {
      const modelText = extractModelText(parts);
      return {
        content: [
          {
            type: "text" as const,
            text: modelText
              ? `The model did not generate an edited image but returned text: ${truncateText(modelText)}`
              : "Error: The model did not return an edited image. Try a different edit instruction.",
          },
        ],
        isError: !modelText,
      };
    }

    // 9. Save the edited image
    const imagePath = await saveBase64Image(imageData.data, "multi-edit");

    // 10. Extract model text and count turns
    const modelText = extractModelText(parts);
    const turnCount = countTurns(session.contents);

    // 11. Build structured content
    const structuredContent: Record<string, unknown> = {
      session_id: params.session_id,
      image_path: imagePath,
      model_used: session.modelId,
      turn_count: turnCount,
    };
    if (modelText) {
      structuredContent.model_text = modelText;
    }

    // 12. Build text content
    let textContent: string;
    if (session.responseFormat === "json") {
      textContent = truncateText(JSON.stringify(structuredContent, null, 2));
    } else {
      const lines: string[] = [
        `**Multi-Edit Continue (Turn ${turnCount})**`,
        ``,
        `**Session ID:** ${params.session_id}`,
        `**Image Path:** ${imagePath}`,
        `**Model:** ${session.modelId}`,
        `**Turn:** ${turnCount}`,
        `**Edit:** ${params.edit_instruction}`,
      ];
      if (modelText) {
        lines.push(``, `**Model Response:**`, truncateText(modelText));
      }
      lines.push(
        ``,
        `Use \`nanobanana_multi_edit_continue\` to keep editing, or \`nanobanana_multi_edit_end\` to finish.`,
      );
      textContent = lines.join("\n");
    }

    return {
      content: [
        { type: "text" as const, text: textContent },
        { type: "image" as const, data: imageData.data, mimeType: imageData.mimeType },
      ],
      structuredContent,
    };
  } catch (error: unknown) {
    return {
      content: [{ type: "text" as const, text: formatErrorResponse(error) }],
      isError: true,
    };
  }
}

// =============================================================================
// Handler: nanobanana_multi_edit_end
// =============================================================================

/**
 * Ends a multi-turn editing session and frees its in-memory history.
 * All saved images remain on disk.
 */
export async function handleMultiEditEnd(
  params: MultiEditEndParams,
): Promise<ToolResult> {
  try {
    // 1. Get session info before deleting (for the summary)
    const session = getSession(params.session_id);
    const totalTurns = session ? countTurns(session.contents) : 0;

    // 2. Delete the session
    const deleted = deleteSession(params.session_id);

    if (!deleted) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: Session "${params.session_id}" not found. It may have already been ended or expired. ` +
              `Use nanobanana_list_sessions to see active sessions.`,
          },
        ],
        isError: true,
      };
    }

    // 3. Build structured content
    const structuredContent: Record<string, unknown> = {
      success: true,
      session_id: params.session_id,
      total_turns: totalTurns,
    };

    // 4. Build human-readable text content
    const textContent = [
      `**Multi-Edit Session Ended**`,
      ``,
      `**Session ID:** ${params.session_id}`,
      `**Total Turns:** ${totalTurns}`,
      ``,
      `The session's conversation history has been freed from memory. All previously saved images remain on disk.`,
    ].join("\n");

    return {
      content: [{ type: "text" as const, text: textContent }],
      structuredContent,
    };
  } catch (error: unknown) {
    return {
      content: [{ type: "text" as const, text: formatErrorResponse(error) }],
      isError: true,
    };
  }
}
