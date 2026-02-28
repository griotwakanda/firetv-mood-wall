# INSTRUÇÕES (rápido)

## Objetivo
Criar uma parede artística de humor (mood wall) em tela cheia para Fire Stick TV, hospedada no GitHub Pages.

## Comando de atualização
Formato esperado no chat:

```text
Mood: <texto>
```

Exemplo:

```text
Mood: sunset lo-fi dream
```

## Atualizar o estado manualmente
Na pasta do projeto:

```bash
node scripts/update-mood.js "Mood: sunset lo-fi dream"
```

Com opções extras:

```bash
node scripts/update-mood.js --mood "sunset lo-fi dream" --caption "Luz quente, ritmo lento." --image "https://..."
```

## O que é atualizado
O script grava `docs/state.json` com:
- `mood`
- `caption`
- `imageUrl`
- `updatedAt`
- `command`

## Comportamento da página
- Carrega `docs/state.json`
- Atualiza automaticamente a cada **60 segundos**
- Mostra mood + legenda + timestamp
- Exibe arte em fullscreen

## Publicação no GitHub Pages
1. Subir este projeto para um repositório GitHub.
2. Ativar Pages no branch principal, pasta `/docs`.
3. Abrir a URL do Pages no navegador da Fire TV.
