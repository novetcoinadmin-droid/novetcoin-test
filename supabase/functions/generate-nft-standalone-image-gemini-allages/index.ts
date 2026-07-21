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

function stringifyPromptValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value || "").trim();
  }
}

function buildHandEquipmentVisualLockLines(payload: Record<string, any>) {
  const extraction = payload.sd_to_real2d_extraction || {};
  const confirmed = extraction.confirmed_parameters || {};
  const right = confirmed.right_hand_weapon || {};
  const left = confirmed.left_hand_equipment || {};
  const lines: string[] = [];

  const buildItemLine = (
    label: string,
    item: Record<string, unknown>,
    handRule: string,
  ) => {
    const finalValue = stringifyPromptValue(
      item.user_override || item.final_value || item.ai_estimate,
    );
    const japanese = stringifyPromptValue(item.ai_estimate_japanese);
    const occlusion = stringifyPromptValue(item.occlusion_note);
    const anti = stringifyPromptValue(item.anti_misread_note);
    const confidence = stringifyPromptValue(item.confidence);

    if (!finalValue && !japanese && !occlusion && !anti) return;

    lines.push(`${label} confirmed extraction: ${finalValue}`);
    if (japanese) lines.push(`${label} Japanese user-check summary: ${japanese}`);
    if (confidence) lines.push(`${label} confidence: ${confidence}`);
    if (occlusion) lines.push(`${label} crop/hidden note: ${occlusion}`);
    if (anti) lines.push(`${label} wrong-conversion warning: ${anti}`);
    lines.push(handRule);
  };

  buildItemLine(
    "Right-hand equipment",
    right,
    "Right-hand equipment visual lock: keep it in the character's right hand. Use the reference image as a localized image-to-image visual anchor for this equipment only: match the visible silhouette, outer contour, tip/base shape, grip connection, angle, screen-side position, size relationship, color blocking, emblem placement, and cropped/hidden parts as closely as possible while redrawing it as polished real 2D fantasy equipment.",
  );
  buildItemLine(
    "Left-hand equipment",
    left,
    "Left-hand equipment visual lock: keep it in the character's left hand. Use the reference image as a localized image-to-image visual anchor for this equipment only: match the visible silhouette, outer contour, angle, position against the body, size relationship, emblem/pattern placement, color blocking, and cropped/hidden parts as closely as possible while redrawing it as polished real 2D fantasy equipment.",
  );

  if (lines.length) {
    lines.unshift(
      "Localized equipment image-to-image fidelity mode: for clearly visible right-hand and left-hand equipment, prioritize direct visual fidelity to the provided reference image over generic fantasy redesign.",
      "This localized equipment fidelity applies only to hand-held equipment and nearby grips/hands; it does not mean copying the full screenshot, background, UI, lighting, or SD body proportions.",
      "Do not replace visible hand-held equipment with a cleaner, more common, or more generic weapon/shield/staff/book. If the category is uncertain, preserve the visible geometry first.",
      "Do not swap right-hand and left-hand equipment. Do not merge them, remove one, or move them to the opposite hand.",
    );
  }

  return lines;
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

function isSdToPhotorealIntermediateMode(mode: string) {
  return Boolean(
    mode &&
      mode.includes("10頭身") &&
      (mode.includes("実写") || mode.includes("フォトリアル")),
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

  if (isSdToPhotorealIntermediateMode(mode)) {
    return {
      composition:
        "full-body vertical photorealistic live-action cosplay photograph, one complete exactly 10-heads-tall adult character, the whole body visible from head to feet",
      lines: [
        "Use Image-to-Image transformation. Keep and change instructions are separated below.",
        "KEEP: Preserve the reference image pose, composition, camera angle, hairstyle, hair color, hair ornaments, outfit design, outfit colors, decorations, cape, right-hand item, left-hand item, item positions, item angles, left/right assignment, and character motifs.",
        "CHANGE: Convert the SD/chibi character into a high-resolution photorealistic cosplay-style photograph of a tall adult fashion-model type, age 25 or older. Use realistic skin, fabric, metal, leather, and ornament materials. Use a small head, long legs, high waistline, long neck, broader adult shoulders, adult bone structure, and mature adult facial proportions.",
        "FACE: Follow the selected gender. Male means a handsome Korean-idol-style adult male face. Female means a beautiful Korean-idol-style adult female face. Other means an androgynous Korean-idol-style beautiful adult face.",
        "DO NOT: Do not keep the result as SD, chibi, anime illustration, game screenshot, upscaled source image, child body, childlike face, oversized head, short limbs, short legs, low waistline, mascot body, or childish softness.",
        "Do not resemble any real celebrity, public figure, named character, franchise character, or specific private person.",
      ],
      finalGoal:
        "Create a photorealistic cosplay-style photograph of the same character as a 25-or-older tall adult fashion-model type, preserving pose, hairstyle, costume design, and equipment layout while changing SD/chibi rendering into live-action realism.",
    };
  }
  if (isSdToReal2DConversionMode(mode)) {
    return {
      composition:
        "full-body vertical real 2D manga character key visual, one complete extremely tall exactly 14-heads-tall anime-realistic fantasy character, the whole body visible from head to feet",
      lines: [
        "Character mode conversion: transform the source SD/chibi character into a tall, elegant, full-body real 2D manga character.",
        "Use the SD/chibi character as the source for identity and design motifs: hairstyle, bangs, hair color, eye color, outfit motifs, color palette, accessories, symbolic items, hand-held equipment shapes, and overall personality.",
        "Preserve only the source SD character's design motifs, not its cute emotional tone.",
        "Remove cute, childish, mascot-like, soft, round, playful, cheerful, innocent, and comedic impressions from the SD character.",
        "Convert the character's mood into a serious, cool, dramatic, heroic real 2D manga/anime character.",
        "Prioritize coolness, dignity, intensity, and stylish heroic presence over cuteness.",
        "Use any provided reference image as a relative source-character reference: read it directly for identity, motifs, face accessories, hand-held equipment, pose logic, and layout relationships, but do not use it as a fixed image/composition/background copy target.",
        "If the reference image contains a taller 2D character sample, ignore that taller sample completely; do not copy its face, pose, outfit, background, composition, lighting, proportions, or overall layout.",
        "Create a new original transformation from the SD character instead of recreating, tracing, or imitating any finished sample image, while keeping the source character's pose logic and character-only composition recognizable.",
        "The original transformation applies to body proportions, maturity, pose energy, rendering quality, and detail density; it must not invent a new equipment design when source equipment is visible.",
        "The character should look like a meticulous, scaled-up, full-size anime key-art version of the specific source character. All visible source character elements should be present and correct unless they are screenshot UI or background.",
        "This is a major redesign, not an image cleanup. Do not trace, upscale, or lightly repaint the reference image.",
        "Strict body proportion: remove SD/chibi proportions and redraw as an exactly 14-heads-tall character with an extremely tall body, exceptionally long legs, balanced anatomy, and a sharp readable silhouette.",
        "Non-negotiable proportion lock: the full body height must measure about 14 head-heights. The head should be about 1/14 of the full body height, visibly smaller than normal anime proportions.",
        "Make the redesigned character noticeably tall and long-legged, with high-fashion runway-model vertical proportions while still looking like a polished real 2D manga fantasy character.",
        "Prioritize leg length and overall height: the legs should occupy roughly 62 to 68 percent of the full body height, with an elevated waistline, long thighs, long lower legs, and a graceful tall stance.",
        "Use a very small head-to-body ratio: the head and face must be visibly smaller than typical anime proportions, creating an exactly 14-heads-tall silhouette.",
        "Use fashion-illustration croquis proportions rather than normal character-sheet proportions: tiny refined head, long neck, narrow upper torso, high waist, elongated arms, and extremely long legs.",
        "Use a smaller, refined anime face and a small head relative to the full body, while keeping the face attractive and recognizable.",
        "Preserve face identity details but do not preserve the SD character's large head, large eyes, round cheeks, cute facial proportions, or childlike face scale.",
        "Make the character feel tall at first glance through a small refined face, long neck, high waistline, elongated torso, and very long legs.",
        "Use a slightly low camera angle and vertical full-body framing with enough space above the head and below the feet to emphasize height.",
        "The final image must be unmistakably non-chibi and unmistakably not normal 7-to-10-head anime proportion: tiny head, adult heroic torso, long arms, very long legs, realistic anime-fantasy anatomy, and no mascot-like body.",
        "Use serious Japanese light-novel cover illustration quality: high-end real 2D manga/anime fantasy art, premium gacha character illustration, dramatic atmosphere, strong contrast, refined shadows, cool gaze, cinematic fantasy presence, and polished illustrated rendering.",
        "Even if another art style is selected, prioritize a serious light-novel-cover-like cool finish for this conversion mode.",
        "For this SD-to-tall real 2D manga conversion mode, fix the age impression at around 20 years old regardless of the original SD character's childlike proportions.",
        "Make the redesigned character an attractive Japanese isekai anime-style bishounen or beautiful woman. The face must be refined, beautiful, cool, and appealing rather than cute-childlike.",
        "Make the expression sharp, calm, confident, and intense rather than cute, innocent, cheerful, or playful.",
        "Preserve the source SD character identity aggressively: hairstyle, bangs, hair color, eye color, outfit motifs, color palette, accessories, symbolic items, right-hand equipment shape, left-hand equipment shape, and overall personality.",
        "Follow the verified target parameter sheet when source character features are provided. Treat LOCKED parameters as non-negotiable, apply TRANSFORMED parameters only as specified, and do not re-interpret them into a more generic fantasy design. If the reference image contradicts a generated parameter sheet label, prefer the directly visible reference image category and coverage.",
        "Preserve identity, design motifs, character-only pose, facing direction, right-hand and left-hand equipment placement, and the source character's readable silhouette arrangement; do not preserve the screenshot UI, background, lighting, short body, oversized head, stubby limbs, or toy-like silhouette.",
        "When converting the SD pose into tall real 2D anatomy, keep the same overall stance, torso direction, head direction, arm positions, hand-held item positions, each equipment item's angle and placement, cape flow, and vertical character framing as much as possible.",
        "Preserve the extracted equipment silhouette and motif placement strongly.",
        "Treat visible source equipment as locked design assets: keep armor panel shapes, each hand-held equipment silhouette and outline, crest or emblem placement, trim colors, motif positions, and left/right hand equipment assignment as faithful as possible to the reference.",
        "Preserve specific patterns and markings from the source character, including filigree, trim shapes, repeated decorative motifs, emblem geometry, cape edge designs, armor panel markings, and color-blocking.",
        "Preserve right-hand equipment and left-hand equipment separately and faithfully. Keep which item belongs to the right hand and which item belongs to the left hand unless the source image is genuinely ambiguous.",
        "For each hand-held item, preserve the distinctive category, silhouette, size relationship, outline, item-specific shape, grip/handle/attachment design, ornament placement, emblem position if present, color palette, material impression, and repeated motifs from the source SD character.",
        "For complex hand-held equipment, preserve the tip shape, outer contour, inner cutouts or negative spaces, base/neck shape, widest and narrowest points, asymmetry, color borders, and how the item connects to the grip or shaft.",
        "Right-hand equipment fidelity is especially important when the item is large, cropped, close to the camera, or visually dominant in the source image.",
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
        "Avoid two-head-tall, three-head-tall, seven-heads-tall, eight-heads-tall, nine-heads-tall, ten-heads-tall, average anime height, normal character-sheet proportions, chibi, mascot, toy-like, mini-character proportions, childish body, cute face, baby face, round cheeks, innocent eyes, soft smile, playful pose, mascot charm, childlike charm, chibi cuteness, large face, large head, normal-sized anime head, short neck, low waistline, oversized head, tiny limbs, short legs, squat silhouette, simple costume, low detail, weak silhouette, generic fantasy outfit, losing the original design, losing the source character pose and equipment arrangement, copying screenshot UI, copying screenshot background, copying unrelated layout elements, recreating a finished sample, bulky realistic armor, heavy CG render, gritty realism, or western photoreal fantasy.",
      ],
      finalGoal:
        "Create a full-body real 2D manga/anime fantasy version of the same SD/chibi character with an exactly 14-heads-tall body and exceptionally long legs, like an official high-rarity fantasy RPG character key visual.",
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
  const isPhotorealIntermediate = isSdToPhotorealIntermediateMode(userModeConversion);
  const isSdToReal2D = isSdToReal2DConversionMode(userModeConversion);
  const handEquipmentVisualLockLines = isSdToReal2D
    ? buildHandEquipmentVisualLockLines(payload)
    : [];

  const preserveLines: string[] = [];
  pushIf(
    preserveLines,
    "Extracted source SD character features to preserve",
    sourceCharacterFeaturesText,
  );
  preserveLines.push(...handEquipmentVisualLockLines);
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
    ? isPhotorealIntermediate
      ? "Use the provided SD/chibi reference image as the direct Image-to-Image source. KEEP: same pose, same composition, same camera angle, facing direction, left/right equipment assignment, equipment angles, color palette, accessories, outfit motifs, equipment layout, and the reference hairstyle. CHANGE: convert the character into a high-resolution photorealistic cosplay-style photograph of a 25-or-older tall adult fashion-model type with Korean-idol-style beautiful facial features matching the selected gender. Transformation priority: the live-action photoreal adult body and exactly 10-heads-tall model proportions are mandatory even if the source silhouette becomes less exact. Keep design details, but do not keep the SD silhouette. DO NOT keep SD/chibi/anime/game-screenshot appearance, child body, childlike face, oversized head, short limbs, short legs, low waistline, or upscaled-original look. Do not copy screenshot UI, text, buttons, or frames."
      : isSdToReal2D
        ? "Use the provided reference image as the source-character identity reference. For SD-to-tall real 2D manga conversion, do not copy the full screenshot, background, UI, lighting, SD body proportions, or finished composition. However, for clearly visible right-hand and left-hand equipment, use the reference image as a localized image-to-image visual anchor and preserve the equipment geometry, hand assignment, angle, position, and silhouette as directly as possible."
        : "Use the provided reference image only as a source-character identity reference unless the mode-specific instructions say otherwise."
    : "No reference image is provided. Create a new original character from the text instructions.";

  return `
${referenceInstruction}

${isPhotorealIntermediate ? "Generate one all-ages photorealistic live-action cosplay photograph." : "Generate one all-ages character image."}

Important rules:
- Keep it all-ages only.
- Do not add explicit or sexual content.
- Do not create multiple people unless the user explicitly requests it.
${isPhotorealIntermediate ? "- Output must look like a real photographed adult cosplayer, not an anime illustration, 3D game render, or upscaled source screenshot." : "- Prefer a clean, high-quality finished illustration."}
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
        "Reference image for Image-to-Image transformation. Use this image to preserve pose, composition, camera angle, hairstyle, outfit design, cape, hand-held items, item positions, item angles, left/right assignment, motif placement, and character identity. Change SD/chibi/anime rendering into a photorealistic adult cosplay photograph. Do not copy screenshot UI, text, buttons, dates, or icons.",
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

This is pass 1: make a detailed, parameterized source-character observation record. Accuracy and explicit fields are more important than brevity.

Important:
- Do not describe the background, screenshot UI, borders, text, buttons, dates, icons, or layout.
- Do not describe the original chibi body proportion as something to preserve.
- Do not instruct the next model to copy the screenshot, UI, background, lighting, or unrelated layout elements.
- Extract the character-only pose and composition: facing direction, head direction, torso angle, stance, arm positions, hand positions, each hand-held equipment item's angle and placement, cape flow, ornament placement, and how the character is framed in the image.
- Describe the pose in transferable terms so it can be adapted from SD/chibi anatomy into a tall real 2D manga body without changing the character's recognizable stance.
- Focus on identity and design motifs that should survive a redesign into a serious tall real 2D manga/anime character.
- Separate face identity from SD/chibi face proportions. Record hair, bangs, eye color, gaze direction, face accessory placement, and expression motifs, but mark large head size, large eye scale, round cheeks, cute proportions, and childish softness as things that must not be preserved in the tall redesign.
- For face accessories, identify the exact category and coverage: eyepatch, single-eye visor, monocle, face paint, circlet, forehead ornament, mouth-covering collar, scarf, full mask, blindfold, or other. If only one eye is covered and the other eye is visible, classify it as an eyepatch or single-eye accessory first, not as a mask. Use "mask" only when a broad face covering spans both eyes or large symmetric face areas. State which eye/side is covered, which eye remains visible, and whether the mouth/nose/forehead/cheeks are covered.
- Split adjacent face elements into separate parameters: one-eye covering, forehead ornament/circlet, hair overlap, high collar/scarf mouth occlusion, and cheek/nose visibility. Do not merge these into one decorative mask.
- Describe the equipment silhouette in detail, not only its category.
- Identify right-hand equipment and left-hand equipment separately whenever visible. If the image is mirrored or ambiguous, state the uncertainty instead of guessing.
- For hand-held equipment, do not over-trust a generic category label. The category may be uncertain; the locked part is the visible geometry, silhouette, hand assignment, size ratio, and placement.
- For each hand-held item, capture the category, silhouette, outline, size relationship, item-specific shape, grip/handle/attachment design, emblem placement if present, ornament placement, colors, materials, and repeated motifs.
- For each complex hand-held item, break down the geometry into parts: tip shape, outer edge contour, inner edge contour, cutouts or negative spaces, base/neck shape, connector to the grip/shaft, widest point, narrowest point, asymmetry, color borders, and any dangling or secondary parts.
- If one hand-held item is visually dominant, cropped, very large, or close to the camera, describe it with extra detail and say it must remain the same recognizable item after scaling up.
- For each hand-held item, state whether it is large or small relative to the character, where it sits in the frame, what parts are occluded by the body/clothes/UI, and which details are still visible. Do not replace a partially hidden item with a more common fantasy item.
- Capture distinctive shapes: shoulder armor outline, chest armor emblem, waist cloth shape, cape shape, right-hand equipment outline, left-hand equipment outline, equipment emblem placement if present, equipment attachment/grip shape, wing ornament placement, and repeated color/pattern motifs.
- Describe visible equipment geometry literally enough that a later model can preserve it as a locked design asset instead of inventing original equipment.
- Capture source-specific decorative details literally: filigree, trim shape, color-blocking, cape edge patterns, armor panel markings, emblem geometry, ornament positions, and repeated motif rhythm.
- Mark any major visible source-character elements that must remain present in the final full-size redesign.
- Avoid generic angel knight, generic paladin, or generic holy knight redesign. Preserve the source character's unique equipment layout and motif arrangement.

Return a parameterized English source record. Use this format for every relevant field:
- parameter_name:
  source_value: literal visual observation from the image
  preserve_lock: what must stay recognizable after conversion
  transform_allowed: what may change only because SD/chibi anatomy becomes tall real 2D anatomy
  transform_forbidden: specific wrong conversions to avoid
  confidence: high / medium / low

Required parameter groups:
- identity.hair
- identity.eyes_and_gaze
- identity.face_shape_to_transform
- face_accessory.category_and_side
- face_accessory.coverage_map
- face_accessory.must_not_become
- outfit.upper_body
- outfit.lower_body
- outfit.cape_or_back_cloth
- outfit.color_blocking
- outfit.trim_and_pattern_motifs
- pose.character_only_stance
- pose.facing_and_head_direction
- pose.hand_positions
- right_hand_equipment.category
- right_hand_equipment.category_confidence_and_alternatives
- right_hand_equipment.frame_position
- right_hand_equipment.size_relationship
- right_hand_equipment.outer_silhouette
- right_hand_equipment.inner_contour_and_negative_space
- right_hand_equipment.tip_base_grip_connection
- right_hand_equipment.colors_materials_patterns
- right_hand_equipment.must_not_become
- left_hand_equipment.category
- left_hand_equipment.category_confidence_and_alternatives
- left_hand_equipment.frame_position
- left_hand_equipment.size_relationship
- left_hand_equipment.outer_silhouette
- left_hand_equipment.inner_contour_and_negative_space
- left_hand_equipment.grip_attachment_or_emblem
- left_hand_equipment.colors_materials_patterns
- left_hand_equipment.must_not_become
- accessories.head_ornaments
- accessories.symbolic_items
- final_presence_checklist
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
You are preparing the final parameter sheet for converting an SD/chibi game character into a tall, serious, real 2D manga/anime character.

This is pass 2: verify the source parameters against the image, correct over-generalizations, then convert the source parameters into target real-2D parameters for the image-generation model.

Think in this order:
1. Check the source image again.
2. Correct any wrong source parameter, especially face accessory category/coverage and right/left hand equipment.
3. For each parameter, decide whether it is LOCKED, TRANSFORMED, or REMOVED.
4. Rewrite the result as final target parameters, not as loose prose.

Critical checks:
- Body proportion is non-negotiable: target.body_proportions must specify an exactly 14-heads-tall full-body real 2D character, with the head about 1/14 of total height, very small refined head, long neck, high waist, elongated arms, and legs occupying roughly 62 to 68 percent of full body height.
- Do not allow normal 7-to-10-head anime proportions, average character-sheet proportions, large anime head, low waistline, or short legs in the target parameter sheet.
- Keep right-hand equipment and left-hand equipment separate. Do not change either item's category, silhouette, size relationship, position, angle, visible details, or partial occlusion.
- If an equipment category label is uncertain or conflicts with the visible geometry, keep the geometry locked and lower the category confidence instead of forcing a common item category.
- For each hand-held item, verify the geometry part by part: tip, outer contour, inner contour, negative spaces, base/neck, connector to grip/shaft, widest point, narrowest point, asymmetry, color borders, and secondary dangling or attached parts.
- If the right-hand equipment is dominant, cropped, or close to the camera, give it a high-priority preservation warning and describe the exact silhouette that must not be simplified.
- If a hand-held item is partially hidden, preserve the visible part and explicitly say not to replace it with a cleaner or more common fantasy item.
- Verify face accessories carefully. Distinguish one-eye accessories from full masks or blindfolds. If only one eye is covered and the other eye is visible, the target category should be eyepatch / single-eye accessory / one-eye visor, not full mask. Preserve which eye/side is covered, which eye remains visible, and whether the mouth, nose, forehead, or cheeks are actually covered.
- If the source has an eyepatch, monocle, one-eye visor, or asymmetric face ornament, do not put "eyepatch" or "one-eye accessory" into the negative prompt. The negative prompt should forbid full eye mask, blindfold, symmetrical mask, covering both eyes, covering the visible eye, or covering the mouth/cheeks when those are uncovered.
- If a high collar, scarf, cape, hair, or shoulder part hides the mouth or lower face, describe that as clothing/hair occlusion, not as a face mask unless a face mask is clearly visible.
- Separate forehead ornament/circlet from the eye-covering accessory. Do not merge forehead gold ornaments, hair, and one-eye covering into a single ornate mask parameter.
- Verify mature-face conversion separately from identity preservation. Preserve hairstyle, bangs, eye color, gaze, face accessories, and expression motifs, but explicitly warn not to preserve large SD head size, oversized eyes, round cheeks, cute face scale, or childish softness.
- Preserve source-specific decorations: trim shapes, color blocking, repeated motifs, emblem geometry, cape edge designs, armor panel markings, ornaments, and motif rhythm.
- Preserve character-only pose, facing direction, hand positions, equipment placement, cape flow, and vertical framing while ignoring screenshot UI and background.
- Do not invent missing details. If uncertain, state the uncertainty and preserve only the visible evidence.

Raw source parameters:
${params.rawFeaturesText}

Return the final target parameter sheet in English. Use this format for every important item:
- parameter_name:
  source_verified: corrected source observation
  conversion_decision: LOCKED / TRANSFORMED / REMOVED
  target_real_2d_value: how it should appear in the tall real 2D character
  preservation_priority: critical / high / medium / low
  negative_prompt_fragment: specific wrong result to avoid

Required target parameter groups:
- target.identity.hair
- target.identity.eyes_gaze_and_expression
- target.identity.mature_face_proportions
- target.face_accessory.category_side_and_coverage
- target.face_accessory.negative_conversions
- target.face_accessory.separate_adjacent_elements
- target.body_proportions
- target.outfit.upper_body
- target.outfit.lower_body
- target.outfit.cape_or_back_cloth
- target.outfit.trim_color_and_motif_layout
- target.pose.stance_facing_hands
- target.right_hand_equipment.category_and_assignment
- target.right_hand_equipment.category_confidence_and_alternatives
- target.right_hand_equipment.silhouette_geometry
- target.right_hand_equipment.scale_position_angle
- target.right_hand_equipment.detail_layout_and_materials
- target.right_hand_equipment.negative_conversions
- target.left_hand_equipment.category_and_assignment
- target.left_hand_equipment.category_confidence_and_alternatives
- target.left_hand_equipment.silhouette_geometry
- target.left_hand_equipment.scale_position_angle
- target.left_hand_equipment.detail_layout_and_materials
- target.left_hand_equipment.negative_conversions
- target.accessories.head_ornaments_and_symbolic_items
- target.must_preserve_checklist
- target.must_not_change_checklist
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
