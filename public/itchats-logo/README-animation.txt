ItChats Logo Animation Package
===============================

FASTEST PREVIEW (NO SERVER NEEDED)
---------------------------------
Double-click:
  itchats-logo-animation-demo.html

It is fully standalone: SVG + animation JS are embedded in that HTML file.
It works from file:// and does not use fetch() or ES modules.

FOR THE REAL APP
----------------
Use:
  itchats-logo-animated.svg
  itchats-logo-animation.js

The JS module is intended to run through your normal Vite/React development server.
Do not test the module-based integration by double-clicking an HTML file, because browsers block module/fetch access from file:// origins.

Optional local server for testing modular files:
  python -m http.server 8000
then open http://localhost:8000/

Interactions
------------
- automatic natural blink/wink
- occasional jump with squash/stretch
- automatic star shine
- click/tap logo: jump + star shine
- pointer enter: wink
- respects prefers-reduced-motion
