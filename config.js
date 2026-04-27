/*
 * Thin Mint Scoreboard Overlay
 * Copyright (C) 2026 Haley "Thin Mint" Stelly
 *
 * This file is an original work (not derived from CRG Scoreboard).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See LICENSE and NOTICE for full details.
 */
/**
 * Thin Mint Scoreboard Overlay — deployment configuration
 *
 * Edit this file to pre-configure a deployment. Values here act as
 * defaults; anything set through the Admin panel (stored in localStorage)
 * takes precedence and survives page reloads.
 *
 * ── Connection ────────────────────────────────────────────────────────────
 *
 * CRG_IP  (string)
 *   IP address of the machine running CRG Scoreboard.
 *   Leave blank ('') to connect to the same host serving this page.
 *   Example: '192.168.1.50'
 *
 * CRG_PORT  (string)
 *   Port CRG is listening on. Default is '8000'.
 *
 * TIMEOUT_MS  (number)
 *   Milliseconds to wait for core.js before showing the offline error screen.
 *   Default: 5000 (5 seconds).
 *
 * ── Team Display ──────────────────────────────────────────────────────────
 *
 * These values are applied locally on the overlay computer and pushed to
 * CRG on every connection. They override whatever colors/names are stored
 * in CRG, but do not affect any game data (scores, clocks, penalties).
 *
 * Leave any value blank ('') to let CRG's own stored value take effect.
 *
 * TEAM1_NAME  (string)  Display name for Team 1. Example: 'Nashville'
 * TEAM1_COLOR_FG  (string)  Team 1 text color.  Example: '#ffffff'
 * TEAM1_COLOR_BG  (string)  Team 1 bar color.   Example: '#1a3a6b'
 *
 * TEAM2_NAME  (string)  Display name for Team 2.
 * TEAM2_COLOR_FG  (string)  Team 2 text color.
 * TEAM2_COLOR_BG  (string)  Team 2 bar color.
 *
 * TEAM1_LOGO  (string)  URL of Team 1's logo image. Can be an HTTP/HTTPS
 *   URL accessible on the network, or a base64 data: URL for offline use.
 *   The logo is blended into the right side of the team bar.
 *   Example: 'http://192.168.1.50:8000/images/team1.png'
 *
 * TEAM2_LOGO  (string)  URL of Team 2's logo image.
 *
 * ─────────────────────────────────────────────────────────────────────────
 */
window.TMSB_CONFIG = {

  /* ── Connection ── */
  CRG_IP:     '',
  CRG_PORT:   '8000',
  TIMEOUT_MS: 5000,

  /* ── Team Display ── */
  TEAM1_NAME:      '',
  TEAM1_COLOR_FG:  '',
  TEAM1_COLOR_BG:  '',
  TEAM1_LOGO:      '',

  TEAM2_NAME:      '',
  TEAM2_COLOR_FG:  '',
  TEAM2_COLOR_BG:  '',
  TEAM2_LOGO:      ''

};
