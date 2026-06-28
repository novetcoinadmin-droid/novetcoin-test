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

function isSdToReal2DConversionMode(mode: string) {
  return Boolean(
    mode && (
      mode.includes("リアルな漫画風") || mode.includes("リアル漫画") ||
      mode.includes("MMORPG") || mode.includes("8頭身") ||
      mode.includes("2Dリアル") || mode.includes("２Dリアル")
    ),
  );
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

  if (isSdToReal2DConversionMode(mode)) {
    return {
      composition:
        "full-body vertical real 2D manga character key visual, one complete very tall 12-to-14-heads-tall anime-realistic fantasy character, the whole body visible from head to feet",
      lines: [
        "Character mode conversion: transform the source SD/chibi character into a tall, elegant, full-body real 2D manga character.",
        "Use the SD/chibi character as the source for identity and design motifs: hairstyle, bangs, hair color, eye color, outfit motifs, color palette, accessories, symbolic items, hand-held equipment shapes, and overall personality.",
        "Preserve only the source SD character's design motifs, not its cute emotional tone.",
        "Remove cute, childish, mascot-like, soft, round, playful, cheerful, innocent, and comedic impressions from the SD character.",
        "Convert the character's mood into a serious, cool, dramatic, heroic real 2D manga/anime character.",
        "Prioritize coolness, dignity, intensity, and stylish heroic presence over cuteness.",
        "Use any provided reference image to extract the source SD character's identity, design motifs, character-only pose, equipment placement, facing direction, and character framing. Do not use screenshot UI, background, lighting, or unrelated layout elements as the target.",
        "If the reference image contains a taller 2D character sample, ignore that taller sample completely; do not copy its face, pose, outfit, background, composition, lighting, proportions, or overall layout.",
        "Create a new original transformation from the SD character instead of recreating, tracing, or imitating any finished sample image, while keeping the source character's pose logic and character-only composition recognizable.",
        "The original transformation applies to body proportions, maturity, pose energy, rendering quality, and detail density; it must not invent a new equipment design when source equipment is visible.",
        "The character should look like a meticulous, scaled-up, full-size anime key-art version of the specific source character. All visible source character elements should be present and correct unless they are screenshot UI or background.",
        "This is a major redesign, not an image cleanup. Do not trace, upscale, or lightly repaint the reference image.",
        "Strict body proportion: remove SD/chibi proportions and redraw as a 12-to-14-heads-tall character with an extremely tall body, exceptionally long legs, balanced anatomy, and a sharp readable silhouette.",
        "Make the redesigned character noticeably tall and long-legged, with high-fashion runway-model vertical proportions while still looking like a polished real 2D manga fantasy character.",
        "Prioritize leg length and overall height: the legs should occupy more than half of the full body height, with an elevated waistline, long thighs, long lower legs, and a graceful tall stance.",
        "Use a very small head-to-body ratio: the head and face must be visibly smaller than typical anime proportions, creating a 12-to-14-heads-tall silhouette.",
        "Use a smaller, refined anime face and a small head relative to the full body, while keeping the face attractive and recognizable.",
        "Make the character feel tall at first glance through a small refined face, long neck, high waistline, elongated torso, and very long legs.",
        "Use a slightly low camera angle and vertical full-body framing with enough space above the head and below the feet to emphasize height.",
        "The final image must be unmistakably non-chibi: small-to-normal head size, adult heroic torso, long arms, very long legs, realistic anime-fantasy anatomy, and no mascot-like body.",
        "Use serious Japanese light-novel cover illustration quality: high-end real 2D manga/anime fantasy art, premium gacha character illustration, dramatic atmosphere, strong contrast, refined shadows, cool gaze, cinematic fantasy presence, and polished illustrated rendering.",
        "Even if another art style is selected, prioritize a serious light-novel-cover-like cool finish for this conversion mode.",
        "For this SD-to-tall real 2D manga conversion mode, fix the age impression at around 20 years old regardless of the original SD character's childlike proportions.",
        "Make the redesigned character an attractive Japanese isekai anime-style bishounen or beautiful woman. The face must be refined, beautiful, cool, and appealing rather than cute-childlike.",
        "Make the expression sharp, calm, confident, and intense rather than cute, innocent, cheerful, or playful.",
        "Preserve the source SD character identity aggressively: hairstyle, bangs, hair color, eye color, outfit motifs, color palette, accessories, symbolic items, right-hand equipment shape, left-hand equipment shape, and overall personality.",
        "Preserve identity, design motifs, character-only pose, facing direction, right-hand and left-hand equipment placement, and the source character's readable silhouette arrangement; do not preserve the screenshot UI, background, lighting, short body, oversized head, stubby limbs, or toy-like silhouette.",
        "When converting the SD pose into tall real 2D anatomy, keep the same overall stance, torso direction, head direction, arm positions, hand-held item positions, each equipment item's angle and placement, cape flow, and vertical character framing as much as possible.",
        "Preserve the extracted equipment silhouette and motif placement strongly.",
        "Treat visible source equipment as locked design assets: keep armor panel shapes, each hand-held equipment silhouette and outline, crest or emblem placement, trim colors, motif positions, and left/right hand equipment assignment as faithful as possible to the reference.",
        "Preserve specific patterns and markings from the source character, including filigree, trim shapes, repeated decorative motifs, emblem geometry, cape edge designs, armor panel markings, and color-blocking.",
        "Preserve right-hand equipment and left-hand equipment separately and faithfully. Keep which item belongs to the right hand and which item belongs to the left hand unless the source image is genuinely ambiguous.",
        "For each hand-held item, preserve the distinctive category, silhouette, size relationship, outline, item-specific shape, grip/handle/attachment design, ornament placement, emblem position if present, color palette, material impression, and repeated motifs from the source SD character.",
        "Do not swap the left-hand and right-hand equipment, merge them into one item, remove one item, replace them with generic hand-held items, or simplify the hand equipment into vague fantasy props.",
        "When adapting SD hand-held equipment into real 2D proportions, upscale and refine the original designs while keeping them immediately recognizable as the same right-hand and left-hand equipment.",
        "The equipment should look like a polished full-size upgrade of the source equipment, not newly invented original armor or newly invented hand-held items.",
        "If high-rarity fantasy styling conflicts with source equipment fidelity, prioritize the source-specific equipment shapes, motif placement, and color layout.",
        "Do not replace the source equipment with generic angel armor, generic paladin armor, or generic holy knight armor.",
        "Keep the source character's distinctive right-hand equipment shape, left-hand equipment shape, equipment size relationships, crest or emblem patterns, cape layout, wing ornaments, armor panel arrangement, shoulder armor outline, chest emblem placement, waist cloth shape, and repeated motif rhythm.",
        "Upgrade the costume into detailed layered fantasy game attire while keeping the original design motifs recognizable: ornate trims, elegant cloth, light armor accents, polished ornaments, and clean anime illustration texture.",
        "Increase detail density and polish while preserving the source design; do not simplify the costume into a cleaner but less recognizable outfit.",
        "Use a beautiful Japanese isekai anime-style face with refined attractive features and a confident cool expression. Make the character look stylish, heroic, and high-rarity, while still clearly being the same character.",
        "Show the entire body from head to feet. Do not make a face close-up, bust-up, upper-body-only image, or cropped hand-held equipment.",
        "Avoid two-head-tall, three-head-tall, eight-heads-tall average height, ten-heads-tall average height, chibi, mascot, toy-like, mini-character proportions, childish body, cute face, baby face, round cheeks, innocent eyes, soft smile, playful pose, mascot charm, childlike charm, chibi cuteness, large face, large head, short neck, low waistline, oversized head, tiny limbs, short legs, squat silhouette, simple costume, low detail, weak silhouette, generic fantasy outfit, losing the original design, losing the source character pose and equipment arrangement, copying screenshot UI, copying screenshot background, copying unrelated layout elements, recreating a finished sample, bulky realistic armor, heavy CG render, gritty realism, or western photoreal fantasy.",
      ],
      finalGoal:
        "Create a full-body real 2D manga/anime fantasy version of the same SD/chibi character with a very tall 12-to-14-heads-tall body and exceptionally long legs, like an official high-rarity fantasy RPG character key visual.",
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
  const userSdToRealGender = pickString(payload.tpl_character_sd_to_real_gender) ||
    pickString(payload.sd_to_real_gender) ||
    pickString(payload.character_gender);
  const userExpressionTransform =
    pickString(payload.tpl_character_expression_transform) ||
    pickString(payload.character_expression_transform);
  const backgroundMode = pickString(payload.background_mode);
  const backgroundInstruction = pickString(payload.background_instruction);
  const backgroundRelativePrompt = pickString(payload.background_relative_prompt);
  const sourceCharacterFeaturesText = pickString(
    payload.source_character_features_text,
  );
  const modeConversion = getCharacterModeConversionInstructions(
    userModeConversion,
  );
  const isSdToReal2D = isSdToReal2DConversionMode(userModeConversion);

  const preserveLines: string[] = [];
  pushIf(
    preserveLines,
    "Extracted source SD character features to preserve",
    sourceCharacterFeaturesText,
  );
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
  if (isSdToReal2D && userSdToRealGender === "男性") {
    changeLines.push(
      "Target gender for this SD-to-real 2D conversion: male. Redesign the character as a clearly male, attractive Japanese isekai anime-style bishounen or heroic young man.",
    );
    changeLines.push(
      "Do not feminize the character. Avoid a female body, feminine bust, feminine hips, dress-like feminine redesign, or a beautiful-woman face unless explicitly requested elsewhere.",
    );
  }
  if (isSdToReal2D && userSdToRealGender === "女性") {
    changeLines.push(
      "Target gender for this SD-to-real 2D conversion: female. Redesign the character as a clearly female, attractive Japanese isekai anime-style beautiful woman.",
    );
  }
  if (isSdToReal2D && userSdToRealGender === "その他") {
    changeLines.push(
      "Target gender for this SD-to-real 2D conversion: other / androgynous. Keep the character stylish and appealing without forcing a clearly male or clearly female redesign.",
    );
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
    ? "Use the provided reference image only as a source-character identity reference unless the mode-specific instructions say otherwise. For SD-to-tall real 2D manga conversion, do not use it as a style sample, finished-image sample, pose sample, composition sample, or target image."
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
        "Reference image. Use it only to identify the source character's recognizable design motifs. Do not copy or recreate the reference image, and do not use it as a finished-image sample, style sample, pose sample, composition sample, target image, screenshot layout, background, UI, text, buttons, dates, or icons.",
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

async function extractSourceCharacterFeatures(params: {
  apiKey: string;
  model: string;
  referenceImageBase64: string;
  referenceImageMimeType: string;
}) {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`;
  const extractionPrompt = `
Analyze the provided SD/chibi character image and extract reusable character design information for a later text-to-image generation.

This is pass 1: make a detailed source-character observation record. Accuracy is more important than brevity.

Important:
- Do not describe the background, screenshot UI, borders, text, buttons, dates, icons, or layout.
- Do not describe the original chibi body proportion as something to preserve.
- Do not instruct the next model to copy the screenshot, UI, background, lighting, or unrelated layout elements.
- Extract the character-only pose and composition: facing direction, head direction, torso angle, stance, arm positions, hand positions, each hand-held equipment item's angle and placement, cape flow, ornament placement, and how the character is framed in the image.
- Describe the pose in transferable terms so it can be adapted from SD/chibi anatomy into a tall real 2D manga body without changing the character's recognizable stance.
- Focus on identity and design motifs that should survive a redesign into a serious tall real 2D manga/anime character.
- For face accessories, identify the exact category and coverage: eyepatch, monocle, visor, mask, blindfold, face paint, circlet, forehead ornament, mouth-covering collar, scarf, or other. State which eye/side is covered, which eye remains visible, and whether the mouth/nose/forehead are covered. Do not generalize a one-eye accessory into a full eye mask or blindfold.
- Describe the equipment silhouette in detail, not only its category.
- Identify right-hand equipment and left-hand equipment separately whenever visible. If the image is mirrored or ambiguous, state the uncertainty instead of guessing.
- For each hand-held item, capture the category, silhouette, outline, size relationship, item-specific shape, grip/handle/attachment design, emblem placement if present, ornament placement, colors, materials, and repeated motifs.
- For each hand-held item, state whether it is large or small relative to the character, where it sits in the frame, what parts are occluded by the body/clothes/UI, and which details are still visible. Do not replace a partially hidden item with a more common fantasy item.
- Capture distinctive shapes: shoulder armor outline, chest armor emblem, waist cloth shape, cape shape, right-hand equipment outline, left-hand equipment outline, equipment emblem placement if present, equipment attachment/grip shape, wing ornament placement, and repeated color/pattern motifs.
- Describe visible equipment geometry literally enough that a later model can preserve it as a locked design asset instead of inventing original equipment.
- Capture source-specific decorative details literally: filigree, trim shape, color-blocking, cape edge patterns, armor panel markings, emblem geometry, ornament positions, and repeated motif rhythm.
- Mark any major visible source-character elements that must remain present in the final full-size redesign.
- Avoid generic angel knight, generic paladin, or generic holy knight redesign. Preserve the source character's unique equipment layout and motif arrangement.

Return detailed English bullet points for:
- hair style, bangs, hair color
- eye color and eye impression
- face identity motifs, face accessories, exact eye/face coverage, and what must not be turned into a different face accessory
- outfit motifs, armor/clothing parts, equipment silhouette, motif placement, color palette
- character-only pose, facing direction, right-hand and left-hand equipment placement, cape flow, and vertical framing
- right-hand equipment design, if visible
- left-hand equipment design, if visible
- accessories, head ornaments, wings, cape, right-hand equipment outline, left-hand equipment outline, equipment emblem placement if present, equipment grip or attachment shape, symbolic items
- personality impression to preserve as a serious/cool redesign
`.trim();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "Source SD/chibi character image for feature extraction only. Extract design motifs as text; do not generate or copy an image.",
            },
            {
              inlineData: {
                mimeType: params.referenceImageMimeType || "image/png",
                data: params.referenceImageBase64,
              },
            },
            { text: extractionPrompt },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT"],
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Gemini feature extraction error: ${JSON.stringify(data)}`);
  }

  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  const text = candidates
    .flatMap((candidate: any) => candidate?.content?.parts ?? [])
    .filter((part: any) => typeof part?.text === "string" && part.text.trim())
    .map((part: any) => part.text.trim())
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Gemini feature extraction returned no text.");
  }

  return text;
}

async function verifySourceCharacterFeaturesForReal2D(params: {
  apiKey: string;
  model: string;
  referenceImageBase64: string;
  referenceImageMimeType: string;
  rawFeaturesText: string;
}) {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${params.apiKey}`;
  const verificationPrompt = `
You are preparing the final source-preservation brief for converting an SD/chibi game character into a tall, serious, real 2D manga/anime character.

This is pass 2: verify the raw observation notes against the image, correct over-generalizations, and rewrite them as a preservation brief for the image-generation model.

Critical checks:
- Keep right-hand equipment and left-hand equipment separate. Do not change either item's category, silhouette, size relationship, position, angle, visible details, or partial occlusion.
- If a hand-held item is partially hidden, preserve the visible part and explicitly say not to replace it with a cleaner or more common fantasy item.
- Verify face accessories carefully. Distinguish one-eye accessories from full masks or blindfolds. Preserve which eye/side is covered, which eye remains visible, and whether the mouth, nose, forehead, or cheeks are actually covered.
- If the source has an eyepatch, monocle, one-eye visor, or asymmetric face ornament, do not convert it into a full eye mask, blindfold, or symmetrical face covering.
- If a high collar, scarf, cape, hair, or shoulder part hides the mouth or lower face, describe that as clothing/hair occlusion, not as a face mask unless a face mask is clearly visible.
- Preserve source-specific decorations: trim shapes, color blocking, repeated motifs, emblem geometry, cape edge designs, armor panel markings, ornaments, and motif rhythm.
- Preserve character-only pose, facing direction, hand positions, equipment placement, cape flow, and vertical framing while ignoring screenshot UI and background.
- Do not invent missing details. If uncertain, state the uncertainty and preserve only the visible evidence.

Raw observation notes:
${params.rawFeaturesText}

Return a detailed but usable English preservation brief with these headings:
- Verified identity and face
- Verified face accessories and coverage
- Verified outfit, armor, cape, and motifs
- Verified right-hand equipment
- Verified left-hand equipment
- Verified pose and character-only composition
- Must-preserve checklist
- Must-not-change warnings
`.trim();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "Verify this source character against the image and produce a preservation brief for SD-to-real 2D conversion.",
            },
            {
              inlineData: {
                mimeType: params.referenceImageMimeType || "image/png",
                data: params.referenceImageBase64,
              },
            },
            { text: verificationPrompt },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT"],
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Gemini feature verification error: ${JSON.stringify(data)}`);
  }

  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
  const text = candidates
    .flatMap((candidate: any) => candidate?.content?.parts ?? [])
    .filter((part: any) => typeof part?.text === "string" && part.text.trim())
    .map((part: any) => part.text.trim())
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Gemini feature verification returned no text.");
  }

  return text;
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

    const userModeConversion = pickString(payload.tpl_character_mode_conversion) ||
      pickString(payload.character_mode_conversion);
    const useTextOnlySourceFeatures =
      isSdToReal2DConversionMode(userModeConversion) && Boolean(referenceImageBase64);
    let sourceCharacterFeaturesText = "";
    let rawSourceCharacterFeaturesText = "";

    if (useTextOnlySourceFeatures) {
      rawSourceCharacterFeaturesText = await extractSourceCharacterFeatures({
        apiKey: GEMINI_API_KEY,
        model: GEMINI_IMAGE_MODEL,
        referenceImageBase64,
        referenceImageMimeType,
      });
      sourceCharacterFeaturesText = await verifySourceCharacterFeaturesForReal2D({
        apiKey: GEMINI_API_KEY,
        model: GEMINI_IMAGE_MODEL,
        referenceImageBase64,
        referenceImageMimeType,
        rawFeaturesText: rawSourceCharacterFeaturesText,
      });
      payload.source_character_features_text = sourceCharacterFeaturesText;
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
      sourceFeatureExtractionUsed: useTextOnlySourceFeatures,
      sourceCharacterFeaturesText,
      rawSourceCharacterFeaturesText,
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
