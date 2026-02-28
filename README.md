# firetv-mood-wall

Fullscreen **Mood Wall** for Fire Stick TV using a static GitHub Pages site.

It shows the latest mood artwork, mood text, caption, and update timestamp.
The frontend auto-refreshes `state.json` every **60 seconds**.

## Project structure

- `docs/index.html` — fullscreen page
- `docs/styles.css` — artistic/minimal styling
- `docs/app.js` — loads and refreshes mood state every 60s
- `docs/state.json` — current mood + image metadata
- `scripts/update-mood.js` — CLI script to update mood state
- `INSTRUCOES.md` — quick instructions in Portuguese

## Chat command format

The update flow is designed for commands in this format:

```text
Mood: <text>
```

Example:

```text
Mood: cinematic blue rain
```

You can pass that directly to the script.

## Update mood (manual)

From project root:

```bash
node scripts/update-mood.js "Mood: cinematic blue rain"
```

Optional explicit mode:

```bash
node scripts/update-mood.js --mood "cinematic blue rain" --caption "Neon reflections and slow city pulse." --image "https://images.unsplash.com/..."
```

If `--image` is not provided, a mood-based Unsplash Source URL is generated automatically.

## Publish to GitHub Pages

1. Create a GitHub repository and push this project.
2. In repo settings, enable **Pages**.
3. Set source to:
   - Branch: `main` (or your default branch)
   - Folder: `/docs`
4. Open your Pages URL on Fire TV browser.

## Fire TV tips

- Keep browser in fullscreen mode.
- Use static URL to avoid remote input friction.
- The page refreshes state automatically every 60 seconds, no manual reload needed.
