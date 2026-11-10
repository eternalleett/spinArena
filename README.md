# Spin Arena

Traditional Chinese, touch-friendly Beyblade scoreboard and experimental local video assistant.

## Features

- Both players ready → 3, 2, 1, GO, SHOOT countdown and round timer.
- Default scoring: Xtreme 3, Burst 2, Over 2, Spin 1; first to 4 points.
- Camera and local video import, A/B trails, frame review and event export.
- Continuous independent video-analysis scoreboard, reversible round history and local persistence.
- Empty-field background learning before launch, staggered-launch candidates and static-background exclusion.
- Experimental Spin candidates from texture changes; fixed dark fixtures are excluded without banning black Blades.

## Important limits

This is an experimental assistant, not a certified judge or trained universal Blade classifier. Keep the camera fixed and show the empty arena for about one second before launch. Confirm A/B and zone calibration before using automatic Spin scoring. Pocket/Reverse and Burst still require review. Camera access needs HTTPS or localhost and browser permission. Videos stay on the device. Background execution is not guaranteed.

Core synthetic regression tests pass. Recent real-video import end-to-end checks and Kernel checks timed out; real-world accuracy for the reported black fixture has not been established. Historical measurements in the validation page are not current-version accuracy claims.

## GitHub Pages deployment

1. Upload all files to `eternalleett/spinArena`, including `.github/workflows/pages.yml`.
2. Use `main` as the default branch.
3. In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**.
4. Open **Actions → Test and deploy Spin Arena → Run workflow**, or push a new commit to `main`.
5. The workflow runs regression checks, uploads `dist`, then publishes the site. Use the deployment URL shown by GitHub after it succeeds.

Public repositories support Pages on GitHub Free. Private-repository Pages availability depends on the GitHub plan. Choose visibility before creating the repository.

No API keys, npm dependencies, backend, or ChatGPT hosting configuration are required. A GitHub Pages deployment has its own browser origin and therefore its own camera permission and saved scores.

## Local use

From this directory:

```sh
python -m http.server 8080 --directory dist
```

Open `http://localhost:8080/`.

## Checks

Requires Node.js 18 or newer:

```sh
node check.mjs
node check-vision.cjs
node check-continuous.cjs
node check-launch.cjs
```

## Layout

- `dist/index.html`: scoreboard and video interface.
- `dist/vision-core.js`: appearance association and manual-review event logic.
- `dist/continuous-core.js`: scene candidates, rotation evidence and multi-round scoring.
- `dist/launch-core.js`: empty-field learning and launch validation.
- `dist/vision.js`: media capture, tracking integration, replay and local storage.
- `.github/workflows/pages.yml`: test and GitHub Pages deployment workflow.

Export prepared from source revision `b1bda4f316490867eae08cda78fabad64cf0e73b`. Hosting-specific configuration and old screenshot assets are excluded.
