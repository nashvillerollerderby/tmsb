/*
 * TMSB Overlay
 * Copyright (C) 2026 Haley "Thin Mint" Stelly
 *
 * Derived from the CRG Scoreboard overlay.
 * Original source: https://github.com/rollerderby/scoreboard
 * Original authors: CRG Scoreboard contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See LICENSE and NOTICE for full details.
 */
WS.Register(
  [
    'ScoreBoard.CurrentGame.Clock(Timeout).Running',
    'ScoreBoard.CurrentGame.Clock(*).Name',
    'ScoreBoard.CurrentGame.TimeoutOwner',
    'ScoreBoard.CurrentGame.OfficialReview',
    'ScoreBoard.CurrentGame.Team(*).Timeouts',
    'ScoreBoard.CurrentGame.ClockDuringFinalScore'
  ],
  sbSetActiveTimeout
);

WS.Register(['ScoreBoard.Settings.Setting(Overlay.TMSB.ClockAfterTimeout)', 'ScoreBoard.CurrentGame.Clock(*).Running', 'ScoreBoard.CurrentGame.InJam'],
  function (k) { _sbClockSelect('ScoreBoard.CurrentGame', 'Overlay.TMSB.ClockAfterTimeout') });

WS.Register('ScoreBoard.CurrentGame.Rule(Penalties.NumberToFoulout)');

/* Re-apply local name/colour overrides after every CRG update to these
   keys. The callback uses a debounced requestAnimationFrame so our
   re-apply always fires AFTER any rAF-deferred core.js sbCss renders
   for the same key update, regardless of callback registration order. */
var _tmsbRenderPending = false;
WS.Register([
  'ScoreBoard.CurrentGame.Team(1).Name',
  'ScoreBoard.CurrentGame.Team(1).AlternateName(overlay)',
  'ScoreBoard.CurrentGame.Team(1).Color(overlay.fg)',
  'ScoreBoard.CurrentGame.Team(1).Color(overlay.bg)',
  'ScoreBoard.CurrentGame.Team(2).Name',
  'ScoreBoard.CurrentGame.Team(2).AlternateName(overlay)',
  'ScoreBoard.CurrentGame.Team(2).Color(overlay.fg)',
  'ScoreBoard.CurrentGame.Team(2).Color(overlay.bg)'
], function () {
  if (!_tmsbRenderPending) {
    _tmsbRenderPending = true;
    requestAnimationFrame(function () {
      _tmsbRenderPending = false;
      _tmsbForceRenderTeamDisplay();
    });
  }
});

/* TMSB-namespaced team settings stored in CRG — written by ltsApply and
   broadcast to every connected overlay instance. On receive, update
   localStorage (used by _tmsbForceRenderTeamDisplay / _tmsbApplyLogos)
   then render. This is the shared configuration source for names, colours,
   logos, and logo positions across all browsers and OBS instances. */
var _tmsbTeamKeyMap = [
  { ws: 'ScoreBoard.Settings.Setting(Overlay.TMSB.Team1.Name)',    ls: 'tmsb_team1_name',        render: 'team' },
  { ws: 'ScoreBoard.Settings.Setting(Overlay.TMSB.Team1.ColorFg)', ls: 'tmsb_team1_color_fg',    render: 'team' },
  { ws: 'ScoreBoard.Settings.Setting(Overlay.TMSB.Team1.ColorBg)', ls: 'tmsb_team1_color_bg',    render: 'team' },
  { ws: 'ScoreBoard.Settings.Setting(Overlay.TMSB.Team1.Logo)',    ls: 'tmsb_team1_logo',        render: 'logo' },
  { ws: 'ScoreBoard.Settings.Setting(Overlay.TMSB.Team1.LogoY)',   ls: 'tmsb_team1_logo_y',      render: 'logo' },
  { ws: 'ScoreBoard.Settings.Setting(Overlay.TMSB.Team2.Name)',    ls: 'tmsb_team2_name',        render: 'team' },
  { ws: 'ScoreBoard.Settings.Setting(Overlay.TMSB.Team2.ColorFg)', ls: 'tmsb_team2_color_fg',    render: 'team' },
  { ws: 'ScoreBoard.Settings.Setting(Overlay.TMSB.Team2.ColorBg)', ls: 'tmsb_team2_color_bg',    render: 'team' },
  { ws: 'ScoreBoard.Settings.Setting(Overlay.TMSB.Team2.Logo)',    ls: 'tmsb_team2_logo',        render: 'logo' },
  { ws: 'ScoreBoard.Settings.Setting(Overlay.TMSB.Team2.LogoY)',   ls: 'tmsb_team2_logo_y',      render: 'logo' }
];
_tmsbTeamKeyMap.forEach(function (m) {
  WS.Register(m.ws, function (k, v) {
    if (v) { localStorage.setItem(m.ls, v); }
    else   { localStorage.removeItem(m.ls); }
    if (m.render === 'logo') { _tmsbApplyLogos(); }
    else                     { _tmsbForceRenderTeamDisplay(); }
  });
});

/* Connection settings stored in CRG — written by Admin panel on Apply.
   Every overlay client that connects receives these and caches them in
   localStorage so any browser (Chrome, OBS, a fresh profile) has the
   correct CRG IP on its next cold start, without manual Admin panel
   setup on each machine.  No re-render needed; loader.js consumes
   these values only at page-load time. */
var _tmsbConnKeyMap = [
  { ws: 'ScoreBoard.Settings.Setting(Overlay.TMSB.CrgIp)',      ls: 'tmsb_crg_ip'      },
  { ws: 'ScoreBoard.Settings.Setting(Overlay.TMSB.CrgPort)',     ls: 'tmsb_crg_port'    },
  { ws: 'ScoreBoard.Settings.Setting(Overlay.TMSB.CrgTimeout)',  ls: 'tmsb_crg_timeout' }
];
_tmsbConnKeyMap.forEach(function (m) {
  WS.Register(m.ws, function (k, v) {
    if (v) { localStorage.setItem(m.ls, v); }
    else   { localStorage.removeItem(m.ls); }
  });
});

WS.AfterLoad(function () {
  $('body').removeClass('preload');
  _tmsbApplyLocalTeamSettings();

  /* Force our overlay-specific settings to known safe values so the stock
     CRG overlay's settings (Lineups, ShowNames etc.) can't bleed through.
     We set these in our own Overlay.TMSB namespace so they only
     affect this overlay, not the stock one. */
  WS.Set('ScoreBoard.Settings.Setting(Overlay.TMSB.ShowLineups)', false);
  WS.Set('ScoreBoard.Settings.Setting(Overlay.TMSB.ShowNames)',   false);
  WS.Set('ScoreBoard.Settings.Setting(Overlay.TMSB.ShowPenaltyClocks)', false);
});

/* ── Local team settings ───────────────────────────────────────────────────
   Reads team names and colours from localStorage (set via the Admin panel)
   with fallback to config.js defaults.

   Values are applied locally only — they are NOT written back to CRG via
   WS.Set. This means the operator's machine and any stock CRG overlay are
   completely unaffected; only this overlay instance sees the overrides.

   Implementation uses two layers:
   1. WS.state property interceptors — installed once at load time. Every
      time CRG's rendering pipeline reads a name or colour key from
      WS.state (for sbDisplay / sbCss), it receives our local value
      instead. Interceptors track CRG's live value in a closure so the
      fallback chain (local → config.js → CRG) still works if no override
      is set.
   2. Force-render — a direct DOM update applied immediately after
      interceptors are installed (since AfterLoad has already rendered the
      initial state) and again after every WS reconnect (since CRG may
      have re-pushed fresh state that the interceptors haven't caught yet).
──────────────────────────────────────────────────────────────────────────── */

