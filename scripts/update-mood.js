#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const GENERATED_DIR = path.join(DOCS_DIR, 'generated');
const STATE_PATH = path.join(DOCS_DIR, 'state.json');
const STYLE_HISTORY_PATH = path.join(DOCS_DIR, 'style-history.json');

function parseArgs(argv) {
  const args = argv.slice(2);
  const out = {
    mood: '',
    caption: '',
    imageUrl: '',
    command: '',
    model: process.env.MOOD_IMAGE_MODEL || 'gpt-image-1',
    size: process.env.MOOD_IMAGE_SIZE || '1536x1024',
    quality: process.env.MOOD_IMAGE_QUALITY || 'high',
    forceFallback: false
  };

  if (!args.length) return out;

  const first = args.join(' ').trim();
  if (/^mood\s*:/i.test(first)) {
    out.command = first;
    out.mood = first.replace(/^mood\s*:/i, '').trim();
    return out;
  }

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    const next = args[i + 1];

    if (token === '--mood' && next) {
      out.mood = next.trim(); i += 1;
    } else if (token === '--caption' && next) {
      out.caption = next.trim(); i += 1;
    } else if ((token === '--image' || token === '--image-url') && next) {
      out.imageUrl = next.trim(); i += 1;
    } else if (token === '--command' && next) {
      out.command = next.trim(); i += 1;
    } else if (token === '--model' && next) {
      out.model = next.trim(); i += 1;
    } else if (token === '--size' && next) {
      out.size = next.trim(); i += 1;
    } else if (token === '--quality' && next) {
      out.quality = next.trim(); i += 1;
    } else if (token === '--fallback') {
      out.forceFallback = true;
    }
  }

  if (!out.mood && out.command && /^mood\s*:/i.test(out.command)) {
    out.mood = out.command.replace(/^mood\s*:/i, '').trim();
  }

  return out;
}

function usageAndExit() {
  console.log(`\nUsage:\n  node scripts/update-mood.js "Mood: kootenays winter"\n  node scripts/update-mood.js --mood "kootenays winter" [--caption "..."] [--model gpt-image-1] [--size 1536x1024]\n  node scripts/update-mood.js --mood "..." --fallback   # skip OpenAI and use picsum\n`);
  process.exit(1);
}

function slugify(input) {
  return (input || 'mood')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'mood';
}

function deterministicMoodImageUrl(mood) {
  const seed = slugify(mood || 'abstract-mood-art');
  return `https://picsum.photos/seed/${seed}/1920/1080`;
}

function readStyleHistory() {
  try {
    return JSON.parse(fs.readFileSync(STYLE_HISTORY_PATH, 'utf8'));
  } catch {
    return { recent: [] };
  }
}

function writeStyleHistory(history) {
  fs.writeFileSync(STYLE_HISTORY_PATH, `${JSON.stringify(history, null, 2)}\n`, 'utf8');
}

function hashString(input) {
  return Array.from(String(input || '')).reduce((acc, ch, idx) => acc + ch.charCodeAt(0) * (idx + 1), 0);
}

function pickVariant(list, seed, recentValues = []) {
  const blocked = new Set(recentValues.filter(Boolean));
  const pool = list.filter((item) => !blocked.has(item.key));
  const available = pool.length ? pool : list;
  return available[seed % available.length];
}

