# 🟤 Thin Mint Scoreboard Overlay

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Compatible with CRG](https://img.shields.io/badge/CRG%20ScoreBoard-compatible-blue.svg)](https://github.com/rollerderby/crg)
[![HTML5](https://img.shields.io/badge/HTML5-pure--client-orange.svg)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![Maintenance](https://img.shields.io/badge/maintained-yes-brightgreen.svg)](./)
![Trans Rights](https://pride-badges.pony.workers.dev/static/v1?label=trans%20rights&stripeWidth=6&stripeColors=5BCEFA,F5A9B8,FFFFFF,F5A9B8,5BCEFA)

A **broadcast-style scoreboard overlay** for roller derby, built for [CRG Scoreboard](https://github.com/rollerderby/crg). Inspired by the visual language of network sports graphics, TMSB brings professional-grade presentation to roller derby streams — live score, jam clock, team names, penalties, rosters, and more — designed for use with OBS or any browser-source capture tool.

Supports connecting to a CRG instance running on a **separate computer** on the same network, with a built-in admin panel to configure the connection and a graceful offline error screen if the scoreboard can't be reached.

---

## Features

- Broadcast-style scoreboard with live score, jam clock, period clock, and timeout tracking
- Animated score change flash and jam-score delta float
- Winning score highlighted in gold with a synchronized glow pulse
- Jam urgency indicator (last 10 seconds)
- Period urgency indicator (last 60 seconds, in-jam only)
- Timeout type styling: Official Timeout, Team Timeout, Official Review
- Synchronized blink/pulse system — all live indicators pulse on a shared wall-clock rhythm
- Smooth panel animation — scoreboard and clock module slide in and out from the correct edge
- Jammer panel with lead indicator, star pass, and penalty state
- Lineup/blocker panel with synchronized penalty blinking
- Post-timeout lineup clock
- Lower Third panel with skater name generator and store
- Roster panels (Team 1 / Team 2)
- Penalty panels (Team 1 / Team 2)
- Points-per-Jam graph panel
- Upcoming game panel
- Configurable team name overrides, colours, and logos
- Scaling control (50–200%)
- Green screen / transparent background toggle
- Game Tab context banner with customizable text and color
- Bottom Placement mode — flip the entire overlay to the bottom of the screen
- **Remote CRG connection** — configure IP, port, and timeout from the admin panel; settings are broadcast to all connected overlays via CRG's WebSocket state, so Chrome, OBS, and any other client stay in sync automatically
- **`config.js`** — pre-configure a deployment so the admin panel isn't needed on every start
- **Offline error screen** — clear warning on initial load failure, distinguishing "host unreachable" from "CRG not running"
- **Reconnection badge** — small on-screen indicator when the scoreboard connection drops mid-bout
- **Connection test page** — `test-connection.html` for pre-bout verification with response timing
- **Cache-busted `core.js`** — CRG updates are picked up automatically on next page load

---

## Requirements

- [CRG Scoreboard](https://github.com/rollerderby/crg) (v2025.9 or higher) installed and running on **every machine serving the overlay** — including any separate overlay computer. The overlay depends on CRG to serve its pages and provide several core scripts (`jquery.js`, `core.js`). A second CRG instance on the network acts as the **game data source** (scores, clocks, penalties, etc.) and is what the remote IP setting points to.
- A modern desktop browser for pre-game setup (Chrome, Firefox, Edge, or Safari)
- Network access between machines (same LAN, port 8000 open)

---

## Installation

### Option A — Serve directly from CRG (simplest)

1. Copy the `tmsb` folder into your CRG installation directory:
   ```
   <crg-root>/html/custom/overlay/tmsb/
   ```
2. Open CRG Scoreboard and navigate to:
   ```
   http://localhost:8000/custom/overlay/tmsb/
   ```
   The overlay is live. Open `admin/` in a separate tab to control it.
3. *(Optional)* Edit `config.js` to set `CRG_IP`, `CRG_PORT`, or `TIMEOUT_MS` as permanent defaults.

### Option B — Separate overlay computer

Use this when the machine running OBS is different from the machine running CRG.

1. Copy the overlay files to any location on the overlay computer (a folder or USB drive — no web server needed).
2. Open `admin/index.html` in a desktop browser (Chrome, Firefox, etc.) and configure your settings — CRG IP, team names, colors, and logos.
3. Use **Save Configuration** to write your settings to `config.js`.
4. Add `index.html` as a Browser Source in OBS (1280x720 or 1920×1080).
5. During the bout, operate the overlay using keyboard shortcuts directly on the overlay source. See [Keyboard Shortcuts](#keyboard-shortcuts).

> **Note:** Pre-game setup should be done in a desktop browser, not through OBS. OBS's embedded browser has isolated localStorage and limited API support. Once `config.js` is saved, OBS loads everything automatically on every launch.

---

## Admin Panel

Open `admin/index.html` alongside the overlay to control it in real time.

| Control | Description |
|---|---|
| Clock | Toggle the clock display |
| Score | Toggle the score display |
| Jammers | Toggle jammer panel |
| Lineup | Toggle lineup/blocker panel |
| Game Tab | Toggle the context banner |
| Bottom Placement | Flip the overlay to the bottom of the screen |
| Panels | Switch between roster, penalty, PPJ, lower third, and upcoming panels |
| Lower Third | Set custom text lines and style; includes a skater name generator |
| Team Display | Override team names, colours, and logos |
| Scaling | Resize the overlay (50–200%) |
| Background | Transparent or green screen |
| Clock After Timeout | Choose whether to show Lineup or Timeout clock post-timeout |
| Preview Size | Resize the admin's preview iframe |
| CRG Connection | Set the IP, port, and timeout for a remote CRG instance |
| `config.js` | File-based defaults for the above — edit once per deployment |

### Keyboard Shortcuts (focus the overlay window)

| Key | Action |
|---|---|
| `C` | Toggle clock |
| `S` | Toggle score |
| `J` | Toggle jammers |
| `L` | Toggle lineup panel |
| `G` | Toggle Game Tab |
| `B` | Toggle Bottom Placement |
| `0` | Points per Jam panel |
| `1` | Roster Team 1 |
| `2` | Roster Team 2 |
| `3` | Penalty Team 1 |
| `4` | Penalty Team 2 |
| `9` | Lower Third |
| `U` | Upcoming |
| `Space` | Clear panel |

---

## Remote Connection — How It Works

CRG serves two key scripts (`jquery.js` and `core.js`) that the overlay depends on. Normally these load from the same machine serving the HTML. When a remote IP is configured:

1. **jQuery** always loads from the local serving host (fast, reliable).
2. **`core.js`** loads from the configured remote CRG machine with a 5-second timeout.
3. A **WebSocket intercept** redirects CRG's socket connection to the configured host, since CRG normally connects back to `window.location.host`.
4. A **WS stub** absorbs any `WS.Register()` calls made before `core.js` arrives and replays them once it loads.
5. **Connection settings are stored in CRG's WebSocket state** — the same way team names and colours are synced. Any overlay client that connects (including Chrome, OBS, or a fresh browser) receives the configured IP and caches it locally, without any manual setup on each machine.

If the remote host is unreachable, the overlay shows a clear error screen after 5 seconds and the admin panel's Connection section highlights the failure — without displaying the configured IP address on screen.

---

## OBS Setup

### Overlay source
1. Add a **Browser Source** and set the URL to your `index.html` path — either a `file://` path on the overlay computer or `http://<crg-host>:8000/custom/overlay/tmsb/index.html` if served by CRG.
2. Set width/height to match your stream resolution (typically 1920×1080).
3. Check **Shutdown source when not visible** to free resources between scenes.

### Admin panel
The admin panel (`admin/index.html`) is a pre-game setup tool — open it in a desktop browser before the event, configure everything, and save to `config.js`. It does not need to be added as an OBS source. During the bout, the overlay is operated entirely via keyboard shortcuts.

---

## Pre-bout Checklist

Open `test-connection.html` in a browser before going live. It reads the same configuration as the overlay and reports:

- Whether CRG is reachable at the configured host and port
- Response time (useful for diagnosing a slow network)
- A plain-language explanation if the connection fails

---

## Reconnection Badge

If the WebSocket drops mid-bout (CRG crash, network glitch), a small `⟳ Reconnecting…` badge appears at the bottom of the overlay and disappears automatically when the connection comes back. It does not appear during the initial load — that is handled by the offline error screen.

To hide it from the broadcast stream entirely, add the following to the **Custom CSS** field in your OBS Browser Source:

```css
#crg-reconnecting { display: none !important; }
```

---

## Configuration File

`config.js` at the root lets you pre-configure a deployment without opening the Admin panel:

```js
window.TMSB_CONFIG = {
  CRG_IP:     '192.168.1.50',   // blank = same host as the overlay
  CRG_PORT:   '8000',
  TIMEOUT_MS: 5000              // ms before showing the offline screen
};
```

Values set through the Admin panel (stored in localStorage and synced via CRG WebSocket state) take precedence over `config.js`.

---

## Team Logos

Team logos are configured in the Admin panel under **Team Display**. The recommended workflow is:

1. Save your logo to disk as a PNG with a transparent background (400×400 to 1000×1000 pixels recommended).
2. In the Admin panel, click **Browse** next to the team logo field and select the file. The image is converted to base64 automatically.
3. Click **Embed** to place the base64 image into the scene. The logo will appear blended into the team bar behind the name and score.
4. Click **Save Configuration** to write the embedded logo to `config.js` so it loads automatically on every future start.

**Image guidelines**

- **Format:** PNG with a transparent background. The logo is blended over the team color using `mix-blend-mode: screen`, so transparency is essential — a solid white or black background will cover the team bar entirely.
- **Dimensions:** Square or near-square works best. Anything in the range of 400×400 to 1000×1000 pixels is recommended — the overlay scales it down automatically.
- **Color:** Light-colored or white logos show through most visibly against dark team colors. Dark logos on dark backgrounds will be nearly invisible. If your logo has both light and dark elements, the light parts will glow through and the dark parts will recede — which is the intended broadcast effect.
- **File size:** Keep it under 500KB before embedding. Base64 encoding increases file size by ~33%, and a very large `config.js` will slow the overlay's initial load in OBS.

---

## A Note on AI-Assisted Development

This project does not use or include LLM or generative AI features, and none will be added. Contributions must be human-authored and may not be wholly or substantially generated by AI.

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

---

## Credits

Designed and developed by:

- Haley "Thin Mint" Stelly
- Charlie "KO Belle" Humphreys
- Hannah Keyser

Special thanks to the following leagues and events for their invaluable help with testing and feedback:

- **Nashville Roller Derby**
- **Rose City Rollers**
- **Clarksville Roller Derby**
- **Derby Date Night**

---

## License

[GPL v3](LICENSE) — free to use, modify, and distribute under the same license. See `LICENSE` for full terms.

This project is a derivative work of the [CRG Scoreboard](https://github.com/rollerderby/scoreboard) overlay, which is also distributed under the GPL v3.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a full history of releases.

---

## Acknowledgements

Built on top of [CRG Scoreboard](https://github.com/rollerderby/crg) by the CRG project contributors.
