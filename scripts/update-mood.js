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

  const history = readStyleHistory();
  const recentKeys = new Set((history.recent || []).slice(-3).map((x) => x.key));
  const pool = directions.filter((d) => !recentKeys.has(d.key));
  const available = pool.length ? pool : directions;

  const seed = Array.from(String(mood || '')).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const picked = available[seed % available.length];
  return { picked, history };
}

function buildPrompt(mood) {
  const { picked, history } = chooseStyleDirection(mood);
  const recentStyleText = (history.recent || []).slice(-3).map((x) => x.label).join(', ');
  return {
    prompt: [
      `Create an original digital artwork for this mood: "${mood}".`,
      `Primary visual direction: ${picked.label}.`,
      `Use the spirit of these reference artists or creators for variation and energy: ${picked.artists.join(', ')}. Do not copy any single artwork directly.`,
      `Key traits: ${picked.traits}.`,
      'Create something that feels genuinely different from recent generations, with a fresh visual language, not a near-duplicate composition or palette.',
      recentStyleText ? `Avoid drifting back into these recent style directions: ${recentStyleText}.` : '',
      'Lean toward imaginative fine-art energy rather than corporate illustration or predictable wallpaper.',
      'Prefer metaphor, symbolism, distortion, layered meaning, poetic color, and surprising composition over literal representation.',
      'Allow the image to feel alive, inventive, warm, optimistic, and culturally rich when appropriate.',
      'Avoid generic corporate scenes, obvious stock-like symbolism, bland motivational visuals, or overly literal depictions of the prompt.',
      'Avoid defaulting to the same dark moody painterly look, the same centered composition, or the same visual recipe across generations.',
      'Composition: strong focal poetry for a fullscreen TV display, with beauty, depth, and intrigue from a distance.',
      'Lighting: expressive and atmospheric, but different each time depending on the chosen visual direction.',
      'The result should feel like real art, not just a polished illustration.',
      'Do not include text, logos, signatures, watermarks, or UI elements.'
    ].filter(Boolean).join(' '),
    styleDirection: picked,
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
    styleDirection: built.styleDirection.label
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
    label: styleDirection,
    mood: parsed.mood,
    generatedAt: now,
    imageUrl: finalImageUrl,
    engine
  }].slice(-6);
  writeStyleHistory(history);

  const state = {
    mood: parsed.mood,
    caption: parsed.caption || autoCaptionFromMood(parsed.mood),
    imageUrl: finalImageUrl,
    updatedAt: now,
    command: parsed.command || `Mood: ${parsed.mood}`,
    imageEngine: engine,
    styleDirection
  };

  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

  console.log('Mood updated successfully.');
  console.log(`- Mood: ${state.mood}`);
  console.log(`- Caption: ${state.caption}`);
  console.log(`- Image: ${state.imageUrl}`);
  console.log(`- Engine: ${state.imageEngine}`);
  console.log(`- Style: ${state.styleDirection}`);
  console.log(`- Updated: ${state.updatedAt}`);
}

main().catch((err) => {
  console.error('[update-mood] fatal:', err.message);
  process.exit(1);
});
