#!/usr/bin/env python3
"""
Regenerate design/screens/index.html from design/screens/gallery.json.

This is the ONLY thing that should ever write index.html. Agents generating or
revising wireframe variants must edit gallery.json (add/update an entry) and then
run this script — never hand-author or hand-edit the gallery HTML/CSS directly.
That is what keeps the gallery's layout identical across every skill run, no
matter which subagent or session touched it last.

The generated gallery has three fixed parts:
  1. A top tab bar — one tab per screen explored.
  2. A variant-chip bar — one chip per design variant of the selected screen.
  3. A collapsible right-side CUSTOMIZATION PANEL that introspects whichever
     variant is currently loaded in the iframe (same-origin, so its DOM is
     readable) and auto-builds detailed controls for it:
       - per-heading-level typography (h1/h2/h3/...) plus body text;
       - COMPONENT sections: the panel detects repeating visual structures
         (2+ sibling-ish elements sharing a class — cards, list items, chat
         bubbles, suggestion boxes...) and generates a section per component
         with style presets (Flat / Outlined / Elevated / Rounded) and
         property controls (background, border, radius, padding, shadow).
       - every CSS custom property the variant defines on :root (colors get
         a color picker, sizes get a slider).
     Hovering ANY control highlights the elements it affects in the iframe —
     typography controls their tag, component controls their class, CSS-var
     controls every rule that consumes the variable.
     Variants need NO special wiring to be customizable — the panel adapts to
     whatever layout the page has. Generators should use consistent class names
     on repeated elements so detection groups them cleanly. Changes are applied
     by injecting a style override into the iframe and are throwaway (reload =
     reset); when the user wants a change made permanent, that's a Phase 3
     refinement of the variant file.

Usage:
    python3 build_gallery.py <path-to-screens-dir>

Expects <screens-dir>/gallery.json shaped like:

{
  "title": "Enterprise App Kit — Wireframe Gallery",
  "screens": [
    {
      "name": "Story Workspace",
      "variants": [
        {"file": "storyworkspace-1-editorial.html", "label": "1 · Editorial Broadsheet",
         "note": "Light, serif, traditional newsroom tone", "final": false}
      ]
    }
  ]
}

Re-run after every add/edit/promote so index.html always reflects gallery.json.
"""
import json
import sys
from pathlib import Path