/* Called once from WS.AfterLoad. */
function _tmsbApplyLocalTeamSettings() {
  _tmsbInstallStateOverrides();
  _tmsbForceRenderTeamDisplay();
}

/* Install WS.state property interceptors for team name and colour keys.
   Each interceptor's getter returns: local override → config.js default
   → whatever CRG last sent. The setter silently tracks CRG's value so
   the fallback stays current without writing anything back to the server. */
var _tmsbOverridesInstalled = false;
function _tmsbInstallStateOverrides() {
  if (_tmsbOverridesInstalled) { return; }
  _tmsbOverridesInstalled = true;

  var overrides = [
    { key: 'ScoreBoard.CurrentGame.Team(1).AlternateName(overlay)', ls: 'tmsb_team1_name',     cfgKey: 'TEAM1_NAME'      },
    { key: 'ScoreBoard.CurrentGame.Team(1).Color(overlay.fg)',       ls: 'tmsb_team1_color_fg', cfgKey: 'TEAM1_COLOR_FG'  },
    { key: 'ScoreBoard.CurrentGame.Team(1).Color(overlay.bg)',       ls: 'tmsb_team1_color_bg', cfgKey: 'TEAM1_COLOR_BG'  },
    { key: 'ScoreBoard.CurrentGame.Team(2).AlternateName(overlay)', ls: 'tmsb_team2_name',     cfgKey: 'TEAM2_NAME'      },
    { key: 'ScoreBoard.CurrentGame.Team(2).Color(overlay.fg)',       ls: 'tmsb_team2_color_fg', cfgKey: 'TEAM2_COLOR_FG'  },
    { key: 'ScoreBoard.CurrentGame.Team(2).Color(overlay.bg)',       ls: 'tmsb_team2_color_bg', cfgKey: 'TEAM2_COLOR_BG'  }
  ];

  overrides.forEach(function (o) {
    var _crg = WS.state[o.key];
    Object.defineProperty(WS.state, o.key, {
      get: function () {
        var local = localStorage.getItem(o.ls) || (window.TMSB_CONFIG || {})[o.cfgKey] || '';
        return local || _crg;
      },
      set: function (v) { _crg = v; },
      configurable: true,
      enumerable:   true
    });
  });
}

/* Apply local team overrides to the DOM.
   Runs immediately (initial load, reconnect, storage change) and also via
   a debounced rAF from the WS.Register callback to fire after any
   rAF-deferred core.js sbCss renders.
   Belt-and-suspenders selectors cover both possible [Team="N"] placements:
   on the row element itself ([Team="N"].barBackground) and as a parent
   with the row as a descendant ([Team="N"] .barBackground). jQuery
   deduplicates matched elements so the correct target is found either way
   without double-applying. */
function _tmsbForceRenderTeamDisplay() {
  [1, 2].forEach(function (n) {
    var cfg  = window.TMSB_CONFIG || {};
    var name = localStorage.getItem('tmsb_team' + n + '_name')     || cfg['TEAM' + n + '_NAME']      || '';
    var fg   = localStorage.getItem('tmsb_team' + n + '_color_fg') || cfg['TEAM' + n + '_COLOR_FG']  || '';
    var bg   = localStorage.getItem('tmsb_team' + n + '_color_bg') || cfg['TEAM' + n + '_COLOR_BG']  || '';

    if (name) {
      /* Scope to .barBackground only — the JammerBox .Name is a sibling
         of .barBackground under the same [Team="N"] wrapper, so the
         unscoped selector would overwrite jammer names with the team name. */
      $('[Team="' + n + '"] .barBackground .Name').text(name);
      $('[sbContext="Team(' + n + ')"][sbDisplay*="AlternateName"]').text(name);
    }
    if (fg) {
      /* Same scoping — jammer names should always be #111111, not the
         team fg colour. Colour is only applied to the scorebug team name. */
      $('[Team="' + n + '"] .barBackground .Name').css('color', fg);
      $('[sbContext="Team(' + n + ')"][sbCss*="overlay.fg"]').css('color', fg);
    }
    if (bg) {
      var grad = 'linear-gradient(to right, ' + bg + ' 0%, ' + bg + ' 54%, rgba(255,255,255,0.015) 68%, rgba(17,17,17,0.045) 100%)';
      $('[Team="' + n + '"].barBackground, [Team="' + n + '"] .barBackground').css('background', grad);
      $('[Team="' + n + '"] .GlowLine').css({ background: 'linear-gradient(to right, ' + bg + ', transparent)', color: bg });
      $('[sbContext="Team(' + n + ')"][sbCss*="overlay.bg"]').css({ background: bg, backgroundColor: bg });
    }
  });
}

/* Re-render after each reconnect — interceptors are already in place,
   but CRG may have re-sent fresh state that needs overriding in the DOM. */
document.addEventListener('tmsb:wsconnected', function () {
  if (window._TMSB_WS_CONNECTED) {
    _tmsbForceRenderTeamDisplay();
  }
});

function _ovlToggleSetting(s) {
  WS.Set(
    'ScoreBoard.Settings.Setting(Overlay.TMSB.' + s + ')',
    !isTrue(WS.state['ScoreBoard.Settings.Setting(Overlay.TMSB.' + s + ')'])
  );
}

function _ovlTogglePanel(p) {
  WS.Set(
    'ScoreBoard.Settings.Setting(Overlay.TMSB.Panel)',
    WS.state['ScoreBoard.Settings.Setting(Overlay.TMSB.Panel)'] === p ? '' : p
  );
}

function ovlHandleKey(k, v, elem, e) {
  switch (e.which) {
    case 67: // c — Clock
      _ovlToggleSetting('Clock');
      break;
    case 83: // s — Score
      _ovlToggleSetting('Score');
      break;
    case 74: // j — Jammers; also turns off lineup panel if on
      var jammersOn = WS.state['ScoreBoard.Settings.Setting(Overlay.TMSB.ShowJammers)'];
      _ovlToggleSetting('ShowJammers');
      if (jammersOn) {
        WS.Set('ScoreBoard.Settings.Setting(Overlay.TMSB.ShowTrack)', false);
      }
      break;
    case 76: // l — Lineup; also turns on jammers if off
      var trackOn = WS.state['ScoreBoard.Settings.Setting(Overlay.TMSB.ShowTrack)'];
      _ovlToggleSetting('ShowTrack');
      if (!trackOn) {
        WS.Set('ScoreBoard.Settings.Setting(Overlay.TMSB.ShowJammers)', true);
      }
      break;
    case 71: // g — Game Tab
      _ovlToggleSetting('GameTab.Show');
      break;
    case 66: // b — Bottom Placement
      _ovlToggleSetting('BottomPlacement');
      break;
    case 78: // n
      _ovlToggleSetting('ShowAllNames');
      break;
    case 80: // p
      _ovlToggleSetting('ShowPenaltyClocks');
      break;
    case 48: // 0
      _ovlTogglePanel('PPJBox');
      break;
    case 49: // 1
      _ovlTogglePanel('RosterTeam1');
      break;
    case 50: // 2
      _ovlTogglePanel('RosterTeam2');
      break;
    case 51: // 3
      _ovlTogglePanel('PenaltyTeam1');
      break;
    case 52: // 4
      _ovlTogglePanel('PenaltyTeam2');
      break;
    case 57: // 9
      _ovlTogglePanel('LowerThird');
      break;
    case 85: // u
      _ovlTogglePanel('Upcoming');
      break;
    case 32: // space
      WS.Set('ScoreBoard.Settings.Setting(Overlay.TMSB.Panel)', '');
      break;
  }
}

