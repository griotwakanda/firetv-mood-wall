const REFRESH_MS = 60_000;
const STATE_URL = './state.json';

const moodText = document.getElementById('moodText');
const captionText = document.getElementById('captionText');
const timestampText = document.getElementById('timestampText');
const bg = document.getElementById('bg');

function fmtTimestamp(input) {
  if (!input) return 'No timestamp available';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return String(input);

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function applyState(state) {
  const mood = state?.mood || 'Untitled mood';
  const caption = state?.caption || '';
  const imageUrl = state?.imageUrl || '';
  const updatedAt = state?.updatedAt || state?.timestamp;

  moodText.textContent = mood;
  captionText.textContent = caption;
  captionText.style.display = caption ? 'block' : 'none';
  timestampText.textContent = `Updated ${fmtTimestamp(updatedAt)}`;

  if (imageUrl) {
    bg.style.backgroundImage = `url("${imageUrl.replace(/"/g, '\\"')}")`;
  }
}

async function loadState() {
  try {
    const cacheBust = `?t=${Date.now()}`;
    const response = await fetch(`${STATE_URL}${cacheBust}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    applyState(data);
  } catch (err) {
    moodText.textContent = 'Mood wall temporarily unavailable';
    captionText.style.display = 'none';
    timestampText.textContent = `Error loading state (${err.message})`;
    console.error(err);
  }
}

loadState();
setInterval(loadState, REFRESH_MS);
