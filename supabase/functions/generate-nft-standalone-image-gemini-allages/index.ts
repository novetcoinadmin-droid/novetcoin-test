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

function getCharacterModeConversionInstructions(mode: string) {
  if (!mode) {
    return {
      composition: "",
      lines: [] as string[],
      finalGoal: "",
    };
  }

  if (
    mode.includes("２等身") || mode.includes("2等身") ||
    mode.includes("SDキャラに変換")
  ) {
    return {
      composition:
        "full-body composition, one complete two-head-tall super-deformed chibi character, the whole body visible from head to feet",
      lines: [
        "Character mode conversion: transform the reference character into a two-head-tall SD chibi character.",
        "Strict body proportion: exactly two-head-tall character design; the head and the body should be almost the same size.",
        "Use a very large head, tiny torso, short arms, short legs, and a cute compact silhouette.",
        "Show the entire body from head to feet. Do not make a face close-up, bust-up, or upper-body-only image.",
        "Preserve the reference character identity: hairstyle, bangs, hair color, eye color, outfit, color palette, accessories, and overall personality.",
        "Change only the body proportion and visual mode into a game-style SD character.",
        "Avoid realistic human anatomy, long limbs, tall proportions, fashion-model proportions, or adult body proportions.",
      ],
      finalGoal:
        "Create a clearly recognizable two-head-tall SD version of the same character, like a cute game icon or mini character.",
    };
  }

  if (
    mode.includes("リアルな漫画風") || mode.includes("リアル漫画") ||
    mode.includes("MMORPG") || mode.includes("8頭身")
  ) {
    return {
      composition:
        "full-body vertical MMORPG character key visual, one complete very tall 10-heads-tall anime-realistic fantasy hero, the whole body visible from head to feet",
      lines: [
        "Character mode conversion: transform the reference SD/chibi character into a tall, elegant, full-body MMORPG hero character.",
        "This is a major redesign, not an image cleanup. Do not trace, upscale, or lightly repaint the reference image.",
        "Strict body proportion: remove SD/chibi proportions and redraw as a 10-heads-tall heroic fantasy character with a very tall body, exceptionally long legs, balanced anatomy, and a sharp readable silhouette.",
        "Make the redesigned character noticeably tall and long-legged, with fashion-model-like vertical proportions while still looking like a polished anime-fantasy MMORPG hero.",
        "Prioritize leg length and overall height: small-to-normal head size, elevated waistline, long thighs, long lower legs, and a graceful tall stance.",
        "The final image must be unmistakably non-chibi: normal/tall head size, adult heroic torso, long arms, very long legs, realistic anime-fantasy anatomy, and no mascot-like body.",
        "Use high-end Japanese isekai anime fantasy character concept art quality: premium gacha character illustration, official game promotional standing artwork, polished anime-style rendering, not a photorealistic real person and not heavy 3D/CG armor rendering.",
        "For this SD-to-8-heads conversion mode, fix the age impression at around 20 years old regardless of the original SD character's childlike proportions.",
        "Make the redesigned character an attractive Japanese isekai anime-style bishounen or beautiful woman. The face must be refined, beautiful, cool, and appealing rather than cute-childlike.",
        "Preserve the reference character identity aggressively: hairstyle, bangs, hair color, eye color, outfit motifs, color palette, accessories, symbolic items, weapon shape, and overall personality.",
        "Preserve identity and design motifs only; do not preserve the reference pose, camera angle, background, short body, oversized head, stubby limbs, or toy-like silhouette.",
        "Upgrade the costume into detailed layered fantasy game attire while keeping the original design motifs recognizable: ornate trims, elegant cloth, light armor accents, polished ornaments, and clean anime illustration texture.",
        "Use a beautiful Japanese isekai anime-style face with refined attractive features and a confident cool expression. Make the character look stylish, heroic, and high-rarity, while still clearly being the same character.",
        "Show the entire body from head to feet. Do not make a face close-up, bust-up, upper-body-only image, or cropped weapon.",
        "Avoid two-head-tall, three-head-tall, eight-heads-tall average height, chibi, mascot, toy-like, mini-character proportions, childish body, oversized head, tiny limbs, short legs, squat silhouette, simple costume, low detail, weak silhouette, generic fantasy outfit, losing the original design, bulky realistic armor, heavy CG render, gritty realism, or western photoreal fantasy.",
      ],
      finalGoal:
        "Create a full-body MMORPG-quality anime-realistic hero version of the same SD/chibi character, like an official high-rarity fantasy RPG character key visual.",
    };
  }

  return {
    composition: "",
    lines: [`Character mode conversion: ${mode}`],
    finalGoal: "",
  };
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

function buildPrompt(
  payload: Record<string, any>,
  hasReferenceImage: boolean,
  hasBackgroundImage: boolean,
) {
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
  const userArtStyle = pickString(payload.tpl_character_art_style) ||
    pickString(payload.art_style);
  const userModeConversion = pickString(payload.tpl_character_mode_conversion) ||
    pickString(payload.character_mode_conversion);
  const userExpressionTransform =
    pickString(payload.tpl_character_expression_transform) ||
    pickString(payload.character_expression_transform);
  const backgroundMode = pickString(payload.background_mode);
  const backgroundInstruction = pickString(payload.background_instruction);
  const backgroundRelativePrompt = pickString(payload.background_relative_prompt);
  const modeConversion = getCharacterModeConversionInstructions(
    userModeConversion,
  );

  const preserveLines: string[] = [];
  pushIf(
    preserveLines,
    "Illustration style",
    userArtStyle || pickEditable(editable, ["画風", "逕ｻ鬚ｨ"]),
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
  for (const line of modeConversion.lines) {
    changeLines.push(line);
  }
  pushIf(
    changeLines,
    "Target expression",
    userExpression || pickEditable(editable, ["表情", "陦ｨ諠・"]),
  );
  pushIf(changeLines, "Expression transform preset", userExpressionTransform);
  pushIf(changeLines, "Emotion detail", pickEditable(editable, ["感情"]));
  pushIf(changeLines, "Eyebrow detail", pickEditable(editable, ["眉毛"]));
  pushIf(changeLines, "Eye shape detail", pickEditable(editable, ["瞳の形"]));
  pushIf(changeLines, "Mouth and lip detail", pickEditable(editable, ["唇の形"]));
  pushIf(changeLines, "Overall facial impression", pickEditable(editable, [
    "全体印象",
  ]));
  pushIf(changeLines, "Target view", userView);
  pushIf(changeLines, "Target age impression", userAge);
  pushIf(changeLines, "Target pose", userPose);
  pushIf(changeLines, "Target outfit", userOutfit);
  pushIf(changeLines, "Target atmosphere and lighting", userLighting);
  pushIf(changeLines, "Additional user direction", userFreeText);

  if (hasBackgroundImage && backgroundMode === "reference") {
    changeLines.push(
      "Background mode: reference. Use the provided background image as the fixed background/composition reference.",
    );
    changeLines.push(
      "Keep the selected background image's composition, location, perspective, atmosphere, lighting, and mood as strongly as possible.",
    );
    changeLines.push(
      "Naturally place the character inside that background scene. Do not replace the background with a different location.",
    );
  }

  if (hasBackgroundImage && backgroundMode === "relative") {
    changeLines.push(
      "Background mode: relative. Use the provided background image only as an atmosphere and worldbuilding reference.",
    );
    changeLines.push(
      "Preserve the image's mood, color feeling, world setting, time of day, and air, but do not lock the exact composition.",
    );
  }

  pushIf(changeLines, "Background instruction", backgroundInstruction);
  pushIf(changeLines, "Background relative prompt", backgroundRelativePrompt);

  const referenceInstruction = hasReferenceImage
    ? "Use the provided image as a character identity reference only. Extract recognizable character features, but do not copy the reference image's body proportions, pose, camera angle, composition, or background unless explicitly requested."
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
- ${modeConversion.composition || userView || "bust-up or upper body composition"}
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
    modeConversion.finalGoal ||
    (hasReferenceImage
      ? "Create a result that clearly resembles the same character as the reference image while following the requested changes."
      : "Create a coherent original character illustration that follows the requested text details.")
  }
`.trim();
}

async function callGeminiImageModel(params: {
  apiKey: string;
  model: string;
  prompt: string;
  referenceImageBase64: string;
  referenceImageMimeType: string;
  backgroundImageBase64: string;
  backgroundImageMimeType: string;
  backgroundMode: string;
}) {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`;
  const parts: Array<
    { inlineData?: { mimeType: string; data: string }; text?: string }
  > = [];

  if (params.referenceImageBase64) {
    parts.push({
      text:
        "Character reference image. Use this only to identify the character's design motifs. Do not trace or preserve the original pose, background, camera angle, chibi proportions, oversized head, short limbs, or mascot silhouette.",
    });
    parts.push({
      inlineData: {
        mimeType: params.referenceImageMimeType || "image/png",
        data: params.referenceImageBase64,
      },
    });
  }

  if (params.backgroundImageBase64) {
    const backgroundLabel = params.backgroundMode === "reference"
      ? "Background reference image. Use this as the fixed background/composition reference."
      : "Background atmosphere image. Use this for mood, color, world setting, and air.";
    parts.push({ text: backgroundLabel });
    parts.push({
      inlineData: {
        mimeType: params.backgroundImageMimeType || "image/png",
        data: params.backgroundImageBase64,
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
    let backgroundImageBase64 = pickString(payload.background_image_base64);
    let backgroundImageMimeType =
      pickString(payload.background_image_mime_type) || "image/png";
    const backgroundImageUrl = pickString(
      payload.background_image_url || payload.backgroundImageUrl,
    );
    const backgroundMode = pickString(payload.background_mode);

    if (!referenceImageBase64 && referenceImageUrl) {
      const fetched = await fetchImageAsBase64(referenceImageUrl);
      referenceImageBase64 = fetched.base64;
      referenceImageMimeType = fetched.mimeType;
    }

    if (!backgroundImageBase64 && backgroundImageUrl) {
      const fetched = await fetchImageAsBase64(backgroundImageUrl);
      backgroundImageBase64 = fetched.base64;
      backgroundImageMimeType = fetched.mimeType;
    }

    const hasReferenceImage = Boolean(referenceImageBase64);
    const hasBackgroundImage = Boolean(backgroundImageBase64);
    const prompt = buildPrompt(payload, hasReferenceImage, hasBackgroundImage);
    const result = await callGeminiImageModel({
      apiKey: GEMINI_API_KEY,
      model: GEMINI_IMAGE_MODEL,
      prompt,
      referenceImageBase64,
      referenceImageMimeType,
      backgroundImageBase64,
      backgroundImageMimeType,
      backgroundMode,
    });
    const dataUrl = `data:${result.mimeType};base64,${result.imageBase64}`;

    return jsonResponse({
      ok: true,
      status: "success",
      model: GEMINI_IMAGE_MODEL,
      prompt,
      hasReferenceImage,
      hasBackgroundImage,
      backgroundMode,
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