function ovlToBackground(k, v) {
  return v || 'transparent';
}

function ovlToIndicator(k, v) {
  var prefix = k.substring(0, k.lastIndexOf('.'));
  return isTrue(WS.state[prefix + '.StarPass'])
    ? 'SP'
    : isTrue(WS.state[prefix + '.Lost'])
      ? ''
      : isTrue(WS.state[prefix + '.Lead'])
        ? '★'
        : '';
}

function ovlIsJamming(k, v, elem) {
  return (isTrue(v) && elem.attr('Position') === 'Pivot') || (!isTrue(v) && elem.attr('Position') === 'Jammer');
}

function ovlToPpjColumnWidth(k, v, elem) {
  var ne1 = $('.PPJBox [Team="1"] .GraphBlock').length;
  const ne2 = $('.PPJBox [Team="2"] .GraphBlock').length;
  if (ne2 > ne1) {
    ne1 = ne2;
  }
  const wid = parseInt(elem.parent().parent().innerWidth());
  const newWidth = parseInt(wid / ne1) - 4;
  $('.ColumnWidth').css('width', newWidth);

  return newWidth;
}

function ovlToPpjMargin(k, v, elem) {
  if (k.TeamJam === '2') {
    return 0;
  }
  return parseInt(elem.parent().innerHeight()) - v * 4;
}

function ovlToLowerThirdColorFg() {
  return _ovlToLowerThirdColor('overlay.fg');
}

function ovlToLowerThirdColorBg() {
  return _ovlToLowerThirdColor('overlay.bg');
}

function _ovlToLowerThirdColor(type) {
  switch (WS.state['ScoreBoard.Settings.Setting(Overlay.TMSB.LowerThird.Style)']) {
    case 'ColourTeam1':
      return WS.state['ScoreBoard.CurrentGame.Team(1).Color(' + type + ')'];
    case 'ColourTeam2':
      return WS.state['ScoreBoard.CurrentGame.Team(2).Color(' + type + ')'];
    default:
      return '';
  }
}

function _setClockDescriptionStyle(bg, fg) {
  const $desc = $('.ClockDescription');
  const $clock = $('.AnimatedPanel.TopClock');

  $desc.css('backgroundColor', bg || '');
  $desc.css('color', fg || '');

  if (bg) {
    $clock.css('--timeout-team-bg', bg);
  } else {
    $clock.css('--timeout-team-bg', '');
  }

  if (fg) {
    $clock.css('--timeout-team-fg', fg);
  } else {
    $clock.css('--timeout-team-fg', '');
  }
}

function _matchTimeoutOwnerToTeam(rawOwner) {
  const raw = String(rawOwner || '').trim();
  if (!raw) {
    return '';
  }

  const lower = raw.toLowerCase();
  const teamFields = [
    'Id',
    'Name',
    'AlternateName',
    'AlternateName(overlay)',
    'FullName',
    'LeagueName'
  ];

  for (let teamId = 1; teamId <= 2; teamId += 1) {
    for (const field of teamFields) {
      const value = WS.state['ScoreBoard.CurrentGame.Team(' + teamId + ').' + field];
      if (!value) {
        continue;
      }
      const candidate = String(value).trim();
      if (!candidate) {
        continue;
      }
      const candidateLower = candidate.toLowerCase();
      if (raw === candidate || lower === candidateLower || lower.indexOf(candidateLower) !== -1) {
        return String(teamId);
      }
    }
  }

  return '';
}

function _normalizeTimeoutOwner(owner) {
  if (owner === undefined || owner === null) {
    return '';
  }

  const raw = String(owner).trim();
  if (!raw) {
    return '';
  }

  const lower = raw.toLowerCase();
  if (raw === 'O' || lower === 'official' || lower === 'official timeout') {
    return 'O';
  }

  if (raw === '1' || raw === '2') {
    return raw;
  }

  const explicitTeam = lower.match(/(?:^|[^a-z])team\s*[\(\[]?\s*([12])\s*[\)\]]?(?:[^a-z]|$)/i)
    || lower.match(/(?:^|[^a-z])t([12])(?:[^a-z]|$)/i);
  if (explicitTeam) {
    return explicitTeam[1];
  }

  if (/(^|[^a-z])home([^a-z]|$)|(^|[^a-z])left([^a-z]|$)/i.test(lower)) {
    return '1';
  }

  if (/(^|[^a-z])away([^a-z]|$)|(^|[^a-z])right([^a-z]|$)/i.test(lower)) {
    return '2';
  }

  return _matchTimeoutOwnerToTeam(raw);
}

function _inferTimeoutOwnerFromDots() {
  const team1Current = document.querySelector('.TeamBox [Team="1"] .Dot.Timeout1.Current, .TeamBox [Team="1"] .Dot.Timeout2.Current, .TeamBox [Team="1"] .Dot.Timeout3.Current');
  const team2Current = document.querySelector('.TeamBox [Team="2"] .Dot.Timeout1.Current, .TeamBox [Team="2"] .Dot.Timeout2.Current, .TeamBox [Team="2"] .Dot.Timeout3.Current');

  if (team1Current && !team2Current) {
    return '1';
  }

  if (team2Current && !team1Current) {
    return '2';
  }

  return '';
}

function _getTeamOverlayColors(owner) {
  const teamId = _normalizeTimeoutOwner(owner) || _inferTimeoutOwnerFromDots();
  const cfg = window.TMSB_CONFIG || {};

  if (!teamId || teamId === 'O') {
    return null;
  }

  const bg = WS.state['ScoreBoard.CurrentGame.Team(' + teamId + ').Color(overlay.bg)']
    || localStorage.getItem('tmsb_team' + teamId + '_color_bg')
    || cfg['TEAM' + teamId + '_COLOR_BG']
    || '';
  const fg = WS.state['ScoreBoard.CurrentGame.Team(' + teamId + ').Color(overlay.fg)']
    || localStorage.getItem('tmsb_team' + teamId + '_color_fg')
    || cfg['TEAM' + teamId + '_COLOR_FG']
    || '';

  if (!bg && !fg) {
    return null;
  }

  return {
    bg: bg || '#888888',
    fg: fg || '#111111'
  };
}

function ovlToClockType() {
  var ret;
  const to = WS.state['ScoreBoard.CurrentGame.TimeoutOwner'];
  const or = WS.state['ScoreBoard.CurrentGame.OfficialReview'];
  const tc = WS.state['ScoreBoard.CurrentGame.Clock(Timeout).Running'];
  const lc = WS.state['ScoreBoard.CurrentGame.Clock(Lineup).Running'];
  const ic = WS.state['ScoreBoard.CurrentGame.Clock(Intermission).Running'];
  const jc = WS.state['ScoreBoard.CurrentGame.InJam'];

  if (jc) {
    ret = 'Jam';
    _setClockDescriptionStyle('#888', '');
  } else if (lc) {
    ret = WS.state['ScoreBoard.CurrentGame.Clock(Lineup).Name'];
    _setClockDescriptionStyle('#888', '');
  } else if (tc) {
    ret = WS.state['ScoreBoard.CurrentGame.Clock(Timeout).Name'];
    if (to !== '' && to !== 'O' && or) {
      ret = 'Official Review';
      _setClockDescriptionStyle('#d4af37', '#111111');
    }
    if (to !== '' && to !== 'O' && !or) {
      ret = 'Team Timeout';
      const colors = _getTeamOverlayColors(to);
      _setClockDescriptionStyle(colors ? colors.bg : '#888888', colors ? colors.fg : '#111111');
    }
    if (to === 'O') {
      ret = 'Official Timeout';
      _setClockDescriptionStyle('#005fa3', '#ffffff');
    }
    if (to === '' && !or) {
      _setClockDescriptionStyle('red', '#ffffff');
    }
  } else if (ic) {
    const num = WS.state['ScoreBoard.CurrentGame.Clock(Intermission).Number'];
    const max = WS.state['ScoreBoard.CurrentGame.Rule(Period.Number)'];
    const isOfficial = WS.state['ScoreBoard.CurrentGame.OfficialScore'];
    const showDuringOfficial = WS.state['ScoreBoard.CurrentGame.ClockDuringFinalScore'];
    if (isOfficial) {
      if (showDuringOfficial) {
        ret = WS.state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.OfficialWithClock)'];
      } else {
        ret = WS.state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Official)'];
      }
    } else if (num === 0) {
      ret = WS.state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.PreGame)'];
    } else if (num != max) {
      ret = WS.state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Intermission)'];
    } else if (!isOfficial) {
      ret = WS.state['ScoreBoard.Settings.Setting(ScoreBoard.Intermission.Unofficial)'];
    }

    _setClockDescriptionStyle('blue', '#ffffff');
  } else {
    ret = 'Coming Up';
    _setClockDescriptionStyle('blue', '#ffffff');
  }

  return ret;
}

