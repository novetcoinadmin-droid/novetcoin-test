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
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizeColor(value: unknown, fallback: string): string {
  const color = pickString(value);
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function normalizeNumber(value: unknown, fallback: number, min: number, max: number): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function normalizeSvgElement(value: unknown) {
  const element = asRecord(value);
  const type = pickString(element.type);
  if (!["path", "ellipse", "circle", "polygon", "polyline", "line", "rect"].includes(type)) {
    return null;
  }

  const normalized: Record<string, unknown> = {
    type,
    id: pickString(element.id).slice(0, 60),
    fill: normalizeColor(element.fill, "none"),
    stroke: normalizeColor(element.stroke, "#2a2530"),
    strokeWidth: normalizeNumber(element.strokeWidth, 3, 0, 40),
    opacity: normalizeNumber(element.opacity, 1, 0, 1),
    note: pickString(element.note).slice(0, 300),
  };

  if (pickString(element.fill).toLowerCase() === "none") normalized.fill = "none";
  if (pickString(element.stroke).toLowerCase() === "none") normalized.stroke = "none";

  if (type === "path") {
    const d = pickString(element.d).replace(/[^MmZzLlHhVvCcSsQqTtAa0-9,.\-\s]/g, "").slice(0, 1800);
    if (!d) return null;
    normalized.d = d;
  } else if (type === "polygon" || type === "polyline") {
    const points = pickString(element.points).replace(/[^0-9,.\-\s]/g, "").slice(0, 1200);
    if (!points) return null;
    normalized.points = points;
  } else {
    ["x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "rx", "ry", "r", "width", "height"].forEach((key) => {
      if (element[key] != null) normalized[key] = normalizeNumber(element[key], 0, -3000, 3000);
    });
  }

  return normalized;
}

function normalizeSvgData(source: Record<string, unknown>) {
  const svg = asRecord(source.svg);
  const rawLayers = Array.isArray(svg.layers) ? svg.layers : [];
  const layers = rawLayers.slice(0, 28).map((layerValue) => {
    const layer = asRecord(layerValue);
    const elements = Array.isArray(layer.elements)
      ? layer.elements.map(normalizeSvgElement).filter(Boolean).slice(0, 40)
      : [];
    return {
      id: pickString(layer.id).slice(0, 60) || "layer",
      label: pickString(layer.label).slice(0, 120) || "Layer",
      elements,
    };
  }).filter((layer) => layer.elements.length);

  return {
    viewBox: pickString(svg.viewBox).replace(/[^0-9,.\-\s]/g, "").slice(0, 80) || "0 0 1024 1536",
    layers,
  };
}