function chooseStyleDirection(mood) {
  const directions = [
    {
      key: 'cinematic-afrofuturist',
      label: 'cinematic afrofuturist worldbuilding',
      artists: ['Syd Mead', 'Sun Ra album surrealism', 'Wanuri Kahiu mood language'],
      traits: 'afrofuturist architecture, cinematic scale, radiant atmospherics, symbolic technology, elegant worldbuilding'
    },
    {
      key: 'modernist-color-poetry',
      label: 'modernist color poetry',
      artists: ['Matisse', 'Paul Klee', 'Tarsila do Amaral'],
      traits: 'bold color fields, lyrical abstraction, playful geometry, refined joy, graphic elegance'
    },
    {
      key: 'dream-surreal-symbolist',
      label: 'dream surreal symbolist',
      artists: ['Dalí', 'Remedios Varo', 'Leonora Carrington'],
      traits: 'surreal symbolism, strange dream logic, layered metaphor, luminous impossibility, poetic mystery'
    },
    {
      key: 'textural-impressionist-light',
      label: 'textural impressionist light',
      artists: ['Monet', 'Sorolla', 'Emily Carr'],
      traits: 'painterly atmosphere, shimmering light, living textures, expressive brush energy, natural lyricism'
    },
    {
      key: 'street-mural-vibrance',
      label: 'street mural vibrance',
      artists: ['Os Gêmeos', 'Basquiat', 'Kobra'],
      traits: 'urban poetry, vibrant mural rhythm, layered marks, expressive characters, playful visual pulse'
    },
    {
      key: 'minimal-premium-architectural',
      label: 'minimal premium architectural',
      artists: ['Tadao Ando', 'James Turrell', 'Luis Barragán'],
      traits: 'minimal serenity, architectural framing, clean forms, premium restraint, sculpted light'
    },
    {
      key: 'fantasy-folk-organic',
      label: 'fantasy folk organic',
      artists: ['Miyazaki background mood', 'Gaudí', 'Arthur Rackham'],
      traits: 'organic fantasy, storybook atmosphere, living forms, whimsical detail, intimate wonder'
    }
  ];

  const compositions = [
    { key: 'wide-cinematic', label: 'wide cinematic composition', traits: 'expansive framing, horizon drama, environmental storytelling' },
    { key: 'intimate-close-focus', label: 'intimate close focus', traits: 'closer subject intimacy, tactile detail, emotional immediacy' },
    { key: 'asymmetric-tension', label: 'asymmetric tension', traits: 'off-center balance, daring negative space, dynamic visual pull' },
    { key: 'layered-depth', label: 'layered depthscape', traits: 'foreground-midground-background rhythm, spatial richness, immersive depth' },
    { key: 'totemic-centered', label: 'totemic centered iconography', traits: 'heroic centered symbol, ceremonial presence, graphic force' }
  ];

  const palettes = [
    { key: 'sunset-embers', label: 'sunset embers palette', traits: 'burnt orange, coral, deep gold, warm magenta' },
    { key: 'mineral-cool', label: 'mineral cool palette', traits: 'slate blue, jade, silver-gray, mist tones' },
    { key: 'tropical-electric', label: 'tropical electric palette', traits: 'teal, fuchsia, solar yellow, vivid green' },
    { key: 'earth-luxe', label: 'earth luxe palette', traits: 'ochre, clay, espresso, sand, muted copper' },
    { key: 'moonlit-neon', label: 'moonlit neon palette', traits: 'indigo, violet, cyan glow, black plum' }
  ];

  const lightingModes = [
    { key: 'soft-diffused', label: 'soft diffused light', traits: 'gentle glow, calm atmosphere, elegant softness' },
    { key: 'high-contrast', label: 'high-contrast dramatic light', traits: 'sharp light-play, vivid contrast, sculpted depth' },
    { key: 'backlit-aura', label: 'backlit aura', traits: 'halo edges, luminous silhouettes, spiritual glow' },
    { key: 'golden-hour', label: 'golden-hour radiance', traits: 'late-day warmth, emotional richness, honeyed atmosphere' },
    { key: 'nocturne-luminous', label: 'nocturne luminous light', traits: 'night mood, glowing accents, elegant darkness' }
  ];

  const renderModes = [
    { key: 'painterly', label: 'painterly rendering', traits: 'visible brush energy, textural surfaces, hand-made richness' },
    { key: 'graphic-clean', label: 'graphic clean rendering', traits: 'crisp shapes, sharp design clarity, poster-like confidence' },
    { key: 'mixed-media', label: 'mixed-media rendering', traits: 'collage feel, layered marks, tactile experimentation' },
    { key: 'soft-atmospheric', label: 'soft atmospheric rendering', traits: 'misty transitions, dreamy softness, airy emotion' }
  ];

  const history = readStyleHistory();
  const recent = (history.recent || []).slice(-4);
  const seed = hashString(mood);

  const picked = pickVariant(directions, seed, recent.map((x) => x.styleKey || x.key));
  const composition = pickVariant(compositions, seed * 3 + 7, recent.map((x) => x.compositionKey));
  const palette = pickVariant(palettes, seed * 5 + 11, recent.map((x) => x.paletteKey));
  const lighting = pickVariant(lightingModes, seed * 7 + 13, recent.map((x) => x.lightingKey));
  const renderMode = pickVariant(renderModes, seed * 11 + 17, recent.map((x) => x.renderModeKey));

  return { picked, composition, palette, lighting, renderMode, history };
}