/* ── Final winning score highlight ────────────────────────────────────────
   Applies tmsb-winning to the team wrapper ([Team="N"]) with the higher
   score only after CRG declares Official Score. During normal gameplay,
   including the Unofficial Score window after the final jam, the class is
   cleared so the leading team does not glow yellow prematurely. */
(function () {
  function _updateWinner() {
    var st = (window.WS && window.WS.state) ? window.WS.state : {};
    var t1 = document.querySelector('.TeamBox [Team="1"]');
    var t2 = document.querySelector('.TeamBox [Team="2"]');
    if (!t1 || !t2) { return; }

    var isOfficial = !!st['ScoreBoard.CurrentGame.OfficialScore'];
    if (!isOfficial) {
      t1.classList.remove('tmsb-winning');
      t2.classList.remove('tmsb-winning');
      return;
    }

    var s1 = parseInt(st['ScoreBoard.CurrentGame.Team(1).Score'] || 0, 10);
    var s2 = parseInt(st['ScoreBoard.CurrentGame.Team(2).Score'] || 0, 10);
    t1.classList.toggle('tmsb-winning', s1 > s2);
    t2.classList.toggle('tmsb-winning', s2 > s1);
  }
  WS.Register([
    'ScoreBoard.CurrentGame.Team(1).Score',
    'ScoreBoard.CurrentGame.Team(2).Score',
    'ScoreBoard.CurrentGame.OfficialScore'
  ], _updateWinner);
  document.addEventListener('tmsb:wsconnected', _updateWinner);
})();

/* ── Team logo injection ──────────────────────────────────────────────────── */
function _tmsbApplyLogos() {
  var cfg   = window.TMSB_GAME_CONFIG || window.TMSB_CONFIG || {};
  var logo1 = localStorage.getItem('tmsb_team1_logo') || cfg.TEAM1_LOGO || '';
  var logo2 = localStorage.getItem('tmsb_team2_logo') || cfg.TEAM2_LOGO || '';
  var logoY1 = localStorage.getItem('tmsb_team1_logo_y') || cfg.TEAM1_LOGO_Y || cfg.LOGO_Y || '50';
  var logoY2 = localStorage.getItem('tmsb_team2_logo_y') || cfg.TEAM2_LOGO_Y || cfg.LOGO_Y || '50';
  var rules = [];
  /* Selector is .TeamBox [Team="N"] .TeamLogo (specificity 0,3,0) to match
     the static index.css rules (.TeamBox .Team .TeamLogo) that also use
     !important. Two !important declarations resolve by specificity, so this
     selector must be >= 0,3,0 to win the tie. [Team] is stamped by CRG's
     sbForeach on the wrapper div, not on .Team, so .Team must not be part
     of the [Team] compound selector — but .TeamBox as a leading ancestor
     is safe and provides the needed specificity boost.
     The dynamic <style> element is appended to <head> after index.css loads,
     so ties go to the dynamic rule (later in cascade order). */
  if (logo1) { rules.push('.TeamBox [Team="1"] .TeamLogo { background-image: url(' + JSON.stringify(logo1) + '); background-position: 50% ' + logoY1 + '% !important; }'); }
  else        { rules.push('.TeamBox [Team="1"] .TeamLogo { background-position: 50% ' + logoY1 + '% !important; }'); }
  if (logo2) { rules.push('.TeamBox [Team="2"] .TeamLogo { background-image: url(' + JSON.stringify(logo2) + '); background-position: 50% ' + logoY2 + '% !important; }'); }
  else        { rules.push('.TeamBox [Team="2"] .TeamLogo { background-position: 50% ' + logoY2 + '% !important; }'); }
  var NL = String.fromCharCode(10);
  var el = document.getElementById('tmsb-logo-styles');
  if (!el) { el = document.createElement('style'); el.id = 'tmsb-logo-styles'; document.head.appendChild(el); }
  el.textContent = rules.join(NL);
}
WS.AfterLoad(function () { _tmsbApplyLogos(); });
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _tmsbApplyLogos);
} else {
  _tmsbApplyLogos();
}
/* Team settings (names, colours, logos) are now stored in CRG under
   Overlay.TMSB.* keys and received via WS.Register above. localStorage
   is used only as a local cache seeded by those callbacks. No storage
   event listener is needed for team settings. */

/* ── Game Tab positioning ─────────────────────────────────────────────────── */
function _positionGameTab() {
  var tb = document.querySelector('.TeamBox');
  var gt = document.querySelector('.GameTab');
  if (!tb || !gt) { return; }
  var tbRect      = tb.getBoundingClientRect();
  var cs          = window.getComputedStyle(tb);
  var borderLeft  = parseFloat(cs.borderLeftWidth)  || 1;
  var borderRight = parseFloat(cs.borderRightWidth) || 1;
  // Score panel is always --tmsb-team-panel-w (11em) wide regardless of
  // jammer panel state or TeamBox animation. Computing from the TeamBox's
  // own font-size gives the correct px value at any point in the transition.
  var SCORE_PANEL_EM = 11;
  var tbFontSize  = parseFloat(cs.fontSize) || 32;
  var scoreRight  = tbRect.left + borderLeft + (SCORE_PANEL_EM * tbFontSize) - 1;
  gt.style.width = 'auto';
  gt.style.left  = tbRect.left + 'px';
  gt.style.right = (window.innerWidth - scoreRight) + 'px';
  var isBottom = document.body.classList.contains('BottomPlacement');
  var TUCK = 4; // px overlap into the score panel edge
  if (isBottom) {
    gt.style.top    = 'auto';
    gt.style.bottom = (window.innerHeight - tbRect.top - TUCK) + 'px';
  } else {
    gt.style.bottom = 'auto';
    gt.style.top    = (tb.offsetTop + tb.offsetHeight - TUCK) + 'px';
  }
}
window.addEventListener('resize', _positionGameTab);
(function () {
  var tb = document.querySelector('.TeamBox');
  if (!tb) { return; }
  if (window.MutationObserver) {
    new MutationObserver(_positionGameTab).observe(tb, { attributes: true, attributeFilter: ['class', 'style'] });
    /* Also watch body for BottomPlacement class toggle */
    new MutationObserver(_positionGameTab).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
  if (window.ResizeObserver) {
    new ResizeObserver(_positionGameTab).observe(tb);
  }
})();
WS.AfterLoad(function () { requestAnimationFrame(function() { requestAnimationFrame(_positionGameTab); }); });

/* Derives a symmetric gradient from the picked colour, matching the
   style of the ClockBarMiddle stripe: edges darkened to ~72%, centre
   at full brightness at 55%. Works on any hex colour from the picker. */
function _tmsbDarkenHex(hex, factor) {
  var c = hex.replace('#', '');
  if (c.length === 3) { c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2]; }
  var r = Math.round(parseInt(c.slice(0,2), 16) * factor);
  var g = Math.round(parseInt(c.slice(2,4), 16) * factor);
  var b = Math.round(parseInt(c.slice(4,6), 16) * factor);
  return '#' + [r,g,b].map(function(n){ return ('0'+n.toString(16)).slice(-2); }).join('');
}
function ovlGameTabBg(k, v) {
  var mid  = v || '#f5c518';
  var edge = _tmsbDarkenHex(mid, 0.72);
  return 'linear-gradient(to right, ' + edge + ' 0%, ' + mid + ' 48%, ' + mid + ' 62%, ' + edge + ' 100%)';
}
function ovlGameTabFg(k, v) { return v || '#111111'; }

