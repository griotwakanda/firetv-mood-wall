#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT, 'docs');
const GENERATED_DIR = path.join(DOCS_DIR, 'generated');
const STATE_PATH = path.join(DOCS_DIR, 'state.json');

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

function buildPrompt(mood) {
  return [
    `Create an original digital artwork for this mood: "${mood}".`,
    'Style: cinematic, artistic, expressive, non-generic, emotionally coherent.',
    'Composition: clean focal hierarchy suitable for fullscreen TV display.',
    'Lighting: dramatic but soft, high depth, rich atmosphere.',
    'Do not include text, logos, signatures, watermarks, or UI elements.'
  ].join(' ');
}

async function generateWithOpenAI({ mood, model, size, quality }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const body = {
    model,
    prompt: buildPrompt(mood),
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
    engine: 'openai'
  };
}

async function main() {
  const parsed = parseArgs(process.argv);
  if (!parsed.mood) usageAndExit();

  const now = new Date().toISOString();

  let finalImageUrl = parsed.imageUrl;
  let engine = 'manual';

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
      } catch (err) {
        console.warn(`[update-mood] OpenAI generation failed, falling back to picsum: ${err.message}`);
      }
    }

    if (!finalImageUrl) {
      finalImageUrl = deterministicMoodImageUrl(parsed.mood);
      engine = 'fallback-picsum';
    }
  }

  const state = {
    mood: parsed.mood,
    caption: parsed.caption || `Mood set to “${parsed.mood}”.`,
    imageUrl: finalImageUrl,
    updatedAt: now,
    command: parsed.command || `Mood: ${parsed.mood}`,
    imageEngine: engine
  };

  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

  console.log('Mood updated successfully.');
  console.log(`- Mood: ${state.mood}`);
  console.log(`- Caption: ${state.caption}`);
  console.log(`- Image: ${state.imageUrl}`);
  console.log(`- Engine: ${state.imageEngine}`);
  console.log(`- Updated: ${state.updatedAt}`);
}

main().catch((err) => {
  console.error('[update-mood] fatal:', err.message);
  process.exit(1);
});