function buildPrompt(mood) {
  const { picked, composition, palette, lighting, renderMode, history } = chooseStyleDirection(mood);
  const recent = (history.recent || []).slice(-4);
  const recentStyleText = recent.map((x) => x.label).join(', ');
  const recentCompositionText = recent.map((x) => x.compositionLabel).filter(Boolean).join(', ');
  const recentPaletteText = recent.map((x) => x.paletteLabel).filter(Boolean).join(', ');
  return {
    prompt: [
      `Create an original digital artwork for this mood: "${mood}".`,
      `Primary visual direction: ${picked.label}.`,
      `Use the spirit of these reference artists or creators for variation and energy: ${picked.artists.join(', ')}. Do not copy any single artwork directly.`,
      `Core style traits: ${picked.traits}.`,
      `Composition mode: ${composition.label}. Traits: ${composition.traits}.`,
      `Palette mode: ${palette.label}. Traits: ${palette.traits}.`,
      `Lighting mode: ${lighting.label}. Traits: ${lighting.traits}.`,
      `Rendering mode: ${renderMode.label}. Traits: ${renderMode.traits}.`,
      'Create something that feels genuinely different from recent generations, with a fresh visual language, not a near-duplicate composition, palette, lighting, or rendering treatment.',
      recentStyleText ? `Avoid drifting back into these recent style directions: ${recentStyleText}.` : '',
      recentCompositionText ? `Avoid reusing these recent composition habits: ${recentCompositionText}.` : '',
      recentPaletteText ? `Avoid repeating these recent palette families: ${recentPaletteText}.` : '',
      'Lean toward imaginative fine-art energy rather than corporate illustration or predictable wallpaper.',
      'Prefer metaphor, symbolism, distortion, layered meaning, poetic color, and surprising composition over literal representation.',
      'Allow the image to feel alive, inventive, warm, optimistic, and culturally rich when appropriate.',
      'Avoid generic corporate scenes, obvious stock-like symbolism, bland motivational visuals, or overly literal depictions of the prompt.',
      'Avoid defaulting to the same dark moody painterly look, the same centered composition, or the same visual recipe across generations.',
      'For a fullscreen TV display, prioritize beauty from a distance plus interesting detail up close.',
      'The result should feel like real art, not just a polished illustration.',
      'Do not include text, logos, signatures, watermarks, or UI elements.'
    ].filter(Boolean).join(' '),
    styleDirection: picked,
    composition,
    palette,
    lighting,
    renderMode,
    history
  };
}

function autoCaptionFromMood(mood) {
  const stopwords = new Set([
    'a','an','the','and','or','but','for','nor','so','yet','to','of','on','in','at','by','with','from','into','over','under',
    'some','that','this','there','here','you','your','yours','we','our','ours','they','their','them','it','its','is','are',
    'be','been','being','get','got','just','full','tonight','prepare','focus'
  ]);

  const words = String(mood || '')
    .replace(/[—–-]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !stopwords.has(word));

  const picked = [];
  for (const word of words) {
    if (!picked.includes(word)) picked.push(word);
    if (picked.length === 2) break;
  }

  const finalWords = picked.length ? picked : String(mood || '').split(/\s+/).filter(Boolean).slice(0, 2);
  return finalWords
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Mood Glow';
}

