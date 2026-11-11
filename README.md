# Naap Register (ناپ رجسٹر)

Simple offline tailor measurement app (PWA). No server, no build step.
Data is stored in the phone browser (localStorage). Use the backup / CSV buttons regularly.

## Put it on GitHub Pages
1. Create a new GitHub repo (e.g. `naap-register`) and push all files in this folder to the `main` branch.
2. Repo -> Settings -> Pages -> Source: "Deploy from a branch" -> Branch: `main` / `(root)` -> Save.
3. Wait a minute, open `https://<your-username>.github.io/naap-register/` on the phone.

## Install on phone
- Android (Chrome): menu -> "Install app" / "Add to Home screen"
- iPhone (Safari): Share -> "Add to Home Screen"

After the first open it works offline. After you change a file, bump `CACHE = "naap-v1"` in `sw.js` (v2, v3...) so phones pick up the update.
