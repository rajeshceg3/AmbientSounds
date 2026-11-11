# Verify AmbientSounds
Ambient Mood - ambient soundscape mixer (vite).
## Launch
`npm install`, then `npm run dev` or `npm run build && npm run preview`.
## Doctor
`python3 .cursor/skills/verify-ambient-sounds/verify.py`
## Drive
Runs the jest unit suites (50 tests), builds with vite, then renders the built app via `vite preview` in headless Chromium asserting the boot marker and zero JS console errors.
## Evidence
`.cursor/skills/verify-ambient-sounds/evidence.json`
## Cleanup
Preview server terminated after the render.
## Known boundaries
Cypress specs exist but need a Cypress binary install; audio output quality is unverified (headless render only).