async function generateWithOpenAI({ mood, model, size, quality }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const built = buildPrompt(mood);
  const body = {
    model,
    prompt: built.prompt,
    size,
    quality,
    output_format: 'png'
  };

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI image generation failed: HTTP ${res.status} ${errText}`);
  }

  const json = await res.json();
  const item = json?.data?.[0];
  if (!item) throw new Error('OpenAI returned no image data');

  fs.mkdirSync(GENERATED_DIR, { recursive: true });

  const stamp = Date.now();
  const slug = slugify(mood);
  const filename = `${stamp}-${slug}.png`;
  const outputPath = path.join(GENERATED_DIR, filename);

  if (item.b64_json) {
    const buffer = Buffer.from(item.b64_json, 'base64');
    fs.writeFileSync(outputPath, buffer);
  } else if (item.url) {
    const imageRes = await fetch(item.url);
    if (!imageRes.ok) throw new Error(`Failed to download generated image URL: ${imageRes.status}`);
    const arr = await imageRes.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(arr));
  } else {
    throw new Error('OpenAI response did not include b64_json or url');
  }

  return {
    imageUrl: `./generated/${filename}`,
    engine: 'openai',
    styleDirection: built.styleDirection.label,
    composition: built.composition,
    palette: built.palette,
    lighting: built.lighting,
    renderMode: built.renderMode
  };
}

async function main() {
  const parsed = parseArgs(process.argv);
  if (!parsed.mood) usageAndExit();

  const now = new Date().toISOString();

  const builtDirection = buildPrompt(parsed.mood);
  let finalImageUrl = parsed.imageUrl;
  let engine = 'manual';
  let styleDirection = builtDirection.styleDirection?.label || 'manual';
  let compositionLabel = builtDirection.composition?.label || 'manual';
  let paletteLabel = builtDirection.palette?.label || 'manual';
  let lightingLabel = builtDirection.lighting?.label || 'manual';
  let renderModeLabel = builtDirection.renderMode?.label || 'manual';

  if (!finalImageUrl) {
    if (!parsed.forceFallback) {
      try {
        const generated = await generateWithOpenAI({
          mood: parsed.mood,
          model: parsed.model,
          size: parsed.size,
          quality: parsed.quality
        });
        finalImageUrl = generated.imageUrl;
        engine = generated.engine;
        styleDirection = generated.styleDirection || styleDirection;
        compositionLabel = generated.composition?.label || compositionLabel;
        paletteLabel = generated.palette?.label || paletteLabel;
        lightingLabel = generated.lighting?.label || lightingLabel;
        renderModeLabel = generated.renderMode?.label || renderModeLabel;
      } catch (err) {
        console.warn(`[update-mood] OpenAI generation failed, falling back to picsum: ${err.message}`);
      }
    }

    if (!finalImageUrl) {
      finalImageUrl = deterministicMoodImageUrl(parsed.mood);
      engine = 'fallback-picsum';
    }
  }

  const history = readStyleHistory();
  history.recent = [...(history.recent || []), {
    key: (builtDirection.styleDirection && builtDirection.styleDirection.key) || slugify(styleDirection),
    styleKey: (builtDirection.styleDirection && builtDirection.styleDirection.key) || slugify(styleDirection),
    label: styleDirection,
    compositionKey: (builtDirection.composition && builtDirection.composition.key) || slugify(compositionLabel),
    compositionLabel,
    paletteKey: (builtDirection.palette && builtDirection.palette.key) || slugify(paletteLabel),
    paletteLabel,
    lightingKey: (builtDirection.lighting && builtDirection.lighting.key) || slugify(lightingLabel),
    lightingLabel,
    renderModeKey: (builtDirection.renderMode && builtDirection.renderMode.key) || slugify(renderModeLabel),
    renderModeLabel,
    mood: parsed.mood,
    generatedAt: now,
    imageUrl: finalImageUrl,
    engine
  }].slice(-8);
  writeStyleHistory(history);

  const state = {
    mood: parsed.mood,
    caption: parsed.caption || autoCaptionFromMood(parsed.mood),
    imageUrl: finalImageUrl,
    updatedAt: now,
    command: parsed.command || `Mood: ${parsed.mood}`,
    imageEngine: engine,
    styleDirection,
    composition: compositionLabel,
    palette: paletteLabel,
    lighting: lightingLabel,
    renderMode: renderModeLabel
  };

  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

  console.log('Mood updated successfully.');
  console.log(`- Mood: ${state.mood}`);
  console.log(`- Caption: ${state.caption}`);
  console.log(`- Image: ${state.imageUrl}`);
  console.log(`- Engine: ${state.imageEngine}`);
  console.log(`- Style: ${state.styleDirection}`);
  console.log(`- Composition: ${state.composition}`);
  console.log(`- Palette: ${state.palette}`);
  console.log(`- Lighting: ${state.lighting}`);
  console.log(`- Render: ${state.renderMode}`);
  console.log(`- Updated: ${state.updatedAt}`);
}

main().catch((err) => {
  console.error('[update-mood] fatal:', err.message);
  process.exit(1);
});
