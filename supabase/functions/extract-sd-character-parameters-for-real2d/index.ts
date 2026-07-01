const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function pickString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchGeminiWithRetry(
  url: string,
  payload: Record<string, unknown>,
): Promise<{ response: Response; result: Record<string, unknown>; retryCount: number }> {
  const retryDelays = [3000, 5000, 10000];
  let lastResponse: Response | null = null;
  let lastResult: Record<string, unknown> = {};

  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let result: Record<string, unknown> = {};
    try {
      result = await response.json();
    } catch {
      result = {};
    }

    lastResponse = response;
    lastResult = result;

    const shouldRetry = response.status === 429 || response.status === 503;
    if (!shouldRetry || attempt === retryDelays.length) {
      return { response, result, retryCount: attempt };
    }

    await sleep(retryDelays[attempt]);
  }

  return {
    response: lastResponse as Response,
    result: lastResult,
    retryCount: retryDelays.length,
  };
}

function blankExtractionField(generationHandling = "KEEP") {
  return {
    ai_estimate: "",
    ai_estimate_japanese: "",
    confidence: "unknown",
    user_confirmation_status: "未確認",
    user_override: "",
    generation_handling: generationHandling,
    occlusion_note: "",
    anti_misread_note: "",
  };
}

function normalizeExtractedParameters(parsed: Record<string, unknown>) {
  const source = (parsed.sd_extracted_parameters || parsed.extracted || parsed) as
    Record<string, unknown>;

  const defaults = {
    face: blankExtractionField("KEEP"),
    hair: blankExtractionField("LOCK"),
    accessories: blankExtractionField("LOCK"),
    upper_body_equipment: blankExtractionField("KEEP"),
    lower_body_equipment: blankExtractionField("KEEP"),
    back_equipment: blankExtractionField("KEEP"),
    shoulder_equipment: blankExtractionField("KEEP"),
    right_hand_weapon: blankExtractionField("LOCK"),
    left_hand_equipment: blankExtractionField("LOCK"),
    pose: blankExtractionField("KEEP"),
    colors_and_motifs: blankExtractionField("LOCK"),
    advanced_drawing_hints: blankExtractionField("LOCK"),
    background_and_ui_exclusion: blankExtractionField("IGNORE"),
  };

  return Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => {
      const value = source[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return [key, { ...fallback, ...(value as Record<string, unknown>) }];
      }
      if (typeof value === "string" && value.trim()) {
        return [key, { ...fallback, ai_estimate: value.trim() }];
      }
      return [key, fallback];
    }),
  );
}

function buildReal2dParameters(
  sdExtractedParameters: Record<string, unknown>,
  targetGender: string,
) {
  return {
    conversion_goal:
      "Transform the confirmed SD/chibi source character into a tall real 2D manga/anime fantasy character without changing identity.",
    target_gender: targetGender || "unspecified",
    body_proportion: {
      target:
        "exactly 14-heads-tall real 2D character proportion, head about 1/14 of full body height, very small refined head, long neck, high waist, elongated arms, legs occupying roughly 62 to 68 percent of full body height, extremely long legs",
      do_not_preserve:
        "SD round body, short limbs, oversized head, mascot-like proportions, normal 7-to-10-head anime proportions, average character-sheet proportions, large anime head, low waistline, short legs",
      preserve:
        "pose meaning, hand assignment, equipment placement, silhouette logic",
    },
    identity_priority: {
      priority_order: [
        "user_override",
        "user-confirmed AI extraction",
        "unconfirmed AI extraction",
        "unknown",
      ],
      extracted_draft: sdExtractedParameters,
    },
    conversion_rules: {
      face:
        "Prioritize target gender, around 20 years old impression, refined cool eyes, calm confident expression. Preserve eye color, gaze, facial accessories, and recognizable motifs.",
      costume:
        "Preserve original colors, motif placement, accessory positions, and outfit category while upgrading material quality and detail density.",
      right_hand_weapon:
        "Keep right-hand weapon in the right hand. Prioritize confirmed category, silhouette, angle, size relationship, and visible motifs.",
      left_hand_equipment:
        "Keep left-hand equipment in the left hand. Do not swap with right-hand weapon. Preserve category, shape, emblem, position, and angle.",
      composition:
        "Keep character position, full-body standing-picture feeling, pose meaning, equipment layout, and screen placement. Exclude UI, text, numbers, buttons, and screenshot frames.",
      quality_direction:
        "Japanese fantasy RPG character key visual, high-rarity SSR style, light novel cover quality, sharp linework, refined ornaments, heroic and mysterious presence.",
    },
  };
}

