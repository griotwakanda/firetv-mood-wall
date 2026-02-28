# firetv-mood-wall

Fullscreen **Mood Wall** para Fire TV via GitHub Pages.

Agora o update de mood tenta gerar **arte única com OpenAI Images API** (modelo padrão `gpt-image-1`).
Se falhar, usa fallback `picsum`.

## Estrutura
- `docs/index.html` — tela fullscreen
- `docs/styles.css` — visual minimal/artístico
- `docs/app.js` — recarrega `state.json` a cada 60s
- `docs/state.json` — estado atual
- `docs/generated/` — imagens geradas localmente (commitadas)
- `scripts/update-mood.js` — atualiza mood + gera arte

## Trigger
Formato de comando:

```text
Mood: <texto>
```

## Uso
```bash
node scripts/update-mood.js "Mood: kootenays winter"
```

Opções úteis:
```bash
node scripts/update-mood.js --mood "rasta vibes" --caption "No rush, just flow"
node scripts/update-mood.js --mood "night drive" --model gpt-image-1 --size 1536x1024 --quality high
node scripts/update-mood.js --mood "fallback mode" --fallback
```

## Requisitos
- `OPENAI_API_KEY` no ambiente (para geração com OpenAI)
- Sem chave, cai automaticamente no fallback

## Deploy
- GitHub Pages: branch `main`, pasta `/docs`
