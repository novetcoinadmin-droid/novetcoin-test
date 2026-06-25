const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
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

function pickEditable(
  editable: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = pickString(editable[key]);
    if (value) return value;
  }
  return "";
}

function pushIf(lines: string[], label: string, value: unknown) {
  const v = pickString(value);
  if (v) lines.push(`${label}: ${v}`);
}

async function fetchImageAsBase64(imageUrl: string) {
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    throw new Error("参照画像URLが不正です。");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("参照画像URLは http または https のみ利用できます。");
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(
      `参照画像の取得に失敗しました（HTTP ${response.status}）。`,
    );
  }

  const contentType =
    response.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  if (!contentType.startsWith("image/")) {
    throw new Error(`参照画像の形式が画像ではありません（${contentType}）。`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return {
    base64: btoa(binary),
    mimeType: contentType,
  };
}

function buildPrompt(payload: Record<string, any>, hasReferenceImage: boolean) {
  const editable = payload.editable_fields_japanese ||
    payload.reference_features?.editable_fields_japanese ||
    {};

  const userExpression = pickString(payload.tpl_character_expression) ||
    pickString(payload.expression) ||
    pickString(payload.user_expression);
  const userFreeText = pickString(payload.tpl_character_free_text) ||
    pickString(payload.free_text) ||
    pickString(payload.user_free_text);
  const userView = pickString(payload.tpl_character_view) ||
    pickString(payload.view);
  const userAge = pickString(payload.tpl_character_age) ||
    pickString(payload.age);
  const userPose = pickString(payload.tpl_character_pose) ||
    pickString(payload.pose);
  const userOutfit = pickString(payload.tpl_character_outfit) ||
    pickString(payload.outfit);
  const userLighting = pickString(payload.tpl_character_lighting) ||
    pickString(payload.lighting);

  const preserveLines: string[] = [];
  pushIf(
    preserveLines,
    "Illustration style",
    pickEditable(editable, ["画風", "逕ｻ鬚ｨ"]),
  );
  pushIf(
    preserveLines,
    "Rendering texture",
    pickEditable(editable, ["質感", "雉ｪ諢・"]),
  );
  pushIf(
    preserveLines,
    "Color mood",
    pickEditable(editable, ["色調", "濶ｲ隱ｿ"]),
  );

  const changeLines: string[] = [];
  pushIf(
    changeLines,
    "Target expression",
    userExpression || pickEditable(editable, ["表情", "陦ｨ諠・"]),
  );
  pushIf(changeLines, "Target view", userView);
  pushIf(changeLines, "Target age impression", userAge);
  pushIf(changeLines, "Target pose", userPose);
  pushIf(changeLines, "Target outfit", userOutfit);
  pushIf(changeLines, "Target atmosphere and lighting", userLighting);
  pushIf(changeLines, "Additional user direction", userFreeText);

  const referenceInstruction = hasReferenceImage
    ? "Use the provided image as the primary visual reference. Preserve the same character identity as much as possible."
    : "No reference image is provided. Create a new original character from the text instructions.";

  return `
${referenceInstruction}

Generate one all-ages character illustration.

Important rules:
- Keep it all-ages only.
- Do not add explicit or sexual content.
- Do not create multiple people unless the user explicitly requests it.
- Prefer a clean, high-quality finished illustration.
- Avoid text, signatures, logos, watermarks, and UI elements in the image.

Composition:
- ${userView || "bust-up or upper body composition"}
- one character
- clean readable composition

Preserve:
${
    preserveLines.length
      ? preserveLines.map((v) => `- ${v}`).join("\n")
      : "- Use a clean all-ages illustrated style."
  }

Change / Target:
${
    changeLines.length
      ? changeLines.map((v) => `- ${v}`).join("\n")
      : "- Create a natural character illustration."
  }

Final goal:
${
    hasReferenceImage
      ? "Create a result that clearly resembles the same character as the reference image while following the requested changes."
      : "Create a coherent original character illustration that follows the requested text details."
  }
`.trim();
}

async function callGeminiImageModel(params: {
  apiKey: string;
  model: string;
  prompt: string;
  referenceImageBase64: string;
  referenceImageMimeType: string;
}) {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`;
  const parts: Array<
    { inlineData?: { mimeType: string; data: string }; text?: string }
  > = [];

  if (params.referenceImageBase64) {
    parts.push({
      inlineData: {
        mimeType: params.referenceImageMimeType || "image/png",
        data: params.referenceImageBase64,
      },
    });
  }

  parts.push({ text: params.prompt });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Gemini APIエラー: ${JSON.stringify(data)}`);
  }

  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  const responseParts = candidates.flatMap((candidate: any) =>
    candidate?.content?.parts ?? []
  );
  const imagePart = responseParts.find((part: any) => part?.inlineData?.data);
  const textParts = responseParts
    .filter((part: any) => typeof part?.text === "string" && part.text.trim())
    .map((part: any) => part.text.trim());

  if (!imagePart?.inlineData?.data) {
    throw new Error(
      `Geminiから画像が返されませんでした: ${JSON.stringify(data)}`,
    );
  }

  return {
    imageBase64: imagePart.inlineData.data as string,
    mimeType: (imagePart.inlineData.mimeType as string) || "image/png",
    modelText: textParts.join("\n"),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const GEMINI_IMAGE_MODEL = Deno.env.get("GEMINI_IMAGE_MODEL") ||
      "gemini-2.5-flash-image";

    if (!GEMINI_API_KEY) {
      return jsonResponse(
        { ok: false, error: "Missing GEMINI_API_KEY secret" },
        500,
      );
    }

    const payload = await req.json();
    const templateType = pickString(
      payload.template_type || payload.type || "character",
    );
    if (templateType !== "character") {
      return jsonResponse({
        ok: false,
        error: "V1ではキャラ生成のみ対応しています。",
      }, 400);
    }

    let referenceImageBase64 = pickString(payload.reference_image_base64);
    let referenceImageMimeType =
      pickString(payload.reference_image_mime_type) || "image/png";
    const referenceImageUrl = pickString(
      payload.reference_image_url || payload.referenceImageUrl,
    );

    if (!referenceImageBase64 && referenceImageUrl) {
      const fetched = await fetchImageAsBase64(referenceImageUrl);
      referenceImageBase64 = fetched.base64;
      referenceImageMimeType = fetched.mimeType;
    }

    const hasReferenceImage = Boolean(referenceImageBase64);
    const prompt = buildPrompt(payload, hasReferenceImage);
    const result = await callGeminiImageModel({
      apiKey: GEMINI_API_KEY,
      model: GEMINI_IMAGE_MODEL,
      prompt,
      referenceImageBase64,
      referenceImageMimeType,
    });
    const dataUrl = `data:${result.mimeType};base64,${result.imageBase64}`;

    return jsonResponse({
      ok: true,
      status: "success",
      model: GEMINI_IMAGE_MODEL,
      prompt,
      hasReferenceImage,
      imageBase64: result.imageBase64,
      mimeType: result.mimeType,
      dataUrl,
      modelText: result.modelText,
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