/* ── Pre-game score reveal ────────────────────────────────────────────────── */
(function () {
  var _started = false;
  function _markStarted() {
    if (_started) { return; }
    _started = true;
    document.body.classList.add('GameStarted');
    if (_obs) { _obs.disconnect(); }
  }
  var _obs = null;
  function _watchForFirstJam() {
    var tb = document.querySelector('.TeamBox');
    if (!tb) { return; }
    // If InJam is already set when we attach (e.g. overlay opened mid-jam),
    // mark started immediately rather than waiting for a class mutation.
    if (tb.classList.contains('InJam')) { _markStarted(); return; }
    _obs = new MutationObserver(function () {
      if (tb.classList.contains('InJam')) { _markStarted(); }
    });
    _obs.observe(tb, { attributes: true, attributeFilter: ['class'] });
  }
  function _checkAlreadyStarted() {
    var state = window.WS && window.WS.state;
    if (!state) { return; }
    var p1score = +(state['ScoreBoard.CurrentGame.Team(1).Score'] || 0);
    var p2score = +(state['ScoreBoard.CurrentGame.Team(2).Score'] || 0);
    var jam     = +(state['ScoreBoard.CurrentGame.Jam']           || 0);
    var period  = +(state['ScoreBoard.CurrentGame.Period']        || 0);
    var inJam   = !!state['ScoreBoard.CurrentGame.InJam'];
    // Use jam >= 2 (not >= 1): CRG sends Jam=1 as the upcoming jam number
    // before the first jam starts, so >= 1 would fire prematurely.
    // The MutationObserver on InJam handles the jam-1-just-started case.
    // inJam covers reconnecting while jam 1 is actively running.
    if (p1score > 0 || p2score > 0 || inJam || jam >= 2 || period >= 2) { _markStarted(); }
  }
  // Jam threshold is 2 for the same reason as above.
  WS.Register('ScoreBoard.CurrentGame.Jam',    function (k, v) { if (!_started && +v >= 2) { _markStarted(); } });
  WS.Register('ScoreBoard.CurrentGame.Period', function (k, v) { if (!_started && +v >= 2) { _markStarted(); } });
  WS.AfterLoad(function () { _checkAlreadyStarted(); if (!_started) { _watchForFirstJam(); } });
})();

/* ============================================================
   TMSB helper: choose team-name hard shadow from TEXT color.
   This runs after CRG/admin color updates and watches for changes.
   ============================================================ */
(function tmsbAdaptiveTeamNameShadowByTextColor() {
  function parseRgb(value) {
    if (!value) return null;
    var m = String(value).match(/rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (!m) return null;
    return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
  }

  function luminance(c) {
    function channel(v) {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  }

  function apply() {
    document.querySelectorAll('.TeamBox .Team').forEach(function(row) {
      var name = row.querySelector('.Name');
      if (!name) return;

      var rgb = parseRgb(window.getComputedStyle(name).color);
      if (!rgb) return;

      var isDarkText = luminance(rgb) < 0.45;
      row.classList.toggle('tmsb-name-is-dark', isDarkText);
      row.classList.toggle('tmsb-name-is-light', !isDarkText);

      row.style.setProperty(
        '--tmsb-team-name-shadow',
        isDarkText
          ? '2px 2px 0 rgba(255,255,255,0.72), 1px 1px 0 rgba(255,255,255,0.88)'
          : '2px 2px 0 rgba(0,0,0,0.84), 1px 1px 0 rgba(0,0,0,0.96)'
      );
      row.style.setProperty(
        '--tmsb-team-name-stroke',
        isDarkText
          ? 'rgba(255,255,255,0.72)'
          : 'rgba(0,0,0,0.88)'
      );
    });
  }

  var raf = null;
  function requestApply() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function() {
      raf = null;
      apply();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', requestApply);
  } else {
    requestApply();
  }

  window.addEventListener('load', requestApply);
  setInterval(requestApply, 1500);

  try {
    new MutationObserver(requestApply).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'sbdisplay']
    });
  } catch (e) {
    // Older embedded browsers can ignore this; interval fallback still handles updates.
  }
})();

/* ============================================================
   TMSB v15 helper: staged shell-follow animation for jammer + lineup
   Added 2026-04-24
   - Keeps the outer TeamBox shell synchronized with the visible panels.
   - In: shell expands with jammer, pauses briefly, then expands with lineup.
   - Out: shell squeezes with lineup first, then immediately with jammer.
   ============================================================ */
