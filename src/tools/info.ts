// =============================================================================
// nanobanana-mcp-server — Tool Handlers: Info Tools
//   nanobanana_list_options
//   nanobanana_list_sessions
// =============================================================================

import { listSessions } from "../services/session-manager.js";
import {
  MODEL_IDS,
  MODEL_ID_VALUES,
  SUPPORTED_ASPECT_RATIOS,
  SUPPORTED_IMAGE_SIZES,
  SUPPORTED_THINKING_LEVELS,
  PARAMETER_COMPATIBILITY,
} from "../constants.js";
import { formatErrorResponse, truncateText } from "../services/shared-utils.js";

import type {
  ToolResult,
  ListOptionsOutput,
  ListSessionsOutput,
  SessionSummary,
} from "../types.js";

/**
 * Maps a model ID to a human-readable name.
 */
function modelDisplayName(modelId: string): string {
  switch (modelId) {
    case MODEL_IDS.NANO_BANANA_2:
      return "Nano Banana 2";
    case MODEL_IDS.NANO_BANANA_PRO:
      return "Nano Banana Pro";
    default:
      return modelId;
  }
}

/**
 * Builds a list of feature strings for a given model.
 */
function modelFeatures(modelId: string): string[] {
  const compat = PARAMETER_COMPATIBILITY[modelId];
  if (!compat) return [];

  const features: string[] = [];
  if (compat.imageSize512) features.push("512px resolution");
  if (compat.thinkingHigh) features.push("High thinking level");
  if (compat.imageSearch) features.push("Image search grounding");
  features.push(`Up to ${compat.maxRefImages} reference images`);
  features.push("Web search grounding");
  features.push("All 14 aspect ratios");
  return features;
}

function modelRecommendation(modelId: string): string {
  switch (modelId) {
    case MODEL_IDS.NANO_BANANA_2:
      return "Best for: speed, high-volume generation, quick iteration, thumbnails, and drafts";
    case MODEL_IDS.NANO_BANANA_PRO:
      return "Best for: complex compositions, faithful text rendering, photorealistic scenes, and tasks requiring deep reasoning";
    default:
      return "";
  }
}

// =============================================================================
// Handler: nanobanana_list_options
// =============================================================================

/**
 * Lists all available models, parameters, and their compatibility.
 */
