# 🟤 Thin Mint Scoreboard Overlay — Complete Instruction Manual

> Full documentation for installation, configuration, operation, and troubleshooting.
> Version 2.0.0 Public Beta · April 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Requirements](#2-requirements)
3. [Installation](#3-installation)
   - [Option A — Serve from CRG (Simplest)](#option-a--serve-from-crg-simplest)
   - [Option B — Separate Overlay Computer](#option-b--separate-overlay-computer)
4. [Configuration File (`config.js`)](#4-configuration-file-configjs)
   - [Connection Settings](#connection-settings)
   - [Team Display Settings](#team-display-settings)
5. [Game Config Files (`configs/`)](#5-game-config-files-configs)
6. [Admin Panel](#6-admin-panel)
   - [Elements Controls](#elements-controls)
   - [Panel Switcher](#panel-switcher)
   - [Lower Third](#lower-third)
   - [Team Display](#team-display)
   - [Scaling](#scaling)
   - [Background](#background)
   - [Clock After Timeout](#clock-after-timeout)
   - [CRG Connection](#crg-connection)
   - [Preview Size](#preview-size)
7. [Keyboard Shortcuts](#7-keyboard-shortcuts)
8. [OBS Setup](#8-obs-setup)
   - [Adding the Overlay Source](#adding-the-overlay-source)
   - [Admin Panel in OBS](#admin-panel-in-obs)
9. [Pre-Bout Checklist](#9-pre-bout-checklist)
10. [Overlay Features Reference](#10-overlay-features-reference)
    - [Scorebug](#scorebug)
    - [Clock Module](#clock-module)
    - [Jammer Panel](#jammer-panel)
    - [Lineup / Blocker Panel](#lineup--blocker-panel)
    - [Roster Panels](#roster-panels)
    - [Penalty Panels](#penalty-panels)
    - [Points-per-Jam Graph](#points-per-jam-graph)
    - [Lower Third Panel](#lower-third-panel)
    - [Upcoming Game Panel](#upcoming-game-panel)
    - [Game Tab Banner](#game-tab-banner)
    - [Bottom Placement Mode](#bottom-placement-mode)
11. [Team Logos](#11-team-logos)
12. [Remote CRG Connection — How It Works](#12-remote-crg-connection--how-it-works)
13. [Connection Test Page](#13-connection-test-page)
14. [Offline Error Screen and Reconnection Badge](#14-offline-error-screen-and-reconnection-badge)
15. [Troubleshooting](#15-troubleshooting)
16. [Changelog Summary](#16-changelog-summary)

---

## 1. Overview

**Thin Mint Scoreboard Overlay (TMSB)** is a broadcast-style scoreboard overlay for roller derby, built to work with [CRG Scoreboard](https://github.com/rollerderby/crg). It is designed for use with OBS or any browser-source capture tool, and brings professional-grade live graphics to derby streams: live score, jam and period clocks, team names, timeout tracking, penalty readouts, rosters, and more.

TMSB is a pure client-side HTML/CSS/JavaScript application — it requires no additional server software beyond CRG itself. It connects to CRG via WebSocket and receives game data in real time.

Key design goals:

- **Broadcast quality** — animated score flashes, pulsing urgency indicators, synchronized blink rhythm, and smooth panel transitions.
- **Operator-friendly** — most in-game controls are single keystrokes; the Admin panel handles everything else.
- **Resilient** — clear offline error screen on startup failure, automatic reconnection on mid-bout drops, and a visible reconnection badge when the connection is interrupted.
- **Flexible deployment** — works when CRG and OBS are on the same machine, or when they are on separate computers connected by a local network.

---

## 2. Requirements

- **CRG Scoreboard** installed and running on **every machine that serves the overlay**. CRG provides `jquery.js` and `core.js`, which the overlay depends on. A separate CRG instance on the network can serve as the remote game data source.
- **A modern desktop browser** for pre-game setup: Chrome, Firefox, Edge, or Safari. Do not use OBS's built-in browser for setup — it has isolated localStorage and limited API support.
- **Network connectivity** between machines when using a separate overlay computer. Both must be on the same LAN, with port 8000 open.
- **OBS Studio** (or any tool that supports browser sources) for capture.

---

## 3. Installation

### Option A — Serve from CRG (Simplest)

Use this when CRG and OBS are on the **same machine**, or when the overlay computer also runs CRG.

1. Copy the `tmsb/` folder into your CRG installation directory:
   ```
   <crg-root>/html/custom/overlay/tmsb/
   ```
2. Start CRG Scoreboard and navigate to:
   ```
   http://localhost:8000/custom/overlay/tmsb/
   ```
   The overlay is now live and connected to the local CRG instance.
3. Open the Admin panel in a separate browser tab:
   ```
   http://localhost:8000/custom/overlay/tmsb/admin/
   ```
4. *(Optional)* Edit `config.js` to set permanent defaults for your deployment (see [Section 4](#4-configuration-file-configjs)).

### Option B — Separate Overlay Computer

Use this when the machine running OBS is **different** from the machine running CRG.

1. Copy the `tmsb/` folder to any location on the overlay computer — a folder on the desktop, a USB drive, or any accessible path. No web server is needed on the overlay computer itself.
2. Open `admin/index.html` in a desktop browser on the overlay computer.
3. Under **CRG Connection**, enter the IP address and port of the CRG machine on your network (e.g., `192.168.1.50`, port `8000`).
4. Configure team names, colors, and logos under **Team Display**.
5. Click **Save Configuration** to write all settings to `config.js`. This means the overlay will load with the correct settings automatically on every future start — including every time OBS refreshes the browser source.
6. In OBS, add the overlay as a **Browser Source** pointing to `index.html` (either a `file://` path or an HTTP URL if served by CRG). Set the resolution to match your stream canvas.

> **Important:** Always do pre-game configuration in a desktop browser, not through OBS's built-in browser. OBS's browser has isolated localStorage and limited JavaScript API access. Once `config.js` is saved, OBS will load it automatically.

---

## 4. Configuration File (`config.js`)

`config.js` lives in the root of the `tmsb/` folder and is loaded by the overlay on every page load. It lets you pre-configure a deployment so the Admin panel does not need to be used on every start.

Values set through the Admin panel (stored in localStorage and synced via CRG's WebSocket state) take **precedence** over `config.js`. Think of `config.js` as the baseline default — the Admin panel overrides it at runtime.

```js
window.TMSB_CONFIG = {

  /* ── Connection ── */
  CRG_IP:     '',         // IP of the CRG machine; blank = same host as overlay
  CRG_PORT:   '8000',     // Port CRG is listening on
  TIMEOUT_MS: 5000,       // Milliseconds before showing the offline error screen

  /* ── Team Display ── */
  TEAM1_NAME:      '',    // Display name for Team 1
  TEAM1_COLOR_FG:  '',    // Team 1 text color (e.g. '#ffffff')
  TEAM1_COLOR_BG:  '',    // Team 1 bar background color (e.g. '#1a3a6b')
  TEAM1_LOGO:      '',    // URL or base64 data URL for Team 1's logo

  TEAM2_NAME:      '',
  TEAM2_COLOR_FG:  '',
  TEAM2_COLOR_BG:  '',
  TEAM2_LOGO:      ''

};
```

Leave any value as an empty string `''` to defer to CRG's own stored value or the Admin panel setting.

### Connection Settings

| Key | Type | Description |
|---|---|---|
| `CRG_IP` | string | IP address of the CRG machine. Leave blank for same-host mode. |
| `CRG_PORT` | string | Port CRG listens on. Default: `'8000'`. |
| `TIMEOUT_MS` | number | Milliseconds before the offline error screen appears if CRG cannot be reached. Default: `5000`. |

### Team Display Settings

| Key | Type | Description |
|---|---|---|
| `TEAM1_NAME` / `TEAM2_NAME` | string | Display name shown in the scorebug and panels. |
| `TEAM1_COLOR_FG` / `TEAM2_COLOR_FG` | string | Text/foreground color as a CSS hex value. |
| `TEAM1_COLOR_BG` / `TEAM2_COLOR_BG` | string | Bar background color as a CSS hex value. |
| `TEAM1_LOGO` / `TEAM2_LOGO` | string | Logo image URL or base64 `data:` URL. See [Section 11](#11-team-logos) for guidelines. |

---

## 5. Game Config Files (`configs/`)

The `configs/` folder holds per-game configuration files — one `.js` file per matchup. This is the recommended workflow for **tournaments and any event with multiple games**: write all your configs before the event, then hot-load each one in the Admin panel between games. No manual re-entry of team names, colors, or logos between bouts.

**Recommended tournament workflow:**

Build each game's config file in the Admin panel before the event — one per matchup. The Admin panel handles logo conversion automatically, so no manual base64 encoding or file editing is needed.

1. Open `admin/index.html` in a desktop browser.
2. Under **Team Display**, enter team names, foreground and background colors for both teams.
3. For each team logo, click **Browse** and select the PNG file. The Admin panel converts it to base64 automatically.
4. Click **Embed** to write the base64 image data into the config.
5. Click **Save Configuration** and give the file a name that identifies the matchup — e.g., `01-nashville-vs-rose.js`. Using a number prefix keeps files sorted in schedule order in the dropdown.
6. Repeat for every game on the schedule.
7. At the venue, place the `tmsb/` folder (with all configs inside `configs/`) on the overlay computer.
8. **Between games:** open the Admin panel, select the next game's config from the **Game Configs** dropdown, and click **Load**. The overlay updates immediately — team names, colors, and logos all switch in one step. Refresh the OBS browser source to confirm, and you're ready.

> **Tip:** Because logos are embedded as base64 during the Admin panel workflow, each config file is fully self-contained and will load correctly even without a file server or external network access.

**To create a game config manually** (advanced / version-control workflows):

1. Copy `configs/template.js` and rename it (e.g., `nashville-vs-rose.js`).
2. Fill in the team names, colors, logos, and connection details.
3. Save it in the `configs/` folder.
4. When served through CRG, the file will appear in the Admin panel's **Game Configs** dropdown, where you can load it with one click.

Example configs are included in `configs/` for reference:

| File | Description |
|---|---|
| `template.js` | Blank starting point for a new game config |
| `basic-example.js` | Minimal localhost example |
| `singlegame-example.js` | Single-game setup with full team data |
| `tournament-example.js` | Multi-game tournament setup |
| `tru-example.js` | Extended example with logo configuration |
| `mashup-example.js` | Minimal mashup/pickup game setup |

---

## 6. Admin Panel

Open `admin/index.html` (or `http://localhost:8000/custom/overlay/tmsb/admin/`) in a desktop browser alongside the overlay. Changes made in the Admin panel take effect immediately and are synced to all connected overlay clients via CRG's WebSocket state.

> The Admin panel should **not** be added as an OBS source. It is a pre-game setup and real-time control tool meant to be used in a desktop browser.

### Elements Controls

These toggles show or hide the main overlay components.

| Control | Description |
|---|---|
| **Clock** | Shows or hides the clock module (jam clock, period clock, timeout tracking). |
| **Score** | Shows or hides the scorebug (team names, scores, timeout ticks). |
| **Jammers** | Shows or hides the jammer panel (jammer numbers, names, lead indicator, star pass, penalty state). |
| **Lineup** | Shows or hides the lineup/blocker panel with synchronized penalty blinking. |
| **Game Tab** | Shows or hides the Game Tab context banner. |
| **Bottom Placement** | Flips the entire overlay to the bottom of the screen (see [Section 10](#bottom-placement-mode)). |

### Panel Switcher

Controls which large side panel is displayed. Only one panel is visible at a time. Panels animate in and out with a slide transition.

| Panel | Description |
|---|---|
| **Roster Team 1 / Team 2** | Displays the full roster for the selected team. |
| **Penalty Team 1 / Team 2** | Displays the penalty box for the selected team with blinking indicators. |
| **Points-per-Jam** | Shows a graph of points scored per jam for both teams. |
| **Lower Third** | Shows the Lower Third panel (see below). |
| **Upcoming** | Shows the upcoming game panel with next-game information. |
| **Clear** | Hides the active panel. |

### Lower Third

The Lower Third panel displays a customizable text banner — useful for announcing skater names, sponsor messages, or custom callouts during a broadcast.

- **Line 1 / Line 2** — Set the two lines of text shown in the Lower Third.
- **Style** — Choose the visual style of the banner.
- **Skater Name Generator** — Automatically generates or cycles through skater names from the current roster, and stores them for quick recall during a game.

### Team Display

Overrides team visual data for the overlay. These settings are pushed to CRG and synced across all connected clients; they affect how the overlay displays teams, but do not change any game data (scores, clocks, penalties).

| Control | Description |
|---|---|
| **Team Name** | The display name shown in the scorebug and all panels. |
| **Text Color** | Foreground color for the team bar (name, score). |
| **Bar Color** | Background color for the team bar. |
| **Logo** | Browse and embed a team logo. See [Section 11](#11-team-logos) for the full logo workflow. |

Leave any field blank to use CRG's stored value.

### Scaling

Resizes the entire overlay between 50% and 200%. Useful when your stream canvas is a non-standard size, or when you need the overlay to appear larger or smaller relative to the video frame. The default is 100%.

### Background

Toggles the overlay background between **transparent** (for use in OBS with a video feed behind it) and **green screen** (a solid chroma-key green background, useful for hardware chroma keyers or testing).

### Clock After Timeout

Controls what clock the overlay shows immediately after a timeout ends — either the **Lineup clock** (countdown until the next jam starts) or the **Timeout clock** (duration of the timeout). Choose based on your league's broadcast conventions.

### CRG Connection

Configure the remote CRG connection from within the Admin panel. Settings entered here are stored in localStorage and pushed to all overlay clients via CRG's WebSocket state, so other machines (OBS, additional browser windows) pick them up automatically without manual configuration.

| Control | Description |
|---|---|
| **IP Address** | The IP of the CRG machine. Enter `localhost` or leave blank for same-host mode. |
| **Port** | Port CRG is listening on (default: `8000`). |
| **Timeout** | Milliseconds before the offline error screen appears (default: `5000`). |
| **Save** | Saves the current connection settings. |
| **Reset to Default** | Clears any saved connection settings and reverts to same-host mode. |

A status indicator turns **green** when CRG is connected and **orange** when the connection is lost.

### Preview Size

Resizes the live preview iframe inside the Admin panel. This affects only what you see in the Admin panel — not the actual overlay output in OBS. Useful when running the Admin panel on a smaller monitor.

---

## 7. Keyboard Shortcuts

Keyboard shortcuts control the overlay directly. To use them, **focus the overlay window** — either by clicking on it in a browser tab, or by using OBS's **Interact** feature on the Browser Source.

| Key | Action |
|---|---|
| `C` | Toggle clock module |
| `S` | Toggle scorebug |
| `J` | Toggle jammer panel |
| `L` | Toggle lineup panel |
| `G` | Toggle Game Tab banner |
| `B` | Toggle Bottom Placement mode |
| `1` | Roster — Team 1 |
| `2` | Roster — Team 2 |
| `3` | Penalty panel — Team 1 |
| `4` | Penalty panel — Team 2 |
| `0` | Points-per-Jam graph |
| `9` | Lower Third panel |
| `U` | Upcoming game panel |
| `Space` | Clear active panel |

> **Tip:** During a live broadcast, keyboard shortcuts are the primary means of operating the overlay. Practice the panel keys (`0`–`4`, `9`, `U`, `Space`) before going live.

---

## 8. OBS Setup

### Adding the Overlay Source

1. In OBS, add a **Browser Source** to your game scene.
2. Set the **URL** to one of the following:
   - `file:///path/to/tmsb/index.html` — if using a local file on the overlay computer.
   - `http://<crg-host>:8000/custom/overlay/tmsb/index.html` — if served by CRG.
3. Set **Width** and **Height** to match your stream canvas (typically `1920` × `1080` or `1280` × `720`).
4. Check **Shutdown source when not visible** to free browser resources between scenes.
5. Leave **Custom CSS** empty unless you need to suppress the reconnection badge (see [Section 14](#14-offline-error-screen-and-reconnection-badge)).

### Admin Panel in OBS

The Admin panel does **not** need to be added as an OBS source. It is a desktop-browser tool for pre-game configuration. During a live game, the overlay is operated entirely via keyboard shortcuts.

If you need to make changes mid-game (for example, correcting a team name), open `admin/index.html` in a browser tab on the overlay computer and make your changes there — they will apply to the overlay in real time.

---

## 9. Pre-Bout Checklist

Run this before every game. A printable version is included in the repo as `TMSB_preflight_checklist.md`.

**T–30 minutes — System Check**
- [ ] All machines powered on and connected to the same network
- [ ] CRG Scoreboard running with correct teams loaded
- [ ] Scoreboard operator present and ready
- [ ] OBS open with the correct scene collection loaded

**T–20 minutes — Overlay Connection**
- [ ] Browser Source present in OBS scene
- [ ] Correct `index.html` path or URL loaded
- [ ] Resolution matches canvas
- [ ] "Refresh when scene becomes active" enabled in OBS
- [ ] Run `test-connection.html` in a browser to verify CRG is reachable
- [ ] Overlay is showing live data (scores update when CRG is manipulated)

**T–15 minutes — Visual Check**
- [ ] Team names and colors correct
- [ ] Overlay positioned correctly — not cut off, not covered by other sources
- [ ] Scaling correct for the stream output

**T–10 minutes — Function Test**
- [ ] Start/stop clock → overlay clock updates
- [ ] Add points in CRG → score updates with animation
- [ ] Assign lead jammer → indicator appears
- [ ] Test each panel with keyboard shortcuts (`1`, `2`, `3`, `4`, `0`, `9`, `U`, `Space`)

**T–5 minutes — Failure Test**
- [ ] Refresh browser source → overlay reconnects cleanly
- [ ] Stop CRG briefly → overlay loses data gracefully (no crash or blank screen)
- [ ] Restart CRG → overlay reconnects automatically

**T–2 minutes — Lock In**
- [ ] Lock the browser source in OBS to prevent accidental dragging
- [ ] Confirm preview and program output look correct
- [ ] No dropped frames or performance issues from the overlay

---

## 10. Overlay Features Reference

### Scorebug

The scorebug is the main persistent graphic — a horizontal bar showing both teams' names and scores. It slides in from the top (or bottom, in Bottom Placement mode).

- **Team bars** display the team name, current score, and timeout ticks (one tick per timeout used).
- **Jam score pill** shows the points scored in the current jam as a floating delta that animates and fades.
- **Score change flash** — when a team scores, the score briefly flashes to draw viewer attention.
- **Winning score gold highlight** — whichever team is winning has their score highlighted in gold with a synchronized pulsing glow.
- The scorebug and clock module **slide together** as a single unit: both enter and exit from the correct screen edge depending on Bottom Placement mode.

### Clock Module

The clock module sits alongside the scorebug and shows timing information.

- **Jam clock** — countdown for the current jam (2:00 by default).
- **Period clock** — countdown for the current period.
- **Jam urgency indicator** — the clock bar changes appearance in the last 10 seconds of a jam.
- **Period urgency indicator** — activates in the last 60 seconds of the period, but only while a jam is running.
- **Timeout type** — displays "Official Timeout," "Team Timeout," or "Official Review" with distinct styling for each.
- **Synchronized pulse** — all live time indicators blink on a shared wall-clock rhythm, so nothing in the overlay appears to pulse independently.

### Jammer Panel

The jammer panel displays both teams' active jammers and slides in from the left (from behind the scorebug).

- **Jammer number and name** — pulled live from CRG.
- **Lead indicator** — highlights the lead jammer.
- **Star pass** — displays when a star pass occurs.
- **Penalty state** — displays when the jammer is in the penalty box.
- Jammer names truncate with an ellipsis when too long to fit.

### Lineup / Blocker Panel

Displays the active blockers for both teams.

- Penalty blinking is synchronized to the shared wall-clock pulse system.
- Shows skater numbers and names for all blockers currently on the track.

### Roster Panels

Two separate panels — one per team — showing the complete roster pulled from CRG. Activated with `1` (Team 1) or `2` (Team 2).

### Penalty Panels

Two separate panels — one per team — showing penalty data. Activated with `3` (Team 1) or `4` (Team 2). Penalty indicators blink in sync with the shared pulse system.

### Points-per-Jam Graph

Activated with `0`. Displays a running bar graph of points scored per jam for both teams across the current period. Useful for showing scoring momentum during a broadcast.

### Lower Third Panel

Activated with `9`. A customizable text banner that overlays the bottom third of the screen.

- Supports two lines of text.
- Multiple visual styles available.
- Includes a **skater name generator** that cycles through the current roster and stores names for quick recall during play-by-play announcing.

### Upcoming Game Panel

Activated with `U`. Displays information about the next game in a tournament or event schedule. Content is configured in the Admin panel or via a game config file.

### Game Tab Banner

A slim customizable banner (activated with `G`) that provides contextual information — league name, event name, game number, or any text the operator wants. Text and background color are configurable in the Admin panel.

### Bottom Placement Mode

Activated with `B` or the Admin panel toggle. Flips the entire overlay — scorebug, clock module, and all panels — to the bottom of the screen. This is useful when a video feed places key action at the top of the frame, or when another graphic already occupies the top.

In Bottom Placement mode:
- Panels animate upward from below the screen rather than downward from above.
- The clock accent line flips from the bottom edge to the top edge.
- Large panels (Roster, Penalty, PPJ) anchor to the lower portion of the screen.
- The Lower Third repositions to avoid colliding with the scorebug.
- A bottom vignette gradient appears; the top vignette hides automatically.

---

## 11. Team Logos

Team logos are embedded in `config.js` as base64 data URLs so they load reliably in OBS without requiring a separate file server.

**Recommended workflow:**

1. Prepare the logo as a **PNG with a transparent background**, sized between 400×400 and 1000×1000 pixels.
2. In the Admin panel, under **Team Display**, click **Browse** next to the team logo field and select the PNG file. The image is converted to base64 automatically.
3. Click **Embed** to insert the image into the scene. The logo will appear blended into the right side of the team bar using `mix-blend-mode: screen`.
4. Click **Save Configuration** to write the logo to `config.js` so it loads automatically on every future start.

**Logo guidelines:**

- **Format:** PNG with a transparent background is required. A solid white or black background will block the team color entirely.
- **Blend mode:** Logos are rendered with `mix-blend-mode: screen`, so light-colored and white logos show the most visibly against dark team colors. Dark logos against dark backgrounds will be nearly invisible.
- **Size:** Square or near-square works best. The overlay scales the image down automatically.
- **File size:** Keep the source PNG under 500KB. Base64 encoding adds ~33% to file size; a very large `config.js` will slow the overlay's initial load in OBS.

Logos can also be referenced as an HTTP/HTTPS URL (e.g., one hosted on CRG's file server) instead of being embedded as base64 — useful if you want to update the logo without re-saving `config.js`.

---

## 12. Remote CRG Connection — How It Works

CRG provides two JavaScript files that the overlay depends on: `jquery.js` and `core.js`. In a standard local setup, both load from the same machine serving the HTML. In a remote setup, the overlay fetches `core.js` from the configured remote CRG machine.

The remote connection mechanism works as follows:

1. **jQuery** always loads from the local serving host for reliability.
2. **`core.js`** is fetched from the configured remote CRG machine, with the timeout set by `TIMEOUT_MS`.
3. A **WebSocket intercept** redirects CRG's socket connection to the configured remote host, since CRG normally connects back to `window.location.host`.
4. A **WS stub** absorbs any `WS.Register()` calls made before `core.js` finishes loading and replays them once it arrives — preventing any game data from being lost during startup.
5. **Connection settings are synced via CRG's WebSocket state**, the same channel used to sync team names and colors. This means any overlay client that connects — including OBS, a browser tab, or a fresh machine — automatically receives the configured IP and port without manual setup on each device.

A `?v=<timestamp>` query string is appended to the `core.js` URL on every load, ensuring CRG updates are picked up immediately without a hard refresh.

---

## 13. Connection Test Page

`test-connection.html` is a standalone pre-bout tool that verifies CRG connectivity before going live. Open it in a browser on the overlay computer (not OBS) before any game.

The tool reads the same configuration as the overlay (`config.js` and localStorage) and reports:

- Whether CRG is reachable at the configured IP and port.
- Response time — useful for diagnosing slow or unreliable network connections.
- A plain-language error message distinguishing between two failure modes:
  - **Host unreachable** — the machine at the configured IP is offline or not responding.
  - **CRG not running** — the host is reachable but CRG Scoreboard is not running on the expected port.

Run this test at T–20 minutes as part of the pre-bout checklist. If it fails, resolve the connection issue before adding the overlay to OBS.

---

## 14. Offline Error Screen and Reconnection Badge

### Offline Error Screen

If the overlay cannot reach CRG on **initial load** (within `TIMEOUT_MS` milliseconds), it displays a full-screen error message instead of hanging or showing a blank frame. The error screen:

- Explains the failure in plain language.
- Distinguishes between "host unreachable" and "CRG not running."
- Does **not** display the configured IP address on screen for security.

To recover: verify CRG is running and reachable, then refresh the browser source in OBS.

### Reconnection Badge

If the WebSocket connection **drops mid-bout** (due to a CRG crash, network interruption, or other issue), a small `⟳ Reconnecting…` badge appears at the bottom of the overlay. It disappears automatically when the connection is restored. It does **not** appear during the initial load phase.

**To suppress the badge from the stream** (it will still reconnect silently), add this to the **Custom CSS** field in your OBS Browser Source:

```css
#crg-reconnecting { display: none !important; }
```

This is recommended for clean broadcast output, since viewers do not need to know about a brief network hiccup if it resolves on its own.

---

## 15. Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Overlay shows the offline error screen | CRG is not running, or IP/port is wrong | Verify CRG is running. Check `config.js` and Admin panel CRG Connection settings. Run `test-connection.html`. |
| Data is frozen mid-game | WebSocket connection dropped | Refresh the browser source in OBS. Overlay will reconnect automatically. |
| `⟳ Reconnecting…` badge visible but connection doesn't restore | CRG crashed or network interrupted | Restart CRG, then refresh the browser source. |
| Team names are wrong | Stale values in `config.js` or localStorage | Open `admin/index.html`, update Team Display, and Save Configuration. |
| Team colors are wrong | Same as above | Same fix. |
| Logo not appearing | PNG has a solid background, or logo is too dark | Re-export the logo as a PNG with a transparent background. |
| Overlay is cut off or misaligned | Browser source resolution mismatch | Confirm OBS Browser Source width/height matches your stream canvas. |
| Score not updating | CRG is not connected or correct game isn't loaded | Check CRG is running and the correct game/teams are loaded. |
| Keyboard shortcuts not working | Overlay doesn't have focus | Click the overlay window, or use OBS Interact on the browser source. |
| OBS shows a blank browser source | Incorrect file path or URL | Verify the path to `index.html` is correct and accessible. Try `test-connection.html` to confirm CRG is reachable. |
| Config changes aren't persisting | `config.js` wasn't saved after Admin changes | Click **Save Configuration** in the Admin panel after every change. |
| Overlay loads correctly in browser but not in OBS | OBS using an old cached version | In OBS, right-click the browser source → **Refresh Cache of Current Page**. |

---

## 16. Changelog Summary

| Version | Date | Summary |
|---|---|---|
| **2.0.0** | 2026-04-26 | Added connection testing utility. Major refactor of overlay structure, styling, configuration handling, loader behavior, and admin panel. |
| **1.4.0** | 2026-04-21 | Jammer panel now slides in from the left. Admin panel white background for OBS Interact legibility. Visual refinements to jammer row layout. |
| **1.3.0** | 2026-04-14 | Added Bottom Placement toggle (`B` key). Inverted vignette for bottom mode. Visual tuning across scorebug, clock bar, jammer box, and panel animations. |
| **1.2.0** | 2026-04-14 | Added `config.js` deployment config. Added `loader.js` shared bootstrap. Added reconnection badge. Configurable timeout. Cache-busting on `core.js`. Added `test-connection.html`. |
| **1.1.0** | 2026-04-11 | Remote CRG connection support. Offline error screen. Admin panel usable without CRG connection. |
| **1.0.0** | 2025-10-04 | Initial release. Live score, clocks, jammer panel, Lower Third, Roster/Penalty/PPJ panels, team overrides, scaling, keyboard shortcuts. |

---

*Designed and developed by Haley "Thin Mint" Stelly, Charlie "KO Belle" Humphreys, and Hannah Keyser.*
*Licensed under [GPL v3](LICENSE). Built on [CRG Scoreboard](https://github.com/rollerderby/crg).*