PAGE_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>__TITLE__</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    background: #eef2f7;
    color: #17202a;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  header.gallery-header {
    flex: 0 0 auto;
    background: #fbfcfe;
    color: #17202a;
    border-bottom: 1px solid #d8dee8;
    box-shadow: 0 8px 24px rgba(26, 39, 56, .08);
    padding: 0;
    display: grid;
  }
  .gallery-title-row {
    min-height: 48px;
    padding: 10px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid #e5eaf1;
  }
  header.gallery-header h1 {
    font-size: 14px;
    letter-spacing: 0;
    text-transform: none;
    color: #17202a;
    margin: 0;
    white-space: nowrap;
    font-weight: 750;
  }
  .gallery-subtitle {
    margin-top: 2px;
    color: #667085;
    font-size: 12px;
    line-height: 1.3;
  }
  .screen-row, .variant-bar {
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr);
    align-items: center;
    gap: 12px;
  }
  .screen-row {
    padding: 10px 18px;
    background: #f6f8fb;
    border-bottom: 1px solid #e5eaf1;
  }
  .nav-label {
    color: #667085;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .06em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .screen-tabs { display: flex; gap: 10px; overflow-x: auto; align-items: stretch; padding-bottom: 1px; }
  .screen-tab {
    background: #fff; border: 1px solid #d8dee8; color: #344054;
    font-size: 13px; font-weight: 700; padding: 9px 12px 9px 10px; cursor: pointer;
    border-radius: 9px; white-space: nowrap; min-width: 210px; text-align: left;
    display: grid; grid-template-columns: 28px 1fr; gap: 8px; align-items: center;
    box-shadow: 0 1px 2px rgba(16, 24, 40, .04);
  }
  .screen-tab .screen-number {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: inline-grid;
    place-items: center;
    background: #eef2f7;
    color: #667085;
    font-size: 12px;
    font-weight: 850;
  }
  .screen-tab .screen-name {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .screen-tab .screen-meta {
    display: block;
    margin-top: 2px;
    color: #667085;
    font-size: 10.5px;
    font-weight: 800;
    letter-spacing: .06em;
    text-transform: uppercase;
  }
  .screen-tab.active {
    color: #0f2f6e;
    border-color: #84adff;
    background: #edf4ff;
    box-shadow: 0 0 0 3px rgba(47, 111, 237, .12);
  }
  .screen-tab.active .screen-number {
    background: #2f6fed;
    color: #fff;
  }
  .screen-tab.active .screen-meta { color: #2f6fed; }
  header.gallery-header .active-label {
    font-size: 12px; color: #475467; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
    max-width: 50vw;
    text-align: right;
  }
  .variant-bar {
    flex: 0 0 auto; background: #fff; border-bottom: 1px solid #d8dee8;
    padding: 10px 18px; overflow-x: auto;
  }
  .variant-chips { display: flex; gap: 8px; overflow-x: auto; min-width: 0; }
  .variant-bar .nav-label { color: #667085; }
  .variant-chip {
    background: #f8fafc; border: 1px solid #d8dee8; color: #344054;
    border-radius: 999px; padding: 7px 12px; cursor: pointer;
    font-size: 12.5px; line-height: 1.4; flex: 0 0 auto; white-space: nowrap;
    box-shadow: none;
  }
  .variant-chip strong { font-size: 12.5px; font-weight: 750; }
  .variant-chip.active { background: #2f6fed; border-color: #2f6fed; color: #fff; }
  .variant-chip.final { border-color: #2f8f5b; background: #eefbf4; color: #14532d; }
  .variant-chip.active.final {
    background: #dcfce7;
    border-color: #22c55e;
    color: #14532d;
    box-shadow: 0 0 0 3px rgba(34, 197, 94, .16);
  }
  .variant-chip.final strong::after { content: " \2713"; color: #15803d; font-weight: 800; }
  .variant-chip:hover:not(.active) { border-color: #98a2b3; background: #fff; }
  @media (max-width: 860px) {
    .gallery-title-row { align-items: flex-start; flex-direction: column; }
    header.gallery-header .active-label { max-width: none; text-align: left; }
    .screen-row, .variant-bar { grid-template-columns: 1fr; gap: 8px; }
    .screen-tab { min-width: 230px; }
  }

  /* Fixed handle on the right screen edge — always visible, opens the tweak panel. */
  #tweak-handle {
    position: fixed; right: 0; top: 50%; transform: translateY(-50%);
    z-index: 10000;
    background: #2b6cf6; color: #fff; border: none; cursor: pointer;
    writing-mode: vertical-rl; text-orientation: mixed;
    font-size: 12px; font-weight: 700; letter-spacing: .08em;
    padding: 14px 6px; border-radius: 8px 0 0 8px;
    box-shadow: -2px 0 8px rgba(0,0,0,.25);
  }
  #tweak-handle:hover { background: #1f5be0; }
  #tweak-handle.open {
    right: 300px;
    background: #16181d; color: #9298a3;
    border: 1px solid #2a2d33; border-right: none;
  }
  #tweak-handle.open:hover { color: #e8e9eb; }

  .stage { flex: 1; min-height: 0; display: flex; }
  .stage main { flex: 1; min-width: 0; }
  iframe { border: 0; width: 100%; height: 100%; display: block; }

  /* ---- Tweak panel ---- */
  #tweak-panel {
    flex: 0 0 300px; width: 300px; background: #16181d; color: #e8e9eb;
    border-left: 1px solid #2a2d33; display: none; flex-direction: column;
    font-size: 12.5px;
  }
  #tweak-panel.open { display: flex; }
  #tweak-panel .tp-header {
    padding: 12px 16px; border-bottom: 1px solid #2a2d33;
    display: flex; align-items: center; justify-content: space-between; flex: 0 0 auto;
  }
  #tweak-panel .tp-header h2 {
    font-size: 11px; text-transform: uppercase; letter-spacing: .06em;
    color: #8b8f98; margin: 0; font-weight: 700;
  }
  #tweak-panel .tp-reset {
    background: transparent; border: 1px solid #2a2d33; color: #9298a3;
    border-radius: 5px; padding: 4px 10px; cursor: pointer; font-size: 11px;
  }
  #tweak-panel .tp-reset:hover { border-color: #565a63; color: #e8e9eb; }
  #tweak-panel .tp-body { flex: 1; overflow-y: auto; padding: 12px 16px; }
  #tweak-panel .tp-hint { color: #565a63; font-size: 11px; line-height: 1.5; margin-bottom: 14px; }
  .tp-group { margin-bottom: 18px; }
  .tp-group-label {
    font-size: 10px; text-transform: uppercase; letter-spacing: .06em;
    color: #565a63; margin-bottom: 8px; font-weight: 700;
    padding-bottom: 5px; border-bottom: 1px solid #23262c;
  }
  .tp-control { margin-bottom: 11px; }
  .tp-control label { display: block; font-size: 11.5px; color: #c3c6cc; margin-bottom: 4px; }
  .tp-control label .tp-val { color: #6b6f78; float: right; font-size: 10.5px; }
  .tp-ctl-reset {
    background: none; border: none; color: #565a63; cursor: pointer;
    font-size: 12px; padding: 0 4px; margin-left: 4px; vertical-align: middle;
  }
  .tp-ctl-reset:hover { color: #e8e9eb; }
  .tp-group-reset {
    background: none; border: none; color: #565a63; cursor: pointer;
    font-size: 12px; padding: 0 4px; float: right;
  }
  .tp-group-reset:hover { color: #e8e9eb; }
  .tp-control select, .tp-control input[type="text"] {
    width: 100%; background: #1e2027; border: 1px solid #2a2d33; color: #e8e9eb;
    border-radius: 5px; padding: 5px 7px; font-family: inherit; font-size: 11.5px;
  }
  .tp-control input[type="range"] { width: 100%; }
  .tp-control input[type="color"] {
    width: 100%; height: 26px; border: 1px solid #2a2d33; border-radius: 5px;
    background: #1e2027; padding: 2px; cursor: pointer;
  }
  .tp-presets { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
  .tp-preset {
    background: #1e2027; border: 1px solid #2a2d33; color: #c3c6cc;
    border-radius: 5px; padding: 4px 9px; cursor: pointer; font-size: 11px;
  }
  .tp-preset:hover { border-color: #565a63; }
  .tp-preset.active { background: #2b6cf6; border-color: #2b6cf6; color: #fff; }
  .tp-group-label .tp-count { color: #3d424b; font-weight: 400; text-transform: none; letter-spacing: 0; }
  .empty-state { color: #8b8f98; padding: 40px; font-size: 14px; }
</style>
</head>
<body>
<header class="gallery-header">
  <div class="gallery-title-row">
    <div>
      <h1>__TITLE__</h1>
      <div class="gallery-subtitle">Choose a screen first, then compare the variants for that screen.</div>
    </div>
    <div class="active-label" id="active-label"></div>
  </div>
  <div class="screen-row">
    <span class="nav-label">Screens</span>
    <div class="screen-tabs" id="screen-tabs"></div>
  </div>
</header>
<div class="variant-bar" id="variant-bar"></div>
<button id="tweak-handle" title="Open customization panel">CUSTOMIZE</button>
<div class="stage">
  <main><iframe id="frame" src="about:blank"></iframe></main>
  <aside id="tweak-panel">
    <div class="tp-header">
      <h2>Customization Panel</h2>
      <button class="tp-reset" id="tp-reset">Reset</button>
    </div>
    <div class="tp-body" id="tp-body"></div>
  </aside>
</div>
<script>
  const DATA = __DATA_JSON__;

  const screenTabs = document.getElementById('screen-tabs');
  const variantBar = document.getElementById('variant-bar');
  const frame = document.getElementById('frame');
  const activeLabel = document.getElementById('active-label');
  const tweakPanel = document.getElementById('tweak-panel');
  const tpBody = document.getElementById('tp-body');

  let currentScreenIdx = 0;
  let tweakOpen = false;

  // ---------- navigation ----------

  function renderScreenTabs() {
    screenTabs.innerHTML = '';
    DATA.screens.forEach((screen, i) => {
      const btn = document.createElement('button');
      btn.className = 'screen-tab' + (i === currentScreenIdx ? ' active' : '');
      const count = (screen.variants || []).length;
      btn.innerHTML = '<span class="screen-number">' + (i + 1) + '</span><span><span class="screen-name">'
        + screen.name + '</span><span class="screen-meta">' + count + ' variant'
        + (count === 1 ? '' : 's') + '</span></span>';
      btn.addEventListener('click', () => { currentScreenIdx = i; renderAll(); });
      screenTabs.appendChild(btn);
    });
  }

  function loadVariant(screen, variant) {
    currentFile = variant.file;
    frame.src = variant.file;
    activeLabel.textContent = 'Viewing ' + variant.label + ' in ' + screen.name;
  }

  function renderVariantBar() {
    variantBar.innerHTML = '';
    const screen = DATA.screens[currentScreenIdx];
    if (!screen || !screen.variants || screen.variants.length === 0) {
      frame.srcdoc = '<div class="empty-state">No variants yet for this screen.</div>';
      activeLabel.textContent = '';
      return;
    }
    const activeVariant = screen.variants.find(v => v.final) || screen.variants[0];
    const label = document.createElement('span');
    label.className = 'nav-label';
    label.textContent = 'Variants';
    variantBar.appendChild(label);
    const chips = document.createElement('div');
    chips.className = 'variant-chips';
    variantBar.appendChild(chips);
    screen.variants.forEach(variant => {
      const chip = document.createElement('button');
      chip.className = 'variant-chip'
        + (variant === activeVariant ? ' active' : '')
        + (variant.final ? ' final' : '');
      chip.innerHTML = '<strong>' + variant.label + '</strong>';
      if (variant.note) chip.title = variant.note;
      chip.addEventListener('click', () => {
        loadVariant(screen, variant);
        chips.querySelectorAll('.variant-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
      chips.appendChild(chip);
    });

    loadVariant(screen, activeVariant);
  }

  const tweakHandle = document.getElementById('tweak-handle');
  tweakHandle.addEventListener('click', () => {
    tweakOpen = !tweakOpen;
    tweakPanel.classList.toggle('open', tweakOpen);
    tweakHandle.classList.toggle('open', tweakOpen);
    tweakHandle.textContent = tweakOpen ? 'CLOSE' : 'CUSTOMIZE';
    if (tweakOpen) buildTweakControls();
  });

  function renderAll() { renderScreenTabs(); renderVariantBar(); }

  // ---------- customization panel: introspect the loaded variant ----------
  //
  // The iframe is same-origin (same static server), so its document is fully
  // readable. On each load we scan it and auto-build controls for whatever the
  // page actually contains — no per-variant wiring needed. Changes are written
  // into a single injected <style id="__tweaks__"> using !important overrides,
  // so they always win over the variant's own inline styles.
  //
  // PERSISTENCE: all tweaks live in ALL_TWEAKS keyed by variant file, saved
  // (debounced) to the server via POST /__customizations__ -> customizations.json,
  // with localStorage as fallback. Switching variants/screens and coming back
  // restores your settings. customizations.json is also how Claude sees what
  // you changed: ask it to apply your customizations and it folds the recorded
  // values into the variant's HTML permanently.

  const FONT_STACKS = {
    '(original)': null,
    'Georgia (serif)': 'Georgia, "Times New Roman", serif',
    'Times (serif)': '"Times New Roman", Times, serif',
    'Helvetica (sans)': '"Helvetica Neue", Helvetica, Arial, sans-serif',
    'System (sans)': '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Monospace': '"SF Mono", Consolas, Menlo, monospace',
  };

  // All tweaks, keyed by variant file: { "variant-x.html": { selector: {prop: value}, "__vars__": {...} } }
  let ALL_TWEAKS = {};
  let currentFile = null;
  let saveTimer = null;

  function tweaksFor(file) {
    if (!ALL_TWEAKS[file]) ALL_TWEAKS[file] = {};
    return ALL_TWEAKS[file];
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveTweaks, 500);
  }

  function saveTweaks() {
    // Prune empty entries so customizations.json stays readable.
    for (const [file, t] of Object.entries(ALL_TWEAKS)) {
      for (const [sel, props] of Object.entries(t)) {
        if (Object.keys(props).length === 0) delete t[sel];
      }
      if (Object.keys(t).length === 0) delete ALL_TWEAKS[file];
    }
    const body = JSON.stringify(ALL_TWEAKS);
    try { localStorage.setItem('gallery_customizations', body); } catch (e) {}
    fetch('/__customizations__', { method: 'POST', body }).catch(() => {});
  }

  function loadSavedTweaks() {
    // Server file wins (it's what Claude edits/clears); localStorage is fallback.
    return fetch('customizations.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .catch(() => {
        try { return JSON.parse(localStorage.getItem('gallery_customizations') || '{}'); }
        catch (e) { return {}; }
      })
      .then(data => { ALL_TWEAKS = data || {}; });
  }

  function idoc() {
    try { return frame.contentDocument; } catch (e) { return null; }
  }

  function applyTweaks() {
    const doc = idoc();
    if (!doc || !currentFile) return;
    const tweaks = tweaksFor(currentFile);
    let styleEl = doc.getElementById('__tweaks__');
    if (!styleEl) {
      styleEl = doc.createElement('style');
      styleEl.id = '__tweaks__';
      doc.head.appendChild(styleEl);
    }
    let css = '';
    for (const [selector, props] of Object.entries(tweaks)) {
      if (selector === '__vars__') continue;
      const decls = Object.entries(props)
        .map(([p, v]) => p + ': ' + v + ' !important;').join(' ');
      if (decls) css += selector + ' { ' + decls + ' }\n';
    }
    styleEl.textContent = css;
    const vars = tweaks['__vars__'] || {};
    for (const [name, value] of Object.entries(vars)) {
      doc.documentElement.style.setProperty(name, value);
    }
  }

  function setTweak(selector, prop, value) {
    const tweaks = tweaksFor(currentFile);
    if (!tweaks[selector]) tweaks[selector] = {};
    if (value === null) delete tweaks[selector][prop];
    else tweaks[selector][prop] = value;
    applyTweaks();
    scheduleSave();
  }

  function clearTweaks(selector, props) {
    const tweaks = tweaksFor(currentFile);
    if (!tweaks[selector]) return;
    for (const p of props) delete tweaks[selector][p];
    applyTweaks();
    scheduleSave();
  }

  function setVarTweak(name, value) {
    const tweaks = tweaksFor(currentFile);
    if (!tweaks['__vars__']) tweaks['__vars__'] = {};
    if (value === null) {
      delete tweaks['__vars__'][name];
      const doc = idoc();
      if (doc) doc.documentElement.style.removeProperty(name);
    } else {
      tweaks['__vars__'][name] = value;
    }
    applyTweaks();
    scheduleSave();
  }

  function makeControl(labelText, inputEl, valueLabel, resetFn, hlSelector) {
    const wrap = document.createElement('div');
    wrap.className = 'tp-control';
    const label = document.createElement('label');
    label.textContent = labelText;
    if (resetFn) {
      const rst = document.createElement('button');
      rst.className = 'tp-ctl-reset';
      rst.textContent = '↺';
      rst.title = 'Reset this setting';
      rst.addEventListener('click', (e) => { e.preventDefault(); resetFn(); });
      label.appendChild(rst);
    }
    if (valueLabel) label.appendChild(valueLabel);
    wrap.appendChild(label);
    wrap.appendChild(inputEl);
    // Every control highlights what it affects while hovered, so the user
    // never has to guess what a slider is about to change.
    if (hlSelector) {
      wrap.addEventListener('mouseenter', () => highlightComponent(hlSelector, true));
      wrap.addEventListener('mouseleave', () => highlightComponent(hlSelector, false));
    }
    return wrap;
  }

  // Rebuild the panel after a reset so every input snaps back to the page's
  // actual (restored) values instead of showing a stale position.
  function resetAndRebuild(selector, props) {
    clearTweaks(selector, props);
    buildTweakControls();
  }

  function fontControls(group, labelPrefix, selector, computed) {
    const saved = tweaksFor(currentFile)[selector] || {};

    // font family
    const sel = document.createElement('select');
    for (const name of Object.keys(FONT_STACKS)) {
      const opt = document.createElement('option');
      opt.value = name; opt.textContent = name;
      sel.appendChild(opt);
    }
    if (saved['font-family']) {
      const match = Object.entries(FONT_STACKS).find(([, v]) => v === saved['font-family']);
      if (match) sel.value = match[0];
    }
    sel.addEventListener('change', () => {
      const stack = FONT_STACKS[sel.value];
      setTweak(selector, 'font-family', stack);
    });
    group.appendChild(makeControl(labelPrefix + ' font', sel, null,
      () => resetAndRebuild(selector, ['font-family']), selector));

    // font size — computed already reflects a restored tweak, so just read it
    const size = parseFloat(computed.fontSize) || 16;
    const range = document.createElement('input');
    range.type = 'range';
    range.min = Math.max(8, Math.round(size * 0.5));
    range.max = Math.round(size * 2);
    range.step = 0.5;
    range.value = size;
    const val = document.createElement('span');
    val.className = 'tp-val';
    val.textContent = size + 'px';
    range.addEventListener('input', () => {
      val.textContent = range.value + 'px';
      setTweak(selector, 'font-size', range.value + 'px');
    });
    group.appendChild(makeControl(labelPrefix + ' size', range, val,
      () => resetAndRebuild(selector, ['font-size']), selector));

    // color
    const color = document.createElement('input');
    color.type = 'color';
    color.value = rgbToHex(computed.color) || '#000000';
    color.addEventListener('input', () => setTweak(selector, 'color', color.value));
    group.appendChild(makeControl(labelPrefix + ' color', color, null,
      () => resetAndRebuild(selector, ['color']), selector));

    // weight
    const weight = document.createElement('select');
    for (const w of ['(original)', '300', '400', '500', '600', '700', '800', '900']) {
      const opt = document.createElement('option');
      opt.value = w; opt.textContent = w;
      weight.appendChild(opt);
    }
    if (saved['font-weight']) weight.value = saved['font-weight'];
    weight.addEventListener('change', () => {
      setTweak(selector, 'font-weight', weight.value === '(original)' ? null : weight.value);
    });
    group.appendChild(makeControl(labelPrefix + ' weight', weight, null,
      () => resetAndRebuild(selector, ['font-weight']), selector));
  }

  function rgbToHex(rgb) {
    const m = rgb && rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return null;
    return '#' + [m[1], m[2], m[3]]
      .map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
  }

  function groupEl(title, countText) {
    const g = document.createElement('div');
    g.className = 'tp-group';
    const l = document.createElement('div');
    l.className = 'tp-group-label';
    l.textContent = title;
    if (countText) {
      const c = document.createElement('span');
      c.className = 'tp-count';
      c.textContent = ' · ' + countText;
      l.appendChild(c);
    }
    g.appendChild(l);
    return g;
  }

  // ---------- component detection ----------
  //
  // Find repeating visual structures: classes that appear on 2+ elements which
  // look like styled boxes (have a background, border, or padding of their own).
  // Each such class is treated as a "component" — a card, list item, chat
  // bubble, suggestion box, chip... — and gets its own panel section with
  // style presets and property controls. Purely heuristic, but our own skill
  // generates these pages, so markup is predictably class-structured.

  function detectComponents(doc, win) {
    const counts = {};
    for (const el of doc.body.querySelectorAll('[class]')) {
      for (const cls of el.classList) {
        if (!counts[cls]) counts[cls] = [];
        counts[cls].push(el);
      }
    }
    const components = [];
    for (const [cls, els] of Object.entries(counts)) {
      if (els.length < 2 || els.length > 60) continue;
      const cs = win.getComputedStyle(els[0]);
      const hasBg = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)';
      const hasBorder = parseFloat(cs.borderTopWidth) > 0;
      // A box either pads its own content or wraps padded children (cards often
      // put padding on inner .head/.body elements, not the container itself).
      const hasPad = parseFloat(cs.paddingTop) > 0 || parseFloat(cs.paddingLeft) > 0;
      const hasRadius = parseFloat(cs.borderTopLeftRadius) > 0;
      const hasChildren = els[0].children.length > 0;
      if (!(hasBg || hasBorder)) continue;
      if (!hasPad && !hasRadius && !hasChildren) continue;
      // skip trivially small elements (tags, dots) — boxes are the target
      const rect = els[0].getBoundingClientRect();
      if (rect.width < 60 || rect.height < 24) continue;
      components.push({ cls, els, computed: cs });
    }
    // Largest visual footprint first; cap the list so the panel stays scannable.
    components.sort((a, b) => {
      const ra = a.els[0].getBoundingClientRect(), rb = b.els[0].getBoundingClientRect();
      return (rb.width * rb.height * b.els.length) - (ra.width * ra.height * a.els.length);
    });
    return components.slice(0, 6);
  }

  const COMPONENT_PRESETS = {
    'Flat':     { 'background': '#f4f5f7', 'border': 'none', 'border-radius': '4px', 'box-shadow': 'none' },
    'Outlined': { 'background': 'transparent', 'border': '1px solid #c8ccd4', 'border-radius': '6px', 'box-shadow': 'none' },
    'Elevated': { 'background': '#ffffff', 'border': 'none', 'border-radius': '10px', 'box-shadow': '0 2px 10px rgba(0,0,0,.12)' },
    'Rounded':  { 'border-radius': '16px' },
    'Dark':     { 'background': '#1e2027', 'border': '1px solid #33363e', 'color': '#e8e9eb', 'border-radius': '8px' },
  };

  function highlightComponent(selector, on) {
    const doc = idoc();
    if (!doc) return;
    let hl = doc.getElementById('__hl__');
    if (!hl) {
      hl = doc.createElement('style');
      hl.id = '__hl__';
      doc.head.appendChild(hl);
    }
    // outline-offset must be NEGATIVE (drawn inside the element) — a positive
    // offset draws outside the box, which for body/full-bleed elements lands
    // beyond the viewport and is invisible.
    hl.textContent = on
      ? selector + ' { outline: 2px dashed #2b6cf6 !important; outline-offset: -2px; box-shadow: inset 0 0 0 2px rgba(43,108,246,.35) !important; }'
      : '';
  }

  const COMPONENT_PROPS = ['background', 'background-color', 'border', 'border-color',
    'border-width', 'border-style', 'border-radius', 'padding', 'box-shadow', 'color'];

  function componentSection(comp, win) {
    const selector = '.' + CSS.escape(comp.cls);
    const label = comp.cls.replace(/[-_]/g, ' ');
    const g = groupEl(label, comp.els.length + ' found');
    // group-level reset: clears everything set on this component
    const groupReset = document.createElement('button');
    groupReset.className = 'tp-group-reset';
    groupReset.textContent = '↺';
    groupReset.title = 'Reset all settings for this component';
    groupReset.addEventListener('click', () => resetAndRebuild(selector, COMPONENT_PROPS));
    g.querySelector('.tp-group-label').appendChild(groupReset);
    g.addEventListener('mouseenter', () => highlightComponent(selector, true));
    g.addEventListener('mouseleave', () => highlightComponent(selector, false));

    // Style presets — one click sets several properties at once.
    const presets = document.createElement('div');
    presets.className = 'tp-presets';
    for (const [name, props] of Object.entries(COMPONENT_PRESETS)) {
      const btn = document.createElement('button');
      btn.className = 'tp-preset';
      btn.textContent = name;
      btn.addEventListener('click', () => {
        presets.querySelectorAll('.tp-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tweaksFor(currentFile)[selector] = Object.assign({}, props);
        applyTweaks();
        scheduleSave();
      });
      btn.addEventListener('mouseenter', () => highlightComponent(selector, true));
      btn.addEventListener('mouseleave', () => highlightComponent(selector, false));
      presets.appendChild(btn);
    }
    g.appendChild(presets);

    const cs = comp.computed;

    // Background color
    const bg = document.createElement('input');
    bg.type = 'color';
    bg.value = rgbToHex(cs.backgroundColor) || '#ffffff';
    bg.addEventListener('input', () => setTweak(selector, 'background-color', bg.value));
    g.appendChild(makeControl('Background', bg, null,
      () => resetAndRebuild(selector, ['background', 'background-color']), selector));

    // Border color + width
    const borderColor = document.createElement('input');
    borderColor.type = 'color';
    borderColor.value = rgbToHex(cs.borderTopColor) || '#c8ccd4';
    borderColor.addEventListener('input', () =>
      setTweak(selector, 'border-color', borderColor.value));
    g.appendChild(makeControl('Border color', borderColor, null,
      () => resetAndRebuild(selector, ['border', 'border-color']), selector));

    const bw = parseFloat(cs.borderTopWidth) || 0;
    const borderWidth = document.createElement('input');
    borderWidth.type = 'range';
    borderWidth.min = 0; borderWidth.max = 6; borderWidth.step = 1;
    borderWidth.value = bw;
    const bwVal = document.createElement('span');
    bwVal.className = 'tp-val'; bwVal.textContent = bw + 'px';
    borderWidth.addEventListener('input', () => {
      bwVal.textContent = borderWidth.value + 'px';
      setTweak(selector, 'border-width', borderWidth.value + 'px');
      setTweak(selector, 'border-style', 'solid');
    });
    g.appendChild(makeControl('Border width', borderWidth, bwVal,
      () => resetAndRebuild(selector, ['border-width', 'border-style']), selector));

    // Corner radius
    const rad = parseFloat(cs.borderTopLeftRadius) || 0;
    const radius = document.createElement('input');
    radius.type = 'range';
    radius.min = 0; radius.max = 32; radius.step = 1;
    radius.value = rad;
    const radVal = document.createElement('span');
    radVal.className = 'tp-val'; radVal.textContent = rad + 'px';
    radius.addEventListener('input', () => {
      radVal.textContent = radius.value + 'px';
      setTweak(selector, 'border-radius', radius.value + 'px');
    });
    g.appendChild(makeControl('Corner radius', radius, radVal,
      () => resetAndRebuild(selector, ['border-radius']), selector));

    // Padding
    const pad = parseFloat(cs.paddingTop) || 0;
    const padding = document.createElement('input');
    padding.type = 'range';
    padding.min = 0; padding.max = Math.max(40, pad * 2); padding.step = 1;
    padding.value = pad;
    const padVal = document.createElement('span');
    padVal.className = 'tp-val'; padVal.textContent = pad + 'px';
    padding.addEventListener('input', () => {
      padVal.textContent = padding.value + 'px';
      setTweak(selector, 'padding', padding.value + 'px');
    });
    g.appendChild(makeControl('Padding', padding, padVal,
      () => resetAndRebuild(selector, ['padding']), selector));

    // Shadow
    const shadow = document.createElement('select');
    for (const s of ['(original)', 'None', 'Subtle', 'Medium', 'Strong']) {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      shadow.appendChild(opt);
    }
    const SHADOWS = {
      'None': 'none',
      'Subtle': '0 1px 3px rgba(0,0,0,.08)',
      'Medium': '0 3px 12px rgba(0,0,0,.14)',
      'Strong': '0 8px 28px rgba(0,0,0,.24)',
    };
    shadow.addEventListener('change', () =>
      setTweak(selector, 'box-shadow', shadow.value === '(original)' ? null : SHADOWS[shadow.value]));
    g.appendChild(makeControl('Shadow', shadow, null,
      () => resetAndRebuild(selector, ['box-shadow']), selector));

    return g;
  }

  function buildTweakControls() {
    tpBody.innerHTML = '';
    const doc = idoc();
    if (!doc || !doc.body || frame.src === 'about:blank') {
      tpBody.innerHTML = '<div class="tp-hint">Load a variant first.</div>';
      return;
    }

    const hint = document.createElement('div');
    hint.className = 'tp-hint';
    hint.textContent = 'Controls below are generated from the loaded variant’s own layout. '
      + 'Changes auto-save per variant and survive switching screens. Use ↺ to reset one setting, '
      + 'Reset for the whole variant — or ask Claude to apply your customizations permanently.';
    tpBody.appendChild(hint);

    const win = frame.contentWindow;

    // Typography: body + every heading level that actually exists on the page.
    const typo = groupEl('Typography');
    fontControls(typo, 'Body', 'body', win.getComputedStyle(doc.body));
    for (const tag of ['h1', 'h2', 'h3', 'h4']) {
      const el = doc.querySelector(tag);
      if (el) fontControls(typo, tag.toUpperCase(), tag, win.getComputedStyle(el));
    }
    tpBody.appendChild(typo);

    // Components: repeating boxes detected on THIS page — cards, list items,
    // chat bubbles, whatever the variant is made of. Each gets presets +
    // property controls; hovering a section highlights its elements.
    for (const comp of detectComponents(doc, win)) {
      tpBody.appendChild(componentSection(comp, win));
    }

    // CSS custom properties defined by the variant (on :root / inline styles /
    // stylesheets). Colors get pickers, px/em/rem values get sliders.
    const varNames = collectCssVars(doc);
    if (varNames.length) {
      const vg = groupEl('Design Tokens (CSS variables)');
      const rootStyle = win.getComputedStyle(doc.documentElement);
      for (const name of varNames) {
        const value = rootStyle.getPropertyValue(name).trim();
        if (!value) continue;
        const savedVars = tweaksFor(currentFile)['__vars__'] || {};
        const effective = savedVars[name] || value;
        if (/^#|^rgb/.test(effective)) {
          const input = document.createElement('input');
          input.type = 'color';
          input.value = effective.startsWith('#') ? effective : (rgbToHex(effective) || '#000000');
          input.addEventListener('input', () => setVarTweak(name, input.value));
          vg.appendChild(makeControl(name, input, null,
            () => { setVarTweak(name, null); buildTweakControls(); }, varUsageSelector(doc, name)));
        } else if (/^[\d.]+(px|em|rem)$/.test(effective)) {
          const num = parseFloat(effective);
          const unit = effective.replace(/^[\d.]+/, '');
          const range = document.createElement('input');
          range.type = 'range';
          range.min = Math.max(0, num * 0.5);
          range.max = num * 2;
          range.step = 0.5;
          range.value = num;
          const val = document.createElement('span');
          val.className = 'tp-val';
          val.textContent = effective;
          range.addEventListener('input', () => {
            val.textContent = range.value + unit;
            setVarTweak(name, range.value + unit);
          });
          vg.appendChild(makeControl(name, range, val,
            () => { setVarTweak(name, null); buildTweakControls(); }, varUsageSelector(doc, name)));
        } else {
          const input = document.createElement('input');
          input.type = 'text';
          input.value = effective;
          input.addEventListener('change', () => setVarTweak(name, input.value));
          vg.appendChild(makeControl(name, input, null,
            () => { setVarTweak(name, null); buildTweakControls(); }, varUsageSelector(doc, name)));
        }
      }
      tpBody.appendChild(vg);
    }

    // Layout basics that apply to any page.
    const layout = groupEl('Layout');
    const spacing = document.createElement('input');
    spacing.type = 'range';
    spacing.min = 0.8; spacing.max = 2.2; spacing.step = 0.05;
    spacing.value = 1.5;
    const spacingVal = document.createElement('span');
    spacingVal.className = 'tp-val';
    spacingVal.textContent = '(original)';
    spacing.addEventListener('input', () => {
      spacingVal.textContent = spacing.value;
      setTweak('body, body p, body li', 'line-height', spacing.value);
    });
    layout.appendChild(makeControl('Line height', spacing, spacingVal,
      () => resetAndRebuild('body, body p, body li', ['line-height']), 'body p, body li'));
    tpBody.appendChild(layout);
  }

  // Which selectors USE a given CSS variable — so hovering its control can
  // highlight exactly the elements that var(--x) actually affects.
  function varUsageSelector(doc, varName) {
    const selectors = new Set();
    for (const sheet of doc.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch (e) { continue; }
      for (const rule of rules || []) {
        if (!rule.style || !rule.selectorText) continue;
        if (rule.style.cssText.includes('var(' + varName)) {
          selectors.add(rule.selectorText);
        }
      }
    }
    // A :root-level var used nowhere visible (or used only on :root itself,
    // e.g. --variant-font-size consumed via body inheritance) — highlight body.
    selectors.delete(':root');
    return selectors.size ? [...selectors].join(', ') : 'body';
  }

  function collectCssVars(doc) {
    const names = new Set();
    for (const sheet of doc.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch (e) { continue; }
      for (const rule of rules || []) {
        if (!rule.style) continue;
        for (const prop of rule.style) {
          if (prop.startsWith('--')) names.add(prop);
        }
      }
    }
    return [...names];
  }

  // "Reset" clears ALL saved customizations for the current variant.
  document.getElementById('tp-reset').addEventListener('click', () => {
    if (currentFile) delete ALL_TWEAKS[currentFile];
    saveTweaks();
    frame.contentWindow.location.reload();
    setTimeout(buildTweakControls, 300);
  });

  // On every iframe load: re-apply this variant's saved tweaks, then rebuild
  // the panel so its controls reflect the restored state.
  frame.addEventListener('load', () => {
    applyTweaks();
    if (tweakOpen) buildTweakControls();
  });

  loadSavedTweaks().then(renderAll);
</script>
</body>
</html>
"""


def validate_gallery(data, screens_dir):
    errors = []

    if not isinstance(data, dict):
        return ["gallery.json must contain a JSON object."]

    if "variants" in data and "screens" not in data:
        errors.append(
            "gallery.json uses the legacy flat shape with top-level 'variants'. "
            "Expected {'screens': [{'name': ..., 'variants': [...]}]}."
        )

    title = data.get("title")
    if title is not None and not isinstance(title, str):
        errors.append("'title' must be a string when present.")

    screens = data.get("screens")
    if not isinstance(screens, list):
        errors.append("'screens' must be a list.")
        return errors

    for screen_idx, screen in enumerate(screens, start=1):
        prefix = f"screens[{screen_idx - 1}]"
        if not isinstance(screen, dict):
            errors.append(f"{prefix} must be an object.")
            continue

        name = screen.get("name")
        if not isinstance(name, str) or not name.strip():
            errors.append(f"{prefix}.name must be a non-empty string.")

        brief = screen.get("brief")
        if brief is not None:
            if not isinstance(brief, str) or not brief.strip():
                errors.append(f"{prefix}.brief must be a non-empty string when present.")
            elif not (screens_dir / brief).exists():
                errors.append(f"{prefix}.brief references missing file: {brief}")

        variants = screen.get("variants")
        if not isinstance(variants, list):
            errors.append(f"{prefix}.variants must be a list.")
            continue

        for variant_idx, variant in enumerate(variants, start=1):
            vprefix = f"{prefix}.variants[{variant_idx - 1}]"
            if not isinstance(variant, dict):
                errors.append(f"{vprefix} must be an object.")
                continue

            file_name = variant.get("file")
            if not isinstance(file_name, str) or not file_name.strip():
                errors.append(f"{vprefix}.file must be a non-empty string.")
            elif not (screens_dir / file_name).exists():
                errors.append(f"{vprefix}.file references missing file: {file_name}")

            label = variant.get("label")
            if not isinstance(label, str) or not label.strip():
                errors.append(f"{vprefix}.label must be a non-empty string.")

            if "final" in variant and not isinstance(variant["final"], bool):
                errors.append(f"{vprefix}.final must be true or false when present.")

            note = variant.get("note")
            if note is not None and not isinstance(note, str):
                errors.append(f"{vprefix}.note must be a string when present.")

    return errors


def main():
    if len(sys.argv) != 2:
        print("Usage: build_gallery.py <path-to-screens-dir>", file=sys.stderr)
        sys.exit(1)

    screens_dir = Path(sys.argv[1]).resolve()
    gallery_json = screens_dir / "gallery.json"

    if not gallery_json.exists():
        data = {"title": "Enterprise App Kit — Wireframe Gallery", "screens": []}
        gallery_json.write_text(json.dumps(data, indent=2) + "\n")
        print(f"No gallery.json found — created an empty one at {gallery_json}")
    else:
        try:
            data = json.loads(gallery_json.read_text())
        except json.JSONDecodeError as e:
            print(f"Invalid gallery.json: {e}", file=sys.stderr)
            sys.exit(1)

    errors = validate_gallery(data, screens_dir)
    if errors:
        print(f"Invalid {gallery_json}:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        sys.exit(1)

    title = data.get("title", "Enterprise App Kit — Wireframe Gallery")
    html = (PAGE_TEMPLATE
            .replace("__TITLE__", title)
            .replace("__DATA_JSON__", json.dumps(data)))

    out_path = screens_dir / "index.html"
    out_path.write_text(html)
    print(f"Wrote {out_path} from {gallery_json}")


if __name__ == "__main__":
    main()
