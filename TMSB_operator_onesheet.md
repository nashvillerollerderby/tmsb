# 🟤 TMSB Operator Quick-Start

> One-page reference for setup and game-day operation.

---

## Before Game Day — Do Once

1. Copy the `tmsb/` folder into your CRG install:
   `<crg-root>/html/custom/overlay/tmsb/`
2. Open `admin/index.html` in a **desktop browser** (not OBS).
3. Under **CRG Connection**, enter the IP and port of the CRG machine (`localhost` if same machine, or an IP like `192.168.1.50` for a separate machine).
4. Set team names, colors, and logos under **Team Display**.
5. Click **Save Configuration** — this writes everything to `config.js` so OBS loads it automatically on every future start.
6. In OBS, add a **Browser Source** pointing to `index.html`. Set resolution to match your canvas (1280×720 or 1920×1080). Enable **Shutdown source when not visible**.

---

## Day-of Checklist (T–30 min)

- [ ] CRG is running and correct teams are loaded
- [ ] OBS open with correct scene collection
- [ ] TMSB Browser Source is present and showing live data
- [ ] Team names and colors look correct on screen
- [ ] Run `test-connection.html` in a browser to verify CRG connectivity
- [ ] Start/stop the clock and add a test score — confirm the overlay updates
- [ ] Refresh the browser source and confirm it reconnects cleanly

---

## During the Game — Keyboard Shortcuts

> Focus the overlay window (or use OBS Interact) to use these.

| Key | Action |
|---|---|
| `C` | Toggle clock |
| `S` | Toggle score |
| `J` | Toggle jammer panel |
| `L` | Toggle lineup panel |
| `G` | Toggle Game Tab banner |
| `B` | Toggle bottom placement |
| `1` / `2` | Roster — Team 1 / Team 2 |
| `3` / `4` | Penalties — Team 1 / Team 2 |
| `0` | Points-per-Jam graph |
| `9` | Lower Third |
| `U` | Upcoming game panel |
| `Space` | Clear active panel |

---

## Something Went Wrong?

| Symptom | Fix |
|---|---|
| Data frozen / not updating | Refresh the browser source in OBS |
| Overlay blank on load | Check CRG is running; verify the IP in `admin/index.html` |
| `⟳ Reconnecting…` badge visible | CRG connection dropped — it will auto-recover; refresh if it doesn't |
| Wrong team names/colors | Open `admin/index.html` → Team Display → update and re-save |
| Overlay cut off or misaligned | Check browser source resolution matches your canvas |
