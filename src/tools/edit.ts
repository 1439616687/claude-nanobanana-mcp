// =============================================================================
// nanobanana-mcp-server — Tool Handler: nanobanana_edit_image
// =============================================================================

import { editImage } from "../services/gemini-client.js";
import { readImageAsBase64, saveBase64Image } from "../services/image-handler.js";
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
  EditImageParams,
  ToolResult,
} from "../types.js";

/**
 * Handler for the nanobanana_edit_image tool.
 *
 * Edits an existing image using a text instruction via the Gemini API.
 */
export async function handleEditImage(
  params: EditImageParams,
): Promise<ToolResult> {
  try {
    // 1. Read source image from disk
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

    // 2. Validate parameter compatibility
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

    // 3. Build generation config and tools config
    const generationConfig = buildGenerationConfig(
      params.model,
      params.image_size,
      params.aspect_ratio,
      params.thinking_level,
    );
    const tools = buildToolsConfig(params.enable_search, params.enable_image_search);

    // 4. Call Gemini API to edit the image
    const response = await editImage(
      sourceImage.data,
      sourceImage.mimeType,
      params.edit_instruction,
      params.model,
      generationConfig,
      tools,
    );

    // 5. Extract parts from response (handles API errors, safety blocks, empty responses)
    const extraction = extractCandidateParts(response, "Image edit");
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
              ? `The model did not generate an edited image but returned text: ${truncateText(modelText)}`
              : "Error: The model did not return an edited image. Try a different edit instruction or model.",
          },
        ],
        isError: !modelText,
      };
    }

    // 7. Save edited image to disk
    const imagePath = await saveBase64Image(imageData.data, "edited");

    // 8. Extract model text
    const modelText = extractModelText(parts);

    // 9. Build structured content
    const structuredContent: Record<string, unknown> = {
      image_path: imagePath,
      source_image_path: params.source_image_path,
      model_used: params.model,
      edit_instruction: params.edit_instruction,
    };
    if (modelText) {
      structuredContent.model_text = modelText;
    }

    // 10. Build human-readable text content
    let textContent: string;
    if (params.response_format === "json") {
      textContent = truncateText(JSON.stringify(structuredContent, null, 2));
    } else {
      const lines: string[] = [
        `**Image Edited Successfully**`,
        ``,
        `**Output Image:** ${imagePath}`,
        `**Source Image:** ${params.source_image_path}`,
        `**Model:** ${params.model}`,
        `**Edit Instruction:** ${params.edit_instruction}`,
      ];
      if (modelText) {
        lines.push(``, `**Model Response:**`, truncateText(modelText));
      }
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