export async function handleListOptions(): Promise<ToolResult> {
  try {
    // Build models info
    const models = MODEL_ID_VALUES.map((id) => ({
      id,
      name: modelDisplayName(id),
      features: modelFeatures(id),
      recommended_for: modelRecommendation(id),
    }));

    // Build parameter compatibility matrix
    const parameterCompatibility: Record<string, Record<string, boolean>> = {};
    for (const modelId of MODEL_ID_VALUES) {
      const compat = PARAMETER_COMPATIBILITY[modelId];
      if (compat) {
        parameterCompatibility[modelId] = {
          "imageSize_512": compat.imageSize512,
          "thinkingLevel_High": compat.thinkingHigh,
          "enable_image_search": compat.imageSearch,
        };
      }
    }

    const structuredContent: ListOptionsOutput = {
      models,
      aspect_ratios: [...SUPPORTED_ASPECT_RATIOS],
      image_sizes: [...SUPPORTED_IMAGE_SIZES],
      thinking_levels: [...SUPPORTED_THINKING_LEVELS],
      parameter_compatibility: parameterCompatibility,
    };

    // Build human-readable markdown
    const lines: string[] = [
      `# Nano Banana Image Generation Options`,
      ``,
      `## Models`,
      ``,
    ];

    for (const model of models) {
      lines.push(`### ${model.name}`);
      lines.push(`- **ID:** \`${model.id}\``);
      lines.push(`- **Features:** ${model.features.join(", ")}`);
      lines.push(`- **Recommended for:** ${model.recommended_for}`);
      lines.push(``);
    }

    lines.push(`## Aspect Ratios`);
    lines.push(``);
    lines.push(`Available: ${SUPPORTED_ASPECT_RATIOS.join(", ")}`);
    lines.push(`All 14 aspect ratios are supported by all models.`);
    lines.push(``);
    lines.push(`**Auto-inference hints:**`);
    lines.push(`- Phone wallpaper: \`9:16\``);
    lines.push(`- Desktop wallpaper: \`16:9\``);
    lines.push(`- Instagram post: \`4:5\``);
    lines.push(`- YouTube thumbnail: \`16:9\``);
    lines.push(`- Logo/icon/avatar: \`1:1\``);
    lines.push(`- Ultrawide/cinematic: \`21:9\``);
    lines.push(`- Portrait photo: \`2:3\` or \`3:4\``);
    lines.push(`- Landscape photo: \`3:2\` or \`4:3\``);
    lines.push(``);

    lines.push(`## Image Sizes`);
    lines.push(``);
    lines.push(`Available: ${SUPPORTED_IMAGE_SIZES.join(", ")}`);
    lines.push(``);
    lines.push(`- **512**: Fast drafts/thumbnails (Nano Banana 2 only)`);
    lines.push(`- **1K**: Standard quality, good for most uses (default)`);
    lines.push(`- **2K**: High quality for detailed images`);
    lines.push(`- **4K**: Maximum quality for print/large display`);
    lines.push(``);

    lines.push(`## Thinking Levels`);
    lines.push(``);
    lines.push(`Available: ${SUPPORTED_THINKING_LEVELS.join(", ")}`);
    lines.push(``);
    lines.push(`- **minimal**: Faster, suitable for straightforward prompts (default)`);
    lines.push(`- **High**: Deeper reasoning for complex scenes, detailed compositions, text rendering`);
    lines.push(`  - Only supported by Nano Banana 2 (${MODEL_IDS.NANO_BANANA_2})`);
    lines.push(``);

    lines.push(`## Parameter Compatibility`);
    lines.push(``);
    lines.push(`| Feature | Nano Banana 2 | Nano Banana Pro |`);
    lines.push(`|---------|:---:|:---:|`);

    const nb2 = PARAMETER_COMPATIBILITY[MODEL_IDS.NANO_BANANA_2];
    const nbPro = PARAMETER_COMPATIBILITY[MODEL_IDS.NANO_BANANA_PRO];

    if (nb2 && nbPro) {
      const yn = (v: boolean): string => (v ? "Yes" : "No");
      lines.push(`| 512 image size | ${yn(nb2.imageSize512)} | ${yn(nbPro.imageSize512)} |`);
      lines.push(`| High thinking | ${yn(nb2.thinkingHigh)} | ${yn(nbPro.thinkingHigh)} |`);
      lines.push(`| Image search | ${yn(nb2.imageSearch)} | ${yn(nbPro.imageSearch)} |`);
      lines.push(`| Max ref images | ${nb2.maxRefImages} | ${nbPro.maxRefImages} |`);
    }

    const textContent = truncateText(lines.join("\n"));

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

// =============================================================================
// Handler: nanobanana_list_sessions
// =============================================================================

/**
 * Lists all active multi-turn editing sessions.
 */
export async function handleListSessions(): Promise<ToolResult> {
  try {
    const sessionSummaries: SessionSummary[] = listSessions();

    const structuredContent: ListSessionsOutput = {
      sessions: sessionSummaries,
      total: sessionSummaries.length,
    };

    // Build human-readable markdown
    let textContent: string;

    if (sessionSummaries.length === 0) {
      textContent = [
        `**No Active Sessions**`,
        ``,
        `There are no active multi-turn editing sessions.`,
        `Use \`nanobanana_multi_edit_start\` to begin a new session.`,
      ].join("\n");
    } else {
      const lines: string[] = [
        `**Active Multi-Edit Sessions (${sessionSummaries.length})**`,
        ``,
      ];

      for (const s of sessionSummaries) {
        lines.push(`### Session \`${s.id}\``);
        lines.push(`- **Model:** ${modelDisplayName(s.model)} (\`${s.model}\`)`);
        lines.push(`- **Turns:** ${s.turn_count}`);
        lines.push(`- **Created:** ${s.created_at}`);
        lines.push(`- **Last Active:** ${s.last_accessed_at}`);
        lines.push(``);
      }

      lines.push(
        `Use \`nanobanana_multi_edit_continue\` with a session ID to continue editing,`,
        `or \`nanobanana_multi_edit_end\` to close a session.`,
      );

      textContent = truncateText(lines.join("\n"));
    }

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