(function tmsbStagePanelShellFollow() {
  var TEAM_W = 'var(--tmsb-team-panel-w, 11em)';
  var JAMMER_W = 'var(--tmsb-jammer-panel-w, 12.4em)';
  var LINEUP_W = 'var(--tmsb-lineup-panel-w, 12.4em)';
  var TEAM_PLUS_JAMMER = 'calc(' + TEAM_W + ' + ' + JAMMER_W + ')';
  var FULL_W = 'calc(' + TEAM_W + ' + ' + JAMMER_W + ' + ' + LINEUP_W + ')';

  var JAMMER_MS = 500;
  var LINEUP_MS = 560;
  var BEAT_MS = 90;
  var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
  var timers = new WeakMap();
  var states = new WeakMap();

  function important(el, prop, value) {
    if (!el) return;
    el.style.setProperty(prop, value, 'important');
  }

  function setDim(el, value) {
    important(el, 'width', value);
    important(el, 'max-width', value);
    important(el, 'min-width', value);
  }

  function setTransition(el, ms) {
    important(el, 'transition-property', 'width, max-width, min-width, opacity, transform');
    important(el, 'transition-duration', ms + 'ms');
    important(el, 'transition-timing-function', EASE);
    important(el, 'transition-delay', '0ms');
  }

  function wrappers(tb) { return Array.prototype.slice.call(tb.querySelectorAll('.JammerWrapper')); }
  function tracks(tb) { return Array.prototype.slice.call(tb.querySelectorAll('.TrackBox')); }

  function clearInline(tb) {
    [tb].concat(wrappers(tb), tracks(tb)).forEach(function(el) {
      if (!el) return;
      ['width','max-width','min-width','transition-property','transition-duration','transition-timing-function','transition-delay'].forEach(function(p) {
        el.style.removeProperty(p);
      });
    });
  }

  function clearTimer(tb) {
    var old = timers.get(tb);
    if (old) old.forEach(clearTimeout);
    timers.delete(tb);
  }

  function force(el) { return el && el.offsetWidth; }

  function animateInBoth(tb) {
    clearTimer(tb);
    clearInline(tb);

    var ws = wrappers(tb);
    var ts = tracks(tb);

    setDim(tb, TEAM_W);
    ws.forEach(function(w) { setDim(w, '0'); important(w, 'overflow', 'hidden'); });
    ts.forEach(function(t) { setDim(t, '0'); important(t, 'opacity', '0'); important(t, 'overflow', 'hidden'); });
    force(tb);

    setTransition(tb, JAMMER_MS);
    ws.forEach(function(w) { setTransition(w, JAMMER_MS); });
    ts.forEach(function(t) { setTransition(t, LINEUP_MS); });

    setDim(tb, TEAM_PLUS_JAMMER);
    ws.forEach(function(w) { setDim(w, JAMMER_W); });

    var t1 = setTimeout(function() {
      setTransition(tb, LINEUP_MS);
      ws.forEach(function(w) { setTransition(w, LINEUP_MS); });
      ts.forEach(function(t) { setTransition(t, LINEUP_MS); });
      setDim(tb, FULL_W);
      ws.forEach(function(w) { setDim(w, 'calc(' + JAMMER_W + ' + ' + LINEUP_W + ')'); });
      ts.forEach(function(t) { setDim(t, LINEUP_W); important(t, 'opacity', '1'); });
    }, JAMMER_MS + BEAT_MS);

    var t2 = setTimeout(function() { clearInline(tb); }, JAMMER_MS + BEAT_MS + LINEUP_MS + 120);
    timers.set(tb, [t1, t2]);
  }

  function animateOutBoth(tb) {
    clearTimer(tb);
    clearInline(tb);

    var ws = wrappers(tb);
    var ts = tracks(tb);

    setDim(tb, FULL_W);
    ws.forEach(function(w) { setDim(w, 'calc(' + JAMMER_W + ' + ' + LINEUP_W + ')'); important(w, 'overflow', 'hidden'); });
    ts.forEach(function(t) { setDim(t, LINEUP_W); important(t, 'opacity', '1'); important(t, 'overflow', 'hidden'); });
    force(tb);

    setTransition(tb, LINEUP_MS);
    ws.forEach(function(w) { setTransition(w, LINEUP_MS); });
    ts.forEach(function(t) { setTransition(t, LINEUP_MS); });

    setDim(tb, TEAM_PLUS_JAMMER);
    ws.forEach(function(w) { setDim(w, JAMMER_W); });
    ts.forEach(function(t) { setDim(t, '0'); important(t, 'opacity', '0'); });

    var t1 = setTimeout(function() {
      setTransition(tb, JAMMER_MS);
      ws.forEach(function(w) { setTransition(w, JAMMER_MS); });
      setDim(tb, TEAM_W);
      ws.forEach(function(w) { setDim(w, '0'); });
    }, LINEUP_MS);

    var t2 = setTimeout(function() { clearInline(tb); }, LINEUP_MS + JAMMER_MS + 120);
    timers.set(tb, [t1, t2]);
  }

  function getState(tb) {
    return {
      inJam: tb.classList.contains('InJam'),
      jammers: tb.classList.contains('ShowJammers'),
      track: tb.classList.contains('ShowTrack')
    };
  }

  function same(a, b) {
    return a && b && a.inJam === b.inJam && a.jammers === b.jammers && a.track === b.track;
  }

  function inspect(tb) {
    var prev = states.get(tb);
    var cur = getState(tb);
    if (same(prev, cur)) return;

    var prevBoth = prev && prev.inJam && prev.jammers && prev.track;
    var curBoth = cur.inJam && cur.jammers && cur.track;
    var prevOff = !prev || (prev.inJam && !prev.jammers && !prev.track);
    var curOff = cur.inJam && !cur.jammers && !cur.track;

    states.set(tb, cur);

    if (prevOff && curBoth) {
      animateInBoth(tb);
    } else if (prevBoth && curOff) {
      animateOutBoth(tb);
    }
  }

  function boot() {
    var boxes = Array.prototype.slice.call(document.querySelectorAll('.TeamBox'));
    boxes.forEach(function(tb) {
      states.set(tb, getState(tb));
      try {
        new MutationObserver(function() { inspect(tb); }).observe(tb, { attributes: true, attributeFilter: ['class'] });
      } catch (e) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

/* ============================================================
   TMSB v18 helper: subtle team-name read plate keyed to TEXT color.
   Keeps both team rows mirrored while avoiding the heavy stroke look.
   ============================================================ */
(function tmsbTeamNameSoftReadPlate() {
  function parseRgb(value) {
    if (!value) return null;
    var m = String(value).match(/rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (!m) return null;
    return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
  }
  function luminance(c) {
    function channel(v) {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  }
  function apply() {
    document.querySelectorAll('.TeamBox .Team').forEach(function(row) {
      var name = row.querySelector('.Name');
      if (!name) return;
      var rgb = parseRgb(window.getComputedStyle(name).color);
      if (!rgb) return;
      var isDarkText = luminance(rgb) < 0.45;

      /* Keep existing classes accurate for CSS fallbacks. */
      row.classList.toggle('tmsb-name-is-dark', isDarkText);
      row.classList.toggle('tmsb-name-is-light', !isDarkText);

      if (isDarkText) {
        /* Dark text, like red/green/black, needs a subtle darker read lane on light rows
           plus a small light lift. This avoids the chunky white stroke look. */
        row.style.setProperty('--tmsb-team-name-soft-shadow', '1px 1px 0 rgba(255,255,255,0.55), 0 0 2px rgba(255,255,255,0.24)');
        row.style.setProperty('--tmsb-team-name-plate', 'linear-gradient(90deg, rgba(0,0,0,0.135), rgba(0,0,0,0.045) 70%, rgba(0,0,0,0))');
        row.style.setProperty('--tmsb-team-name-plate-edge', 'inset 0 1px 0 rgba(255,255,255,0.055)');
      } else {
        /* Light text gets a classic low, crisp dark broadcast shadow and a faint dark lane. */
        row.style.setProperty('--tmsb-team-name-soft-shadow', '1px 1px 0 rgba(0,0,0,0.64), 0 0 2px rgba(0,0,0,0.28)');
        row.style.setProperty('--tmsb-team-name-plate', 'linear-gradient(90deg, rgba(0,0,0,0.155), rgba(0,0,0,0.055) 70%, rgba(0,0,0,0))');
        row.style.setProperty('--tmsb-team-name-plate-edge', 'inset 0 1px 0 rgba(255,255,255,0.045)');
      }
    });
  }
  var raf = null;
  function requestApply() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function() { raf = null; apply(); });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', requestApply);
  } else {
    requestApply();
  }
  window.addEventListener('load', requestApply);
  setInterval(requestApply, 1200);
  try {
    new MutationObserver(requestApply).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'sbdisplay']
    });
  } catch (e) {}
})();

/* ============================================================
   TMSB v40 helper: shared clock-synced blink phase.
   Uses wall-clock half-second boundaries so any newly triggered blink
   joins the existing rhythm instead of starting a separate animation.
   ============================================================ */
(function tmsbClockSyncedBlinkPhase() {
  var timer = null;

  function applyPhase() {
    var now = Date.now();
    var ms = now % 1000;
    var isOn = ms < 500;

    if (document.body) {
      document.body.classList.toggle('tmsb-sync-blink-on', isOn);
      document.body.classList.toggle('tmsb-sync-blink-off', !isOn);
    }

    var nextBoundary = isOn ? (500 - ms) : (1000 - ms);
    timer = setTimeout(applyPhase, Math.max(20, nextBoundary + 1));
  }

  function boot() {
    if (timer) clearTimeout(timer);
    applyPhase();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

/* ============================================================
   TMSB helper: between-jams clock visibility gate.
   CRG's ShowIn* mechanism adds the .Show class to clock elements
   by matching their ShowInX class names against the emitted game
   state. During Post Timeout, CRG may emit InPostTimeoutLineup
   rather than InBetweenJams, leaving ClockBarBottom (which only
   carries ShowInBetweenJams) hidden at max-height:0, and the
   lineup clock pushed off-screen at margin-left:-9999em.
   This function owns the Show class on ClockBarBottom and on
   the lineup/timeout clock elements directly, keyed off the
   running-state WS paths so it works regardless of what state
   name CRG emits.
   ============================================================ */
(function tmsbBetweenJamsClock() {
  var _paths = [
    'ScoreBoard.CurrentGame.InJam',
    'ScoreBoard.CurrentGame.Clock(Lineup).Running',
    'ScoreBoard.CurrentGame.Clock(Timeout).Running',
    'ScoreBoard.CurrentGame.Clock(Intermission).Running'
  ];

  function apply() {
    var st         = (window.WS && window.WS.state) ? window.WS.state : {};
    var inJam      = !!st['ScoreBoard.CurrentGame.InJam'];
    var lineupRun  = !!st['ScoreBoard.CurrentGame.Clock(Lineup).Running'];
    var timeoutRun = !!st['ScoreBoard.CurrentGame.Clock(Timeout).Running'];
    var intermRun  = !!st['ScoreBoard.CurrentGame.Clock(Intermission).Running'];
    var betweenJams = !inJam && (lineupRun || timeoutRun);

    var bar = document.querySelector('.ClockBarBottom');
    if (!bar) { return; }

    // ClockBarBottom: show during jam, any between-jams clock, or intermission.
    bar.classList.toggle('Show', inJam || betweenJams || intermRun);

    // Lineup clock elements: show when lineup clock is running (not in jam).
    // Covers both regular lineup and post-timeout lineup with one condition.
    var lc = bar.querySelectorAll('.ShowInLineup, .ShowInPostTimeoutLineup');
    for (var i = 0; i < lc.length; i++) {
      lc[i].classList.toggle('Show', lineupRun && !inJam);
    }

    // Timeout clock elements: show when timeout clock is running (not in jam).
    var tc = bar.querySelectorAll('.ShowInTimeout, .ShowInPostTimeoutTimeout');
    for (var j = 0; j < tc.length; j++) {
      tc[j].classList.toggle('Show', timeoutRun && !inJam);
    }
  }

  WS.Register(_paths, apply);
  document.addEventListener('tmsb:wsconnected', apply);
})();

/* ============================================================
   TMSB v43 helper: final-score clock hide.
   When OfficialScore is true and ClockDuringFinalScore is off,
   stamps tmsb-final-no-clock on <body> so the CSS can collapse
   the ClockBarTop and ClockBarBottom rows, leaving only the
   ClockBarMiddle status strip — matching the pre-game "Coming Up"
   appearance.
   Also fires during Unofficial Score (end of last period,
   intermission running, score not yet declared official) so the
   clock disappears immediately after the final jam, not only after
   the head NSO clicks "Official Score".
   ============================================================ */
(function tmsbFinalNoClockGate() {
  function apply() {
    if (!document.body) { return; }
    var st         = (window.WS && window.WS.state) ? window.WS.state : {};
    var isOfficial = !!st['ScoreBoard.CurrentGame.OfficialScore'];
    var showDuring = !!st['ScoreBoard.CurrentGame.ClockDuringFinalScore'];
    var ic         = !!st['ScoreBoard.CurrentGame.Clock(Intermission).Running'];
    var num        = st['ScoreBoard.CurrentGame.Clock(Intermission).Number'];
    var max        = st['ScoreBoard.CurrentGame.Rule(Period.Number)'];
    // Unofficial Score: intermission running after the last period
    // but before the head NSO has clicked "Official Score".
    var isUnofficial = ic && !isOfficial && (num != null) && (num == max);
    document.body.classList.toggle('tmsb-final-no-clock',
      !showDuring && (isOfficial || isUnofficial));
  }

  WS.Register([
    'ScoreBoard.CurrentGame.OfficialScore',
    'ScoreBoard.CurrentGame.ClockDuringFinalScore',
    'ScoreBoard.CurrentGame.Clock(Intermission).Running',
    'ScoreBoard.CurrentGame.Clock(Intermission).Number',
    'ScoreBoard.CurrentGame.Rule(Period.Number)'
  ], apply);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();

/* ============================================================
   TMSB v42 helper: official review active-state gate.
   CRG can leave the review pip in Current/Retained states after the
   review window ends, so the yellow pulse is gated by the actual
   active review/timeout clock state instead of the pip class alone.
   ============================================================ */
(function tmsbOfficialReviewActiveGate() {
  var timer = null;

  function truthyReviewValue(value) {
    if (value === true) return true;
    if (value === false || value == null) return false;
    var text = String(value).trim().toLowerCase();
    return !!text && text !== 'false' && text !== '0' && text !== 'none' && text !== 'no';
  }

  function isReviewActive() {
    var wsState = (window.WS && window.WS.state) ? window.WS.state : {};
    var reviewState = wsState['ScoreBoard.CurrentGame.OfficialReview'];
    var timeoutRunning = wsState['ScoreBoard.CurrentGame.Clock(Timeout).Running'];
    var timeoutName = String(wsState['ScoreBoard.CurrentGame.Clock(Timeout).Name'] || '').toLowerCase();
    var topClockReview = !!document.querySelector('.AnimatedPanel.TopClock.TimeoutReview');

    return topClockReview ||
      (truthyReviewValue(reviewState) && (truthyReviewValue(timeoutRunning) || timeoutName.indexOf('review') !== -1));
  }

  function apply() {
    if (!document.body) return;
    document.body.classList.toggle('tmsb-official-review-active', isReviewActive());
  }

  function boot() {
    apply();
    if (timer) clearInterval(timer);
    timer = setInterval(apply, 180);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  try {
    new MutationObserver(apply).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  } catch (e) {}
})();

/* ============================================================
   TMSB v44 — EVENT FLASH SYSTEM
   Watches for Lead and Penalized class transitions on the
   TeamBox subtree and fires a short keyframe flash on the
   relevant JammerBox. attributeOldValue lets us distinguish
   a class being newly added from one that was already present.
   Started inside WS.AfterLoad + a one-frame delay so initial
   CRG state hydration doesn't trigger false flashes on load.
   ============================================================ */
(function tmsbEventFlashes() {
  function flash(el, cls) {
    if (!el) { return; }
    el.classList.remove(cls);
    void el.offsetWidth; // reflow restarts the animation
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, 800);
  }

  function hadClass(oldValue, cls) {
    if (!oldValue) { return false; }
    return (' ' + oldValue + ' ').indexOf(' ' + cls + ' ') !== -1;
  }

  function setup() {
    var tb = document.querySelector('.TeamBox');
    if (!tb) { return; }

    var obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        var el = m.target;

        // Lead jammer called — el is the team-level sbForeach div.
        // Flash only the active jamming skater row for that team, not the full panel.
        if ((el.classList.contains('Lead') && !hadClass(m.oldValue, 'Lead')) ||
            (el.classList.contains('DisplayLead') && !hadClass(m.oldValue, 'DisplayLead'))) {
          flash(el.querySelector('.JammerBox > div.Jamming'), 'tmsb-flash-lead-row');
        }

        // Star pass called — el is the position-level sbForeach div that becomes
        // the active jamming skater row after CRG marks StarPass.
        if (el.classList.contains('StarPass') && !hadClass(m.oldValue, 'StarPass')) {
          flash(el, 'tmsb-flash-starpass-row');
        }

        // Jammer penalty called — el is the position-level sbForeach div
        // Only flash when Penalized newly appears (not already penalized)
        if (el.classList.contains('Penalized') && !hadClass(m.oldValue, 'Penalized')) {
          var jb = el.closest ? el.closest('.JammerBox') : null;
          if (!jb) {
            // Fallback for browsers without closest()
            var p = el.parentNode;
            while (p && !p.classList.contains('JammerBox')) { p = p.parentNode; }
            jb = p;
          }
          flash(jb, 'tmsb-flash-penalty');
        }
      });
    });

    obs.observe(tb, {
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true,
      subtree: true
    });
  }

  // Defer until after WS.AfterLoad so initial CRG state hydration
  // doesn't produce false flashes for already-penalized skaters.
  WS.AfterLoad(function () {
    requestAnimationFrame(function () { requestAnimationFrame(setup); });
  });
})();

/* ============================================================
   Jammer-row event flash watcher
   CRG's Lead and StarPass classes are persistent state, not one-shot
   events. This watcher compares previous/current DOM state so flashes
   fire only on the transition to Lead or StarPass, and only on the
   affected jammer row. It also initializes current state silently so
   opening/refreshing the overlay does not flash existing state.
   ============================================================ */
(function tmsbRobustJammerEventFlashes() {
  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function activeJammerRow(teamEl) {
    if (!teamEl) { return null; }
    return teamEl.querySelector('.JammerBox > div.Jamming:not(.Penalized)') ||
           teamEl.querySelector('.JammerBox > div.Jamming') ||
           teamEl.querySelector('.JammerBox > div.StarPass');
  }

  function flash(el, cls) {
    if (!el) { return; }
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, 900);
  }

  function teamNodes() {
    return qsa('.TeamBox > div').filter(function (el) {
      return el.querySelector && el.querySelector('.JammerBox');
    });
  }

  var leadState = new WeakMap();
  var starPassState = new WeakMap();
  var initialized = false;

  function scan(allowFlash) {
    teamNodes().forEach(function (teamEl) {
      var isLead = teamEl.classList.contains('Lead') || teamEl.classList.contains('DisplayLead');
      var wasLead = !!leadState.get(teamEl);
      if (allowFlash && isLead && !wasLead) {
        flash(activeJammerRow(teamEl), 'tmsb-flash-lead-row');
      }
      leadState.set(teamEl, isLead);

      qsa('.JammerBox > div', teamEl).forEach(function (row) {
        var isStarPass = row.classList.contains('StarPass');
        var wasStarPass = !!starPassState.get(row);
        if (allowFlash && isStarPass && !wasStarPass) {
          flash(row.classList.contains('Jamming') ? row : activeJammerRow(teamEl), 'tmsb-flash-starpass-row');
        }
        starPassState.set(row, isStarPass);
      });
    });
  }

  function boot() {
    // Silent baseline after CRG has hydrated classes.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        scan(false);
        initialized = true;
        setInterval(function () { scan(initialized); }, 120);
        try {
          new MutationObserver(function () { scan(initialized); }).observe(document.documentElement, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['class']
          });
        } catch (e) {}
      });
    });
  }

  if (window.WS && WS.AfterLoad) {
    WS.AfterLoad(boot);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

/* ============================================================
   TMSB — READY GATE
   Keeps the entire overlay invisible until:
     1. The DOM is fully parsed (DOMContentLoaded)
     2. CRG's initial state hydration is complete (WS.AfterLoad)
     3. One browser paint has committed the initial CSS positions
   This prevents two artefacts on source-activation:
     a) Raw unstyled HTML text flashing before fonts/CSS load
     b) AnimatedPanel elements "flying off screen" because the
        browser fires their hide-transition before it has painted
        the initial off-screen transform
   Once tmsb-ready lands on <body>, all transitions become live
   and subsequent operator show/hide toggles animate correctly.
   ============================================================ */
(function tmsbReadyGate() {
  function activate() {
    // Two rAFs: first schedules after layout, second after paint.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.body.classList.add('tmsb-ready');
      });
    });
  }

  if (window.WS && WS.AfterLoad) {
    WS.AfterLoad(activate);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', activate);
  } else {
    activate();
  }
})();

