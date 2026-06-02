# Beaver

**A fast, local-first digital asset manager for designers and developers.**

Beaver runs entirely on your machine — no cloud, no subscriptions, no tracking. Link folders, browse thumbnails, tag and rate assets, and find what you need instantly.

---

## Features

- **Link any folder** — point Beaver at your project folders and it builds a browsable library automatically
- **Live sync** — file watchers keep the library up to date as you add, move, or delete files
- **Thumbnails for everything** — raster images (PNG, JPG, WebP, GIF, AVIF), SVG, EPS (via QuickLook), video, audio, and fonts
- **Tags & ratings** — assign color-coded tags and 1–5 star ratings; filter by either
- **Multi-select** — select multiple assets for batch delete, rename, duplicate, or move
- **Fullscreen viewer** — arrow-key navigation with video playback
- **Color palette extraction** — dominant colors extracted from every image, shown in the inspector
- **Search** — find assets by filename, title, notes, or source URL
- **Smart views** — All Assets, Recently Added, Untagged, Favorites
- **Inspector panel** — title, notes, source URL, tags, dimensions, file path
- **Customizable grid** — grid or masonry layout, four thumbnail sizes, cover/contain fit
- **Light, dark, and system themes** with six accent colors
- **100% offline** — nothing ever leaves your machine

---

## Download

Grab the latest `.dmg` from the [Releases](../../releases) page.

| Platform | Architecture |
|---|---|
| macOS | Apple Silicon (arm64) |
| macOS | Intel (x64) |

> **Note:** Beaver is currently unsigned. On first launch, right-click the app and choose **Open** to bypass Gatekeeper, then it will open normally from the dock forever after.

---

## Development

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
git clone https://github.com/your-username/beaver.git
cd beaver
npm install
```

### Run in dev mode

```bash
npm run dev
```

Starts Vite with HMR and launches the Electron window.

### Build a DMG

```bash
npm run electron:build:mac
```

Output lands in `release/`. Builds separate arm64 and x64 DMGs.

### Quick unpackaged test

```bash
npm run electron:dir
```

Produces an unpacked `.app` in `release/mac*/` — no DMG, faster to iterate.

---

## App Icon

Place the following in `build/` before building:

| File | Size | Used for |
|---|---|---|
| `build/icon.icns` | macOS multi-size bundle | DMG + dock |
| `build/icon.png` | 512×512 px | Fallback |

To convert a PNG to `.icns`:

```bash
mkdir icon.iconset
sips -z 16 16   icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32   icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32   icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64   icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128 icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256 icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256 icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512 icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512 icon.png --out icon.iconset/icon_512x512.png
iconutil -c icns icon.iconset -o build/icon.icns
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | Electron 41 |
| UI | React 19 + TypeScript |
| Build | Vite 8 + vite-plugin-electron |
| Styling | Tailwind CSS + Radix UI |
| Database | SQLite via better-sqlite3 |
| Thumbnails | sharp |
| File watching | chokidar |
| Vector preview | macOS QuickLook (qlmanage) |

---

## License

MIT — see [LICENSE](LICENSE) for details.

Built by [Oddomens](https://oddomens.com) · [Terms](https://oddomens.com/terms) · [Privacy](https://oddomens.com/privacy)
