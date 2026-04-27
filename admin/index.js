/*
 * Thin Mint Scoreboard Overlay
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
var nextPanel = '';
var currentPanel = '';

function getPreviewIframe() {
  return $('#PreviewFrame iframe');
}

(function () {
  $('#PanelSelect').val('');
})();

function ovaKeyHandler(k, v, elem, e) {
  var tag = e.target.tagName.toLowerCase();
  var c = String.fromCharCode(e.keyCode || e.charCode).toUpperCase();
  if (e.keyCode === 27) {
    $('body').focus();
    e.preventDefault();
    return false;
  }
  if (tag !== 'input' && tag !== 'textarea') {
    $('[data-key="' + c + '"]').each(function () {
      var $t = $(this);
      if ($t.prop('tagName') === 'OPTION') {
        $t.attr('selected', 'selected').parent().trigger('change');
      }
      if ($t.prop('tagName') === 'BUTTON') {
        $t.trigger('click');
      }
    });
    e.preventDefault();
  }
}

function ovaUpdatePanel(k, v, elem) {
  currentPanel = v;
  elem.toggleClass('changed', currentPanel !== nextPanel);
  return currentPanel !== '';
}

function ovaSelectPanel(k, v) {
  if (v !== nextPanel) {
    nextPanel = v;
    $('#PanelSet').toggleClass('changed', nextPanel !== currentPanel);
    $('#LowerThirdControls').toggleClass('sbHide', nextPanel !== 'LowerThird');
  }
}

function ovaSelectLowerThird(k, v, elem) {
  const option = elem.children('option[value="' + v + '"]');
  WS.Set('ScoreBoard.Settings.Setting(Overlay.TMSB.LowerThird.Line1)', option.attr('data-line1'));
  WS.Set('ScoreBoard.Settings.Setting(Overlay.TMSB.LowerThird.Line2)', option.attr('data-line2'));
  WS.Set('ScoreBoard.Settings.Setting(Overlay.TMSB.LowerThird.Style)', option.attr('data-style'));
}

function ovaAddKeeper() {
  const line1 = WS.state['ScoreBoard.Settings.Setting(Overlay.TMSB.LowerThird.Line1)'];
  const line2 = WS.state['ScoreBoard.Settings.Setting(Overlay.TMSB.LowerThird.Line2)'];
  const style = WS.state['ScoreBoard.Settings.Setting(Overlay.TMSB.LowerThird.Style)'];

  $('<option>')
    .attr('data-line1', line1)
    .attr('data-line2', line2)
    .attr('data-style', style)
    .attr('value', '_' + Math.random().toString(36).substring(2, 11))
    .text(line1 + '/' + line2 + ' (' + style + ')')
    .appendTo('#Keepers');
}

function ovaGetNextPanel() {
  return nextPanel === currentPanel ? '' : nextPanel;
}

function ovaDefaultFgIfNull(k, v) {
  return v || '#FFFFFF';
}

function ovaDefaultBgIfNull(k, v) {
  return v || '#333333';
}

function ovaSetPreview(k, v, elem) {
  getPreviewIframe().css(elem.attr('dim'), v);
}

function ovaGameTabBgDefault(k, v) {
  return v || '#f5c518';
}

function ovaGameTabFgDefault(k, v) {
  return v || '#111111';
}
