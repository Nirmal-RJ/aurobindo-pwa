# Aurobindo Pharmacy

A lightweight, dependency-free PWA prototype with English, Telugu and Hindi, persistent light/dark themes, and six home-screen activity links. Each opens a dedicated color-matched page with playful translated coming-soon copy, animated ticket artwork, and Back to Home links. The supplied logo is used unchanged; the cinema illustration is inline SVG. The colorful cinema stage includes moving spotlights, floating artwork and confetti, marquee lights, and smooth card interactions. Reduced-motion preferences disable decorative movement and slow the independently pausable LED brightness animation. The language menu supports keyboard navigation, Escape, and outside-click dismissal.

## Run

Run `npm start` and open http://localhost:4173. No dependency installation or build is needed. `npm run check` checks JavaScript syntax.

Alternatively, serve this folder through Laragon. Relative asset paths support deployment in a subdirectory.

## PWA

Installation and offline caching require HTTPS or localhost. Visit once online before using offline. Chromium browsers expose an Install app button when installation is available; on iPhone/iPad use Safari's Share → Add to Home Screen. On a phone over a LAN, use HTTPS for PWA capabilities; plain HTTP still serves the prototype.

The service worker caches the app shell, translations, logo and icons. When deploying changed assets, increment the cache version in `sw.js` and keep the asset version queries in `index.html` and `sw.js` synchronized. An existing controlled page reloads once when its offline shell updates. No external fonts, libraries, API calls, analytics or accounts are required.

## Edit

Game 4 is available from the Games gallery or directly at `chromatogram.html`. It uses the saved light/dark theme, five questions, randomized directional answers, and one 45-second deadline. Players can drag/swipe the supplied joystick, tap an action, or use arrow keys. Results include the score, answer review, retry, and exit. The game and both joystick assets are cached for offline use after an online visit.

Run `npm test` for Game 4 behavior checks (answer key, timeout, duplicate input, swipe cancellation, keyboard controls, replay, theme, and browser history restoration). These use a simulated DOM and clock; responsive visual QA still requires a browser.

- `index.html`: layout, six activity cards and cinema illustration
- `styles.css`: responsive layout and both themes
- `app.js`: translated copy, hash-based page routing, local preferences, LED layout and installation
- `manifest.webmanifest`, `sw.js`, `icons/`: PWA configuration and offline support

English opens by default. Theme and language choices persist locally. Telugu and Hindi copy is supplied for prototype review. Section URLs are `#/fun-corner`, `#/premier-league`, `#/games`, `#/score-board`, `#/about`, and `#/photos`. Hash routes support browser history, direct links, refreshes, subdirectory hosting, and offline navigation without server rewrites. Back to Home restores focus to the originating card. The actual activities, league data, scores and photo content are still coming soon.