/* ============================================================
   TMSB — TEAMBOX SHOW/HIDE ANIMATION
   Drives the score panel slide via the Web Animations API so it
   is completely immune to CSS cascade conflicts. WS.Register fires
   the moment CRG changes the Score setting, before core.js even
   updates the sbClass — giving us clean control over timing.
   A _ready flag gates animation until after the first WS state
   delivery so the initial paint is always silent.
   ============================================================ */
(function tmsbScorePanelAnimation() {
  var EASING   = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
  var DURATION = 450; // ms
  var _ready   = false;
  var _current = null; // null = unknown, true = visible, false = hidden

  function hiddenTransform() {
    return document.body.classList.contains('BottomPlacement')
      ? 'translateY(130%)' : 'translateY(-130%)';
  }

  function getTeamBox() {
    return document.querySelector('.TeamBox');
  }

  function _snap(tb, show) {
    // Cancel WAAPI animations so inline styles take effect immediately.
    tb.getAnimations().forEach(function (a) { a.cancel(); });
    tb.style.transform = show ? 'translateY(0)' : hiddenTransform();
    tb.style.opacity   = show ? '1' : '0';
    _current = show;
  }

  function _animate(show) {
    var tb = getTeamBox();
    if (!tb) { return; }

    if (!_ready) {
      _snap(tb, show);
      return;
    }

    if (_current === show) { return; }

    var fromTransform = show ? hiddenTransform() : 'translateY(0)';
    var toTransform   = show ? 'translateY(0)'   : hiddenTransform();
    var fromOpacity   = show ? 0 : 1;
    var toOpacity     = show ? 1 : 0;

    // Cancel any in-progress animation and read its current visual position
    // so we can start the new animation from where the element actually is.
    var liveTransform = fromTransform;
    var liveOpacity   = fromOpacity;
    var running = tb.getAnimations();
    if (running.length) {
      var cs = window.getComputedStyle(tb);
      liveTransform = cs.transform || fromTransform;
      liveOpacity   = parseFloat(cs.opacity);
      if (isNaN(liveOpacity)) { liveOpacity = fromOpacity; }
      running.forEach(function (a) { a.cancel(); });
    }

    _current = show;

    tb.animate([
      { transform: liveTransform, opacity: liveOpacity   },
      { transform: toTransform,   opacity: toOpacity     }
    ], {
      duration:  DURATION,
      easing:    EASING,
      fill:      'forwards'
    });
  }

  // Direct WS.Register — fires the instant CRG changes the Score setting,
  // reliably regardless of sbClass/MutationObserver timing.
  WS.Register('ScoreBoard.Settings.Setting(Overlay.TMSB.Score)', function (k, v) {
    var show = !!v && v !== 'false' && v !== '0' && v !== 'no';
    _animate(show);
  });

  // On first WS load: snap to current state silently, then enable animation.
  WS.AfterLoad(function () {
    var tb = getTeamBox();
    if (!tb) { return; }
    var raw  = WS.state['ScoreBoard.Settings.Setting(Overlay.TMSB.Score)'];
    var show = !!raw && raw !== 'false' && raw !== '0' && raw !== 'no';
    _snap(tb, show);

    // Two rAFs: layout then paint — same timing as tmsbReadyGate.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        _ready = true;
      });
    });
  });

  // Update hidden-direction silently when BottomPlacement is toggled
  // while the panel is off-screen.
  new MutationObserver(function () {
    if (_current === false) {
      var tb = getTeamBox();
      if (tb) {
        tb.getAnimations().forEach(function (a) { a.cancel(); });
        tb.style.transform = hiddenTransform();
      }
    }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();
