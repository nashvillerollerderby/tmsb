# Changelog

All notable changes to Thin Mint Scoreboard Overlay are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.0.0-beta.2] - 2026-04-27

### Fixed
- Setting the CRG connection to local mode (blank, localhost, or 127.0.0.1) in the Admin panel now correctly propagates to all connected clients, including OBS Browser Source.

## [2.0.0-beta.1] - 2026-04-26

### Added
- Added connection testing utility (`test-connection.html`)
- Expanded admin interface structure and controls

### Changed
- Refactored core overlay structure (`index.html`) for improved layout and stability
- Updated styling (`index.css`) to enhance broadcast-style presentation and readability
- Improved overlay logic and data handling (`index.js`)
- Updated configuration handling (`config.js`) for better flexibility
- Enhanced loader behavior (`loader.js`) for more reliable initialization
- Improved admin panel functionality and layout (`admin/`)

### Fixed
- General stability improvements in overlay rendering and data updates
- Improved reliability of scoreboard data connection

---

## [1.4.0] — 2026-04-21

### Added
- Jammer panel now slides in from the left (from behind the scorebug) instead of from the right.
- Admin panel white background for improved legibility in the OBS Interact window.

### Changed
- Jammer panel star/indicator, number, and name vertically centred within each team row.
- Jammer row parent padding cleared so the Jamming row controls its own spacing exclusively.

---

## [1.3.0] — 2026-04-14

### Added
- **Bottom Placement toggle** in the admin panel (Elements section). Moves the scorebug, clock module, and panels to the bottom of the screen.
- Keyboard shortcut `B` toggles bottom placement from the overlay.
- `#bottom-vignette` — inverted gradient vignette shown when bottom placement is active; top vignette hides automatically.
- All bottom placement overrides scoped to `body.BottomPlacement` — no impact on default top layout.
- Text shadow on team names for improved legibility against busy backgrounds.

### Changed
- Clock status bar font changed to Montserrat 700.
- Clock status bar font size reduced to `0.9em`.
- Clock status bar letter-spacing reduced to `0.1em` to accommodate longer labels at narrower width.
- Scorebug team section width reduced from `13em` to `11em`; clock module reduced from `13rem` to `11rem`; in-jam width updated accordingly.
- Jam score pill given `padding-right: 0.6em` to separate it from the timeout ticks.
- Timeout ticks given `padding-right: 0.3em` to separate them from the right edge of the scorebug.
- Jammer box font size increased from `75%` to `85%` for better legibility.
- Jammer names now truncate with ellipsis when too long to fit.
- Jammer name given `flex: 1` so truncation fires correctly against the star indicator.
- Jammer row padding tightened to `0.1em` sides, gap to `0.05em`.
- Star/indicator reserved width reduced from `1.4em` to `1.1em`.
- In bottom placement: panels animate upward from below the screen rather than downward from above.
- In bottom placement: clock accent line flips from bottom edge to top edge.
- In bottom placement: large panels (Roster, Penalty, PPJ) anchor to `bottom: 10%`.
- In bottom placement: Lower Third repositions to `top: 15%` to avoid colliding with the scorebug.

---

## [1.2.0] — 2026-04-14

### Added
- **`config.js`** — deployment configuration file. Set `CRG_IP`, `CRG_PORT`, and `TIMEOUT_MS` once to pre-configure a machine without touching the Admin panel on every start.
- **`loader.js`** — consolidated CRG bootstrap. Replaces the duplicated Block 1 / Block 2 inline scripts that previously lived in both `index.html` and `admin/index.html`. Single source of truth for the WebSocket patch, WS stub, and async core.js loader.
- **Reconnection badge** on the overlay (`#crg-reconnecting`). A small animated pill appears at the bottom of the screen when the WebSocket drops mid-bout and disappears automatically when CRG reconnects. Hidden during the initial load phase so it doesn't conflict with the offline error screen. Can be suppressed in OBS via Custom CSS: `#crg-reconnecting { display: none !important; }`
- **Configurable timeout** in the Admin panel (CRG Connection → Timeout field). Stored in `localStorage` as `tmsb_crg_timeout` (milliseconds). Defaults to 5 s if not set.
- **Cache-busting** on `core.js` load. A `?v=<timestamp>` query string is appended on every page load so CRG updates are picked up immediately without a hard refresh.
- **`test-connection.html`** — standalone pre-bout connectivity checker. Reads the same configuration as the overlay and reports whether CRG is reachable, with response time and plain-language error messages.
- **`file://` console warning** in `loader.js`. When the page is opened directly from the filesystem with no CRG host configured, a clear warning is logged explaining the limitation.

### Changed
- **WebSocket patch now dispatches `tmsb:wsconnected` and `tmsb:wsdisconnected`** events. Both the overlay and the Admin panel listen to these for accurate live status.
- **Admin Connection panel status** now uses `tmsb:wsconnected` / `tmsb:wsdisconnected` for green/orange indicators, rather than the less meaningful `tmsb:crgready` (script loaded) event.
- **Error messages** distinguish between two failure modes:
  - *Timeout*: "No response after N s — the host may be offline or unreachable"
  - *Refused*: "The host is reachable but CRG Scoreboard does not appear to be running"
- **`ovaClearConnection`** and **`ovaApplyConnection`** now also clear/save `tmsb_crg_timeout`.

---

## [1.1.0] — 2026-04-11

### Added
- **Remote CRG connection** support. IP address and port are now configurable from the Admin panel (CRG Connection section) and stored in `localStorage`.
- **Offline error screen** on the overlay. If `core.js` cannot be loaded within the timeout period, a full-screen warning is shown instead of hanging indefinitely.
- **Admin panel remains usable** when the configured CRG host is unreachable. Connection functions are defined inline in `admin/index.html` so they are always available regardless of CRG script injection.
- **`localhost` / `127.0.0.1` / blank** IP all reset to local-server mode.
- **Reset to Default button** in the Admin panel.

### Changed
- jQuery now loads from the local serving host (not the configured remote CRG host) for reliability. Only `core.js` is fetched remotely.
- WebSocket connections are intercepted and redirected to the configured remote host.

---

## [1.0.0] — 2025-10-04

### Added
- Initial release of Thin Mint Scoreboard Overlay.
- Live score, jam clock, period clock, and timeout tracking.
- Animated score change flash and jam-score delta float.
- Jam and period urgency indicators.
- Timeout type styling (Official, Team, Review).
- Lower Third panel with skater name generator and store.
- Roster, Penalty, and Points-per-Jam panels.
- Upcoming game panel.
- Team name overrides and colour controls.
- Scaling (50–200%), background colour, and clock-after-timeout settings.
- Keyboard shortcuts for all panels and toggles.
