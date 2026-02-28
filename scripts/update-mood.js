#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const STATE_PATH = path.join(ROOT, 'docs', 'state.json');

function parseArgs(argv) {
  const args = argv.slice(2);

  // Supports:
  // 1) node scripts/update-mood.js "Mood: dreamy neon night"
  // 2) node scripts/update-mood.js --mood "dreamy neon night" --caption "..." --image "https://..."
  // 3) node scripts/update-mood.js --command "Mood: dreamy neon night"
  const out = {
    mood: '',
    caption: '',
    imageUrl: '',
    command: ''
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
      out.mood = next.trim();
      i += 1;
    } else if (token === '--caption' && next) {
      out.caption = next.trim();
      i += 1;
    } else if ((token === '--image' || token === '--image-url') && next) {
      out.imageUrl = next.trim();
      i += 1;
    } else if (token === '--command' && next) {
      out.command = next.trim();
      i += 1;
    }
  }

  if (!out.mood && out.command && /^mood\s*:/i.test(out.command)) {
    out.mood = out.command.replace(/^mood\s*:/i, '').trim();
  }

  return out;
}

function randomUnsplashUrl(mood) {
  const q = encodeURIComponent(mood || 'abstract mood art');
  const sig = Date.now();
  return `https://source.unsplash.com/1920x1080/?${q}&sig=${sig}`;
}

function usageAndExit() {
  console.log(`\nUsage:\n  node scripts/update-mood.js "Mood: calm ocean dusk"\n  node scripts/update-mood.js --mood "calm ocean dusk" [--caption "..."] [--image "https://..."]\n  node scripts/update-mood.js --command "Mood: calm ocean dusk"\n`);
  process.exit(1);
}

function main() {
  const parsed = parseArgs(process.argv);

  if (!parsed.mood) usageAndExit();

  const now = new Date().toISOString();
  const state = {
    mood: parsed.mood,
    caption: parsed.caption || `Mood set to “${parsed.mood}”.`,
    imageUrl: parsed.imageUrl || randomUnsplashUrl(parsed.mood),
    updatedAt: now,
    command: parsed.command || `Mood: ${parsed.mood}`
  };

  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

  console.log('Mood updated successfully.');
  console.log(`- Mood: ${state.mood}`);
  console.log(`- Caption: ${state.caption}`);
  console.log(`- Image: ${state.imageUrl}`);
  console.log(`- Updated: ${state.updatedAt}`);
}

main();
