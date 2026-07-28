# photobooth app
made for the 25th anniversary of laba.edu  
app available at https://laba-photobooth.netlify.app

## repository
https://github.com/labait/photoboot_vue  
github credentials https://share.1password.com/s#CWhvzDeWKFBi4JkwWtDdPkZakacxUtfWBwebb7X5QlQ

## development
```bash
npm i
npm run dev          # avvia netlify dev (usa il CLI locale)
# oppure:
npx netlify dev --no-open
```

### Netlify CLI globale (opzionale)

**Non è necessario** per questo progetto: `netlify-cli` è già in `dependencies`.

L'installazione globale con npm spesso fallisce per `sharp` (compilazione nativa). Alternative:

```bash
# Opzione 1 — consigliata: usa il CLI locale (nessuna installazione globale)
npx netlify --version

# Opzione 2 — Homebrew
brew install netlify-cli

# Opzione 3 — npm globale con Node 22.12+ (non Node 20)
mise use node@22
npm i -g netlify-cli

# Opzione 4 — npm globale saltando gli script native (ultima risorsa)
npm i -g netlify-cli --ignore-scripts
```

Se un install globale precedente è rimasto a metà:
```bash
rm -rf "$(npm root -g)/netlify-cli"
```

## set env vars
copy `.env.sample` to `.env` and set keys;
a version is available in 1p here https://share.1password.com/s#GcYWm88k4NQKtz2vbq2BbHCnE0eGhnVnxOkNNOmS1rk

Posters are stored under `public/posters/{VITE_EDITION}/`. Set `VITE_EDITION` in `.env` to switch edition folder (e.g. `cronache_disorganiche`).

## hosting
the app is serverv via netlify at 

access using github account `labacorsoweb, netlify credentials on 1p https://share.1password.com/s#MoOtjj4NrIQiJcRNN-IqmV17LyqJz6zIbqp2B0lN748

ask molinari if 1p links are expired :-) 

## specs 

### fonts
Inter Bold, medium; Regular.

###  colors 
bg color: #000000
#ffffff
#5668b0
#ceeaee
#ff8c14
#ec1874
#f9cade
#cfd72a