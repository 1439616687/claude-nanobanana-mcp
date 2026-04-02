// =============================================================================
// nanobanana-mcp-server — Tool Handler: nanobanana_generate_image
// =============================================================================

import { generateImage } from "../services/gemini-client.js";
import { saveBase64Image } from "../services/image-handler.js";
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
  GenerateImageParams,
  ToolResult,
} from "../types.js";

/**
 * Handler for the nanobanana_generate_image tool.
 *
 * Generates an image from a text prompt using the Gemini image generation API.
 */
export async function handleGenerateImage(
  params: GenerateImageParams,
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

    // 3. Call Gemini API to generate the image
    const response = await generateImage(
      params.prompt,
      params.model,
      generationConfig,
      tools,
    );

    // 4. Extract parts from response (handles API errors, safety blocks, empty responses)
    const extraction = extractCandidateParts(response, "Image generation");
    if ("error" in extraction) {
      return {
        content: [{ type: "text" as const, text: extraction.error }],
        isError: true,
      };
    }
    const parts = extraction.parts;

    // 5. Extract image data
    const imageData = extractImageData(parts);
    if (!imageData) {
      const modelText = extractModelText(parts);
      return {
        content: [
          {
            type: "text" as const,
            text: modelText
              ? `The model did not generate an image but returned text: ${truncateText(modelText)}`
              : "Error: The model did not return an image. Try a more descriptive prompt or a different model.",
          },
        ],
        isError: !modelText,
      };
    }

    // 6. Save image to disk
    const imagePath = await saveBase64Image(imageData.data, "generated");

    // 7. Extract model text (non-thought, non-image parts)
    const modelText = extractModelText(parts);

    // 8. Build structured content
    const structuredContent: Record<string, unknown> = {
      image_path: imagePath,
      model_used: params.model,
      aspect_ratio: params.aspect_ratio,
      image_size: params.image_size,
      prompt: params.prompt,
    };
    if (modelText) {
      structuredContent.model_text = modelText;
    }

    // 9. Build human-readable text content
    let textContent: string;
    if (params.response_format === "json") {
      textContent = truncateText(JSON.stringify(structuredContent, null, 2));
    } else {
      const lines: string[] = [
        `**Image Generated Successfully**`,
        ``,
        `**Image Path:** ${imagePath}`,
        `**Model:** ${params.model}`,
        `**Aspect Ratio:** ${params.aspect_ratio}`,
        `**Image Size:** ${params.image_size}`,
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