function normalizeDrawingData(parsed: Record<string, unknown>) {
  const source = asRecord(parsed.drawing_data || parsed.drawingData || parsed);
  const canvas = asRecord(source.canvas);
  const colors = asRecord(source.colors);
  const bodyGuide = asRecord(source.bodyGuide || source.body_guide);
  const pose = asRecord(source.pose);
  const head = asRecord(source.head);
  const accessories = asRecord(source.accessories);
  const equipment = asRecord(source.equipment);
  const cape = asRecord(source.cape);
  const details = asRecord(source.details);
  const rightHand = asRecord(equipment.rightHand);
  const leftHand = asRecord(equipment.leftHand);

  return {
    canvas: {
      width: normalizeNumber(canvas.width, 1024, 512, 1600),
      height: normalizeNumber(canvas.height, 1536, 768, 2400),
      background: normalizeColor(canvas.background, "#f8f6fb"),
    },
    colors: {
      line: normalizeColor(colors.line, "#2a2530"),
      skin: normalizeColor(colors.skin, "#f2c9b8"),
      hair: normalizeColor(colors.hair, "#5b4a68"),
      main: normalizeColor(colors.main, "#6d4aa2"),
      sub: normalizeColor(colors.sub, "#d9d2e9"),
      accent: normalizeColor(colors.accent, "#d6ad4f"),
      shadow: normalizeColor(colors.shadow, "#4d3a62"),
    },
    bodyGuide: {
      headCount: 14,
      centerX: normalizeNumber(bodyGuide.centerX, 0.5, 0.25, 0.75),
      topY: normalizeNumber(bodyGuide.topY, 0.07, 0.03, 0.18),
      heightRatio: normalizeNumber(bodyGuide.heightRatio, 0.86, 0.68, 0.93),
      shoulderTilt: normalizeNumber(bodyGuide.shoulderTilt, 0, -0.2, 0.2),
      hipTilt: normalizeNumber(bodyGuide.hipTilt, 0, -0.2, 0.2),
    },
    pose: {
      facing: pickString(pose.facing) || "front",
      rightArm: pickString(pose.rightArm) || "slightly outward, holding right-hand weapon",
      leftArm: pickString(pose.leftArm) || "slightly outward, holding left-hand equipment",
      legs: pickString(pose.legs) || "long standing pose",
      notes: pickString(pose.notes),
    },
    head: {
      hairShape: pickString(head.hairShape) || "long side-swept bangs covering one side",
      hairCoverageSide: pickString(head.hairCoverageSide) || "character left",
      visibleEyeSide: pickString(head.visibleEyeSide) || "character right",
      visibleEyeColor: normalizeColor(head.visibleEyeColor, "#7fa6d9"),
      faceCoverShape: pickString(head.faceCoverShape) ||
        "high blue collar or face cover across lower face",
      foreheadOrnament: pickString(head.foreheadOrnament) ||
        "blue and gold forehead ornament or circlet",
    },
    accessories: {
      featherSide: pickString(accessories.featherSide) || "character right",
      featherColor: normalizeColor(accessories.featherColor, "#dfe6f2"),
      flowerSide: pickString(accessories.flowerSide) || "character right",
      flowerColor: normalizeColor(accessories.flowerColor, "#b23a32"),
      goldDangles: pickString(accessories.goldDangles) || "small gold hanging ornaments",
    },
    silhouette: {
      hairShape: pickString(source.silhouette && asRecord(source.silhouette).hairShape) ||
        "medium fantasy hair with recognizable bangs",
      capeOrBack: pickString(source.silhouette && asRecord(source.silhouette).capeOrBack) ||
        "optional back cloth or cape following the source",
      outfitShape: pickString(source.silhouette && asRecord(source.silhouette).outfitShape) ||
        "slim layered fantasy outfit",
    },
    equipment: {
      rightHand: {
        category: pickString(rightHand.category) || "large umbrella-like staff or polearm",
        shape: pickString(rightHand.shape) ||
          "long black shaft with large tattered black-and-gold umbrella or banner-shaped head on screen left",
        color: normalizeColor(rightHand.color, "#2b2a28"),
        accent: normalizeColor(rightHand.accent, "#b99a45"),
        position: pickString(rightHand.position) || "screen left of character, diagonal upward",
        headShape: pickString(rightHand.headShape) || "large ragged canopy or cloth blade",
      },
      leftHand: {
        category: pickString(leftHand.category) || "small round polygon shield",
        shape: pickString(leftHand.shape) ||
          "white round octagonal shield at waist front with gold rim and red star emblem",
        color: normalizeColor(leftHand.color, "#f8f5ee"),
        accent: normalizeColor(leftHand.accent, "#d6ad4f"),
        emblemColor: normalizeColor(leftHand.emblemColor, "#b94b35"),
        position: pickString(leftHand.position) || "front of waist, held by character left hand",
      },
    },
    cape: {
      color: normalizeColor(cape.color, "#263896"),
      lining: normalizeColor(cape.lining, "#d8caa4"),
      flow: pickString(cape.flow) || "long cape flowing down character right side",
      pattern: pickString(cape.pattern) || "gold trim and small ornamental motifs near the edge",
    },
    svg: normalizeSvgData(source),
    details: {
      face: pickString(details.face) || "small refined mature anime face",
      hair: pickString(details.hair) || "preserve source hair color and bang silhouette",
      upperBody: pickString(details.upperBody) || "preserve upper outfit motifs",
      lowerBody: pickString(details.lowerBody) || "long legs with source color blocking",
      motifs: pickString(details.motifs) || "repeat source emblems, trim, and accent motifs",
      uiExclusion: pickString(details.uiExclusion) ||
        "exclude screenshot UI, text, numbers, buttons, frames, and background clutter",
    },
    layerOrder: Array.isArray(source.layerOrder)
      ? source.layerOrder.slice(0, 30).map((v) => String(v))
      : [
        "back equipment",
        "body guide",
        "legs",
        "torso outfit",
        "head and hair",
        "right-hand equipment",
        "left-hand equipment",
        "motifs",
        "line polish",
      ],
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
  };
}