function buildExtractionInstruction(targetGender: string, modeConversion: string) {
  return `
You are a visual extraction engine for an all-ages SD/chibi character to real 2D character conversion workflow.

Task:
Analyze the uploaded SD/chibi character image or game screenshot.
Do not generate an image.
Return JSON only.

Purpose:
Create editable extraction data that a human user will confirm before image generation.
The extraction is a draft, not a final answer. If a detail is cropped, hidden, stylized, or ambiguous, say so clearly.

Scope:
- This applies only to SD/chibi character -> real 2D character conversion.
- Extract observation data from the source image.
- Do not write final transformation commands inside SD extraction fields.
- Do not identify or name any real person, fictional character, franchise, artist, brand, or copyrighted work.
- Ignore UI, text, numbers, buttons, frames, icons, and screenshot interface elements as generation targets.
- You may mention that UI exists only in background_and_ui_exclusion.
- Output concise English phrases, except status values that must match the provided Japanese labels.

Target gender selected by user: ${targetGender || "unspecified"}
Mode conversion selected by user: ${modeConversion || "SD to real 2D"}

Common field rules for every extraction category:
- ai_estimate: what you visually infer from the image.
- ai_estimate_japanese: a natural Japanese summary for the user. This is especially important for right_hand_weapon and left_hand_equipment.
- confidence: high, medium, low, or unknown.
- user_confirmation_status: always "未確認" in this extraction response.
- user_override: always empty string.
- generation_handling: LOCK, KEEP, TRANSFORM, or IGNORE.
- occlusion_note: note cropped, hidden, partially visible, or unclear areas.
- anti_misread_note: note mistakes to avoid during later generation.

Important ambiguity rules:
- Right-hand weapon and left-hand equipment must be separate.
- Do not swap right and left.
- If a polearm, spear, scythe, staff, or large weapon is cropped or ambiguous, say that the category needs user confirmation.
- Separate face accessories, head accessories, and neck accessories.
- Do not treat SD round face, oversized eyes, huge head, short limbs, or mascot proportions as identity details to preserve.
- Preserve identity-relevant motifs: eye color, hair color, bangs, hairstyle silhouette, face accessory position, equipment category, equipment silhouette, color palette, emblems, repeated motifs, pose meaning, and hand assignment.

Return this exact JSON shape:
{
  "sd_extracted_parameters": {
    "face": {
      "ai_estimate": "",
      "ai_estimate_japanese": "",
      "confidence": "unknown",
      "user_confirmation_status": "未確認",
      "user_override": "",
      "generation_handling": "KEEP",
      "occlusion_note": "",
      "anti_misread_note": ""
    },
    "hair": {
      "ai_estimate": "",
      "ai_estimate_japanese": "",
      "confidence": "unknown",
      "user_confirmation_status": "未確認",
      "user_override": "",
      "generation_handling": "LOCK",
      "occlusion_note": "",
      "anti_misread_note": ""
    },
    "accessories": {
      "ai_estimate": "",
      "ai_estimate_japanese": "",
      "confidence": "unknown",
      "user_confirmation_status": "未確認",
      "user_override": "",
      "generation_handling": "LOCK",
      "occlusion_note": "",
      "anti_misread_note": ""
    },
    "upper_body_equipment": {
      "ai_estimate": "",
      "ai_estimate_japanese": "",
      "confidence": "unknown",
      "user_confirmation_status": "未確認",
      "user_override": "",
      "generation_handling": "KEEP",
      "occlusion_note": "",
      "anti_misread_note": ""
    },
    "lower_body_equipment": {
      "ai_estimate": "",
      "ai_estimate_japanese": "",
      "confidence": "unknown",
      "user_confirmation_status": "未確認",
      "user_override": "",
      "generation_handling": "KEEP",
      "occlusion_note": "",
      "anti_misread_note": ""
    },
    "back_equipment": {
      "ai_estimate": "",
      "ai_estimate_japanese": "",
      "confidence": "unknown",
      "user_confirmation_status": "未確認",
      "user_override": "",
      "generation_handling": "KEEP",
      "occlusion_note": "",
      "anti_misread_note": ""
    },
    "shoulder_equipment": {
      "ai_estimate": "",
      "ai_estimate_japanese": "",
      "confidence": "unknown",
      "user_confirmation_status": "未確認",
      "user_override": "",
      "generation_handling": "KEEP",
      "occlusion_note": "",
      "anti_misread_note": ""
    },
    "right_hand_weapon": {
      "ai_estimate": "",
      "ai_estimate_japanese": "",
      "confidence": "unknown",
      "user_confirmation_status": "未確認",
      "user_override": "",
      "generation_handling": "LOCK",
      "occlusion_note": "",
      "anti_misread_note": ""
    },
    "left_hand_equipment": {
      "ai_estimate": "",
      "ai_estimate_japanese": "",
      "confidence": "unknown",
      "user_confirmation_status": "未確認",
      "user_override": "",
      "generation_handling": "LOCK",
      "occlusion_note": "",
      "anti_misread_note": ""
    },
    "pose": {
      "ai_estimate": "",
      "ai_estimate_japanese": "",
      "confidence": "unknown",
      "user_confirmation_status": "未確認",
      "user_override": "",
      "generation_handling": "KEEP",
      "occlusion_note": "",
      "anti_misread_note": ""
    },
    "colors_and_motifs": {
      "ai_estimate": "",
      "ai_estimate_japanese": "",
      "confidence": "unknown",
      "user_confirmation_status": "未確認",
      "user_override": "",
      "generation_handling": "LOCK",
      "occlusion_note": "",
      "anti_misread_note": ""
    },
    "advanced_drawing_hints": {
      "ai_estimate": "",
      "ai_estimate_japanese": "",
      "confidence": "unknown",
      "user_confirmation_status": "未確認",
      "user_override": "",
      "generation_handling": "LOCK",
      "occlusion_note": "",
      "anti_misread_note": ""
    },
    "background_and_ui_exclusion": {
      "ai_estimate": "",
      "ai_estimate_japanese": "",
      "confidence": "unknown",
      "user_confirmation_status": "未確認",
      "user_override": "",
      "generation_handling": "IGNORE",
      "occlusion_note": "",
      "anti_misread_note": ""
    }
  },
  "warnings": []
}

Category detail checklist:
- face: face direction, visible eyes, one-eye covered state, eye color, gaze, expression, eyebrows, mouth, face impression, preserved face details, changeable face details, forbidden face transformations.
- hair: hair color, length, bangs, side hair, back hair, relation to hair accessories, preserved features, changeable features, forbidden transformations.
- accessories: face accessory type and position, head accessory type and side, neck accessory, ornament color. Do not mix these.
- upper_body_equipment: outfit/armor category, main/sub colors, collar, chest design, shoulder connection, sleeves, decorative patterns.
- lower_body_equipment: pants/skirt/waist cloth/armor/robe hem, waist equipment, leg equipment, boots, decorations.
- back_equipment: cape/wings/back weapon/back ribbon/aura/none, visible position, size, colors, patterns, motion. Do not turn cape into wings.
- shoulder_equipment: category, left/right/both, shape, color, connection to upper body and back equipment.
- right_hand_weapon: inferred category, hand assignment, direction, length, tip shape, shaft, color, crop state, screen position. Mark ambiguous weapon categories for user confirmation.
- left_hand_equipment: inferred category, hand assignment, shape, size, position, angle, emblem, color, crop/hidden state.
- pose: body direction, face direction, right arm, left arm, right weapon placement, left equipment placement, legs, cape/hair flow, screen composition.
- colors_and_motifs: main colors, sub colors, accent colors, repeated motifs, emblem positions, ornament atmosphere.
- advanced_drawing_hints: renderer-oriented character parts. Include head/hair shape, visible eye side and color, covered eye side, face-cover/high-collar shape, forehead ornament/circlet, feather/wing ornament side and color, flower/hair ornament side and color, cape shape/flow/pattern, right-hand weapon silhouette and screen position, left-hand shield/equipment shape and emblem, and which parts must be separate layers.
- background_and_ui_exclusion: background use, UI elements, UI exclusion targets, character screen position.

For right_hand_weapon.ai_estimate_japanese and left_hand_equipment.ai_estimate_japanese:
- Write a short, user-facing Japanese sentence.
- Include the inferred category, the hand assignment, visible shape, angle, screen position, color, and whether it is cropped or uncertain.
- If ambiguous, explicitly write "ユーザー確認が必要".
- Example: "右手には長柄武器を持っているように見えます。先端は槍にも大鎌にも見えるため、ユーザー確認が必要です。"
`.trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
  }

  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    return jsonResponse(
      { ok: false, error: "missing_gemini_api_key" },
      500,
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  const imageBase64 =
    pickString(body.reference_image_base64) || pickString(body.image_base64);
  const imageMimeType =
    pickString(body.reference_image_mime_type) ||
    pickString(body.image_mime_type) ||
    "image/webp";
  const targetGender = pickString(body.target_gender);
  const modeConversion = pickString(body.mode_conversion);

  if (!imageBase64) {
    return jsonResponse(
      { ok: false, error: "missing_reference_image_base64" },
      400,
    );
  }

  const instruction = buildExtractionInstruction(targetGender, modeConversion);
  const geminiPayload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: instruction },
          {
            inline_data: {
              mime_type: imageMimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      response_mime_type: "application/json",
    },
  };

  const model = Deno.env.get("GEMINI_TEXT_MODEL") || "gemini-2.5-flash-lite";
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

  try {
    const { response, result, retryCount } = await fetchGeminiWithRetry(
      url,
      geminiPayload,
    );

    if (!response.ok) {
      const geminiMessage = (result as any)?.error?.message || "";
      const isHighDemand =
        response.status === 429 ||
        response.status === 503 ||
        geminiMessage.includes("high demand") ||
        geminiMessage.includes("UNAVAILABLE");

      return jsonResponse(
        {
          ok: false,
          error: isHighDemand ? "gemini_high_demand" : "gemini_api_error",
          status: response.status,
          retry_count: retryCount,
          message: isHighDemand
            ? "Gemini is currently busy. Please retry after a short wait."
            : "Gemini API error.",
          detail: result,
        },
        isHighDemand ? 503 : 502,
      );
    }

    const modelText =
      (result as any)?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || "")
        ?.join("\n")
        ?.trim() || "";

    const parsed = extractJsonObject(modelText);
    if (!parsed) {
      return jsonResponse(
        { ok: false, error: "invalid_gemini_json", raw_text: modelText },
        502,
      );
    }

    const sdExtractedParameters = normalizeExtractedParameters(parsed);
    const real2dParameters = buildReal2dParameters(
      sdExtractedParameters,
      targetGender,
    );
    const warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];

    return jsonResponse({
      ok: true,
      status: "extracted",
      model,
      sd_extracted_parameters: sdExtractedParameters,
      real2d_parameters: real2dParameters,
      extraction_prompt: instruction,
      model_text: modelText,
      warnings,
    });
  } catch (err) {
    return jsonResponse(
      {
        ok: false,
        error: "edge_function_error",
        message: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }
});