function buildDrawingInstruction(
  targetGender: string,
  modeConversion: string,
  confirmedParameters: unknown,
) {
  return `
You are a drawing-data generator for an SD/chibi game character to tall real 2D manga character conversion.

Do not generate an image. Return JSON only.

Goal:
Create browser Canvas drawing data for a deterministic MVP renderer. The renderer will draw a 14-heads-tall full-body PNG.

Hard rules:
- Preserve the source character identity: hair, face accessories, outfit motifs, color palette, equipment, pose logic, and hand assignment.
- Do not preserve SD/chibi body proportions, huge head, short limbs, round toddler body, mascot charm, screenshot UI, text, buttons, numbers, or frames.
- Right-hand equipment and left-hand equipment must stay separate and must not be swapped.
- Make the target body exactly 14-heads-tall. The head must be very small relative to body height.
- Convert screenshot/game UI into exclusion notes only. Do not draw level labels, dates, buttons, panels, browser UI, or background scenery.
- Break distinctive features into explicit drawable parts. Do not merge face cover, forehead ornament, hair overlap, visible eye, feather, flower, cape, right-hand equipment, and left-hand shield into one vague accessory.
- If the source has one visible eye and the other side is covered by hair or a face ornament, preserve that asymmetry.
- If the source has a feather or wing-like head ornament and a red flower, output both as separate accessory fields.
- If the source has a large right-hand umbrella/staff/banner-like weapon and a small left-hand round shield/equipment, output those shapes literally. Do not replace them with generic spear and generic shield.
- The output is drawing instructions, not prose and not an image.
- Use valid hex colors.
- Keep all coordinates normalized where requested.
- Also return an optional SVG layer plan. Use viewBox "0 0 1024 1536". The SVG should be deterministic, full-body, and character-only.
- SVG element types allowed: path, ellipse, circle, polygon, polyline, line, rect.
- For SVG paths, use absolute coordinates when possible. Keep path data compact and valid.
- SVG layers must be ordered back-to-front and must include separate layers for cape/back, legs/body, head/hair, face cover/ornament, right-hand equipment, left-hand shield/equipment, and gold motifs.
- Do not include text elements, external images, scripts, filters, foreignObject, CSS, URLs, or embedded raster images.

Target gender: ${targetGender || "unspecified"}
Mode conversion: ${modeConversion || "SD character to real 2D"}

User-confirmed source parameters:
${JSON.stringify(confirmedParameters || {}, null, 2)}

Return this JSON shape:
{
  "drawing_data": {
    "canvas": {
      "width": 1024,
      "height": 1536,
      "background": "#f8f6fb"
    },
    "colors": {
      "line": "#2a2530",
      "skin": "#f2c9b8",
      "hair": "#5b4a68",
      "main": "#6d4aa2",
      "sub": "#d9d2e9",
      "accent": "#d6ad4f",
      "shadow": "#4d3a62"
    },
    "bodyGuide": {
      "headCount": 14,
      "centerX": 0.5,
      "topY": 0.07,
      "heightRatio": 0.86,
      "shoulderTilt": 0,
      "hipTilt": 0
    },
    "pose": {
      "facing": "front / three-quarter-left / three-quarter-right",
      "rightArm": "short literal description",
      "leftArm": "short literal description",
      "legs": "short literal description",
      "notes": "pose and composition locks"
    },
    "head": {
      "hairShape": "long side-swept bangs, which side is covered, hair length and silhouette",
      "hairCoverageSide": "character left / character right / none / uncertain",
      "visibleEyeSide": "character left / character right / both / uncertain",
      "visibleEyeColor": "#7fa6d9",
      "faceCoverShape": "lower-face mask, high collar, eyepatch, visor, or none; include color and coverage",
      "foreheadOrnament": "circlet/crest/forehead ornament shape, color, and position"
    },
    "accessories": {
      "featherSide": "character left / character right / none / uncertain",
      "featherColor": "#dfe6f2",
      "flowerSide": "character left / character right / none / uncertain",
      "flowerColor": "#b23a32",
      "goldDangles": "small hanging gold ornaments, side and count impression"
    },
    "silhouette": {
      "hairShape": "literal source hair silhouette adapted to mature real 2D",
      "capeOrBack": "cape, wing, back cloth, ribbon, aura, none, with source position",
      "outfitShape": "upper/lower outfit silhouette and source motif rhythm"
    },
    "equipment": {
      "rightHand": {
        "category": "source category or uncertain category",
        "shape": "specific visible silhouette, angle, size, tip/base/grip notes",
        "color": "#6d4aa2",
        "accent": "#d6ad4f",
        "position": "screen position and diagonal/vertical angle",
        "headShape": "large visible head/canopy/blade/shield-like part shape"
      },
      "leftHand": {
        "category": "source category or uncertain category",
        "shape": "specific visible silhouette, angle, size, emblem notes",
        "color": "#d9d2e9",
        "accent": "#d6ad4f",
        "emblemColor": "#b94b35",
        "position": "screen position and relation to waist/hand"
      }
    },
    "cape": {
      "color": "#263896",
      "lining": "#d8caa4",
      "flow": "which side it flows to and length",
      "pattern": "edge trim, holes, emblems, repeated motifs"
    },
    "svg": {
      "viewBox": "0 0 1024 1536",
      "layers": [
        {
          "id": "cape-back",
          "label": "cape and back equipment",
          "elements": [
            {
              "type": "path",
              "id": "main-cape",
              "d": "M ...",
              "fill": "#263896",
              "stroke": "#2a2530",
              "strokeWidth": 5,
              "opacity": 1,
              "note": "blue cape flowing to character right with gold trim"
            }
          ]
        }
      ]
    },
    "details": {
      "face": "small refined mature anime face details to preserve",
      "hair": "hair color, bangs, accessories",
      "upperBody": "upper outfit armor/cloth/accessory motifs",
      "lowerBody": "waist, legs, boots, lower outfit motifs",
      "motifs": "emblems, repeated trims, patterns, color blocking",
      "uiExclusion": "UI/text/button/frame elements to ignore"
    },
    "layerOrder": ["back equipment", "body guide", "legs", "torso outfit", "head and hair", "right-hand equipment", "left-hand equipment", "motifs", "line polish"]
  },
  "warnings": []
}
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
    return jsonResponse({ ok: false, error: "missing_gemini_api_key" }, 500);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  const imageBase64 = pickString(body.reference_image_base64) ||
    pickString(body.image_base64);
  const imageMimeType = pickString(body.reference_image_mime_type) ||
    pickString(body.image_mime_type) ||
    "image/webp";
  const targetGender = pickString(body.target_gender);
  const modeConversion = pickString(body.mode_conversion);
  const confirmedParameters = body.confirmed_parameters || {};

  if (!imageBase64) {
    return jsonResponse({ ok: false, error: "missing_reference_image_base64" }, 400);
  }

  const instruction = buildDrawingInstruction(
    targetGender,
    modeConversion,
    confirmedParameters,
  );
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
      temperature: 0.15,
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
      const isHighDemand = response.status === 429 ||
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

    const modelText = (result as any)?.candidates?.[0]?.content?.parts
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

    const drawingData = normalizeDrawingData(parsed);
    return jsonResponse({
      ok: true,
      status: "drawing_data_generated",
      model,
      drawing_data: drawingData,
      drawing_prompt: instruction,
      model_text: modelText,
      warnings: drawingData.warnings,
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
