import React, { memo, startTransition, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { hashString, Palette } from './palette';
import { KineticSpan, KineticWord } from './kinetic';
import { animateTo, prefersReducedMotion, resolveTiming } from './waapi';
import {
  fitFont,
  fitFontLen,
  groupRows,
  KineticLine,
  KineticWordItem,
  LABEL,
  langAttr,
  lyricShadow,
  parseColor,
  rng,
  softSpring,
  splitLetters,
  spring,
  TemplateProps,
  visualLength,
  vivid,
  wordColor,
} from './shared';

/** Words stack into big left- or right-aligned rows, each sliding up as it's sung. */
export const Stack: React.FC<TemplateProps> = ({ line, revealed, palette, seed }) => {
  const r = rng(seed);
  const align = r() < 0.5 ? 'flex-start' : 'flex-end';
  const textAlign = r() < 0.5 ? 'left' : 'right';
  const rows = groupRows(line.words, Math.min(5, Math.max(2, Math.ceil(line.words.length / 2))));
  const fontSize = fitFont(rows.map(row => row.map(w => w.text).join(' ')), { widthVw: 90, maxVw: 15 });
  let k = 0;

  return (
    <div style={{ display: 'flex', width: '92cqw', flexDirection: 'column', alignItems: align, textAlign, fontSize }}>
      {rows.map((row, ri) => (
        <div
          key={ri}
          style={{ display: 'flex', flexWrap: 'wrap', columnGap: '0.25em', lineHeight: 1.05, paddingBottom: '0.06em', justifyContent: align }}
        >
          {row.map(w => {
            const i = k++;
            const shown = i < revealed;
            return (
              <KineticWord
                key={i}
                shown={shown}
                from={{ y: 0.7, opacity: 0, scaleY: 1.3, scaleX: 0.9 }}
                transition={spring}
                style={{ display: 'inline-block', fontWeight: 900, letterSpacing: '-0.025em', color: wordColor(line, i, palette, seed) }}
              >
                {w.text}
              </KineticWord>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Huge staggered rows that slide in from alternating edges. */
export const Slide: React.FC<TemplateProps> = ({ line, revealed, palette, seed }) => {
  const r = rng(seed + 5);
  const rows = groupRows(line.words, Math.min(3, Math.max(1, Math.ceil(line.words.length / 2))));
  const fontSize = fitFont(rows.map(row => row.map(w => w.text).join(' ')), { widthVw: 88, maxVw: 17, heightVh: 70 });
  const indentStep = 3 + r() * 4;
  const reverse = r() < 0.5;
  let k = 0;

  return (
    <div style={{ display: 'flex', width: '94cqw', flexDirection: 'column', fontSize }}>
      {rows.map((row, ri) => {
        const fromLeft = (ri % 2 === 0) !== reverse;
        const indent = (reverse ? rows.length - 1 - ri : ri) * indentStep;
        return (
          <div key={ri} style={{ display: 'flex', columnGap: '0.24em', lineHeight: 1, whiteSpace: 'nowrap', marginLeft: `${indent}cqw` }}>
            {row.map(w => {
              const i = k++;
              const shown = i < revealed;
              return (
                <KineticWord
                  key={i}
                  shown={shown}
                  from={{ x: fromLeft ? -1.1 : 5, opacity: 0, scaleX: fromLeft ? 1.2 : 1.45, scaleY: 0.85, skewX: fromLeft ? -10 : 16 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                  style={{ display: 'inline-block', fontWeight: 900, letterSpacing: '-0.025em', color: wordColor(line, i, palette, seed) }}
                >
                  {w.text}
                </KineticWord>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/** Words fly in from huge and blurred, settling into centered rows. */
export const Zoom: React.FC<TemplateProps> = ({ line, revealed, palette, seed }) => {
  const rows = groupRows(line.words, Math.min(4, Math.max(1, Math.ceil(line.words.length / 2))));
  const fontSize = fitFont(rows.map(row => row.map(w => w.text).join(' ')), { widthVw: 90, maxVw: 17 });
  let k = 0;

  return (
    <div style={{ display: 'flex', width: '94cqw', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontSize }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: '0.25em', lineHeight: 1.02 }}>
          {row.map(w => {
            const i = k++;
            const shown = i < revealed;
            return (
              <KineticWord
                key={i}
                shown={shown}
                from={{ scale: 2.6, opacity: 0, scaleY: 0.75, skewX: -10 }}
                transition={softSpring}
                style={{ display: 'inline-block', fontWeight: 900, letterSpacing: '-0.025em', color: wordColor(line, i, palette, seed) }}
              >
                {w.text}
              </KineticWord>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Each letter flips into place in 3D space (rotateX). */
export const Letters: React.FC<TemplateProps> = ({ line, revealed, palette, seed }) => {
  const r = rng(seed + 9);
  const fromTop = r() < 0.5;
  const rows = groupRows(line.words, Math.min(4, Math.max(1, Math.ceil(line.words.length / 2))));
  const fontSize = fitFont(rows.map(row => row.map(w => w.text).join(' ')), { widthVw: 90, maxVw: 16 });
  let k = 0;

  return (
    <div style={{ display: 'flex', width: '94cqw', flexDirection: 'column', alignItems: 'center', textAlign: 'center', perspective: '800px', fontSize }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: '0.25em', lineHeight: 1.05 }}>
          {row.map(w => {
            const i = k++;
            const shown = i < revealed;
            const color = wordColor(line, i, palette, seed);
            return (
              <span
                key={i}
                data-fit=""
                style={{ display: 'inline-flex', fontWeight: 900, letterSpacing: '-0.025em', color, textShadow: lyricShadow(color) }}
              >
                {splitLetters(w.text).map((ch, j) => (
                  <KineticSpan
                    key={j}
                    shown={shown}
                    style={{ transformOrigin: 'center' }}
                    from={{ rotateX: fromTop ? 90 : -90, y: fromTop ? -0.4 : 0.4, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 160, damping: 22, delay: shown ? j * 0.03 : 0 }}
                  >
                    {ch}
                  </KineticSpan>
                ))}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Collage of varied word scales, offsets, and vertical words. */
export const Scatter: React.FC<TemplateProps> = ({ line, revealed, palette, seed }) => {
  const r = rng(seed);
  const total = line.words.reduce((a, w) => a + visualLength(w.text), 0);
  const base = fitFontLen(total / 3 + 1.5, 3, { widthVw: 76, maxVw: 12, heightVh: 54 });
  const layout = line.words.map(w => ({
    scale: 0.65 + r() * 0.6,
    rotate: w.text.length <= 6 && r() < 0.22 ? -90 : 0,
    offset: (r() - 0.5) * 0.5,
    fromX: (r() - 0.5) * 3,
    fromY: (r() - 0.5) * 2,
  }));

  return (
    <div
      style={{
        display: 'flex',
        width: '90cqw',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        columnGap: '0.35em',
        rowGap: '0.1em',
        fontSize: base,
      }}
    >
      {line.words.map((w, i) => {
        const l = layout[i];
        const shown = i < revealed;
        return (
          <KineticWord
            key={i}
            shown={shown}
            from={{ x: l.fromX, y: l.fromY, opacity: 0, scale: 0.7, skewX: l.fromX * 6, rotate: l.fromY * 8 }}
            transition={spring}
            style={{
              display: 'inline-block',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.025em',
              fontSize: `${l.scale}em`,
              color: wordColor(line, i, palette, seed),
              writingMode: l.rotate ? 'vertical-rl' : undefined,
              top: `${l.offset}em`,
            }}
          >
            {w.text}
          </KineticWord>
        );
      })}
    </div>
  );
};

/** Full line dimly visible; words light up sequentially as sung. */
export const Flow: React.FC<TemplateProps> = ({ line, revealed, palette, seed }) => {
  const total = visualLength(line.text);
  const rows = Math.min(4, Math.max(1, Math.ceil(total / 14)));
  const fontSize = fitFontLen(total / rows + 1.5, rows + 0.5, { widthVw: 84, maxVw: 11, heightVh: Math.min(66, 24 * rows) });

  return (
    <p
      style={{
        display: 'flex',
        width: '92cqw',
        flexWrap: 'wrap',
        justifyContent: 'center',
        fontWeight: 800,
        lineHeight: 1.12,
        letterSpacing: '-0.025em',
        columnGap: line.lang === 'ja' ? undefined : '0.26em',
        fontSize,
        margin: 0,
        animation: 'freqRiseIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {line.words.map((w, i) => {
        const sung = i < revealed;
        const active = i === revealed - 1;
        const color = wordColor(line, i, palette, seed);
        return (
          <span
            key={i}
            data-fit=""
            style={{
              display: 'inline-block',
              transformOrigin: 'bottom',
              transition: 'opacity 0.3s cubic-bezier(0.16,1,0.3,1), transform 0.3s cubic-bezier(0.16,1,0.3,1)',
              color: sung ? color : LABEL,
              textShadow: lyricShadow(sung ? color : undefined),
              opacity: sung ? 1 : 0.32,
              transform: active ? 'scale(1.04)' : 'scale(1)',
            }}
          >
            {w.text}
          </span>
        );
      })}
    </p>
  );
};

/* ---------------------------------------------------------------------------
 * Graph & GraphStream: Continuous Organic Lyric Vine
 * ------------------------------------------------------------------------- */

const SMALL_WORDS = new Set([
  'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'from', 'with', 'into', 'onto',
  'my', 'your', 'his', 'her', 'our', 'their', 'its', 'and', 'or', 'but', 'so', 'as', 'if',
  'is', 'am', 'are', 'was', 'be', 'been', 'i', "i'm", 'it', "it's", 'me', 'we', "you're", 'that',
  'this', 'just', 'all', 'up', 'out',
  'ka', 'ki', 'ke', 'ko', 'se', 'hai', 'hain', 'ne', 'na', 'bhi', 'toh',
]);

const cleanWord = (t: string) => t.toLowerCase().replace(/[^\p{L}']/gu, '');

function isLeaf(words: KineticWordItem[], i: number): boolean {
  if (words[i].emphasis || i === words.length - 1) return false;
  const t = cleanWord(words[i].text);
  return SMALL_WORDS.has(t) || (t.length <= 2 && /^[a-z']+$/.test(t));
}

export type TreeNode = { x: number; y: number; font: number; leaf: boolean; parent: number };
export type Box = { l: number; t: number; r: number; b: number };
type Pt = { x: number; y: number };

const labelWidth = (text: string, font: number) => visualLength(text) * font;

function layoutTree(words: KineticWordItem[], W: number, H: number, seed: number, rowWidth: number, organic = false) {
  const wander = rng(seed ^ 0x2545f491);
  const ampScale = organic ? 0.55 + wander() * 0.45 : 1;
  let walk = organic ? (wander() * 2 - 1) * 0.8 : 0;
  const trunkFont = Math.min(H * 0.13, W * 0.075);
  const leafFont = trunkFont * 0.42;
  const gap = W * 0.05;
  const amp = trunkFont * 0.75;
  const phase = (seed % 628) / 100;
  const rowStep = amp * 2 + trunkFont * 0.75 + leafFont * 2.6 + trunkFont * 1.25 + 14;

  let leaves = words.map((_, i) => isLeaf(words, i));
  if (!leaves.some(l => !l)) leaves = words.map(() => false);

  const parentOf = words.map((_, i) => {
    if (!leaves[i]) return i;
    for (let j = i + 1; j < words.length; j++) if (!leaves[j]) return j;
    for (let j = i - 1; j >= 0; j--) if (!leaves[j]) return j;
    return i;
  });

  const nodes: TreeNode[] = words.map((w, i) => ({
    x: 0,
    y: 0,
    font: leaves[i] ? leafFont : w.emphasis ? trunkFont * 1.2 : trunkFont,
    leaf: leaves[i],
    parent: parentOf[i],
  }));

  const leavesWidthOf = (i: number) =>
    words.reduce((a, w, j) => (leaves[j] && parentOf[j] === i ? a + labelWidth(w.text, leafFont) + leafFont * 1.6 : a), 0);

  let x = 0;
  let row = 0;
  let k = 0;
  let inRow = 0;
  let prevTrunk = -1;
  for (let i = 0; i < words.length; i++) {
    if (leaves[i]) continue;
    const lw = leavesWidthOf(i);
    if (prevTrunk < 0) x = lw;
    else {
      const prevWidth = labelWidth(words[prevTrunk].text, nodes[prevTrunk].font) + 10;
      const g = organic ? gap * (0.6 + wander() * 1.1) : gap;
      const next = x + Math.max(prevWidth + g, lw + g);
      if (inRow > 0 && next + labelWidth(words[i].text, nodes[i].font) + 10 > rowWidth) {
        row++;
        inRow = 0;
        x = lw;
      } else x = next;
    }
    nodes[i].x = x;
    if (organic && k > 0) walk = Math.max(-1, Math.min(1, walk + (wander() * 2 - 1) * 1.1));
    nodes[i].y = row * rowStep + (organic ? amp * ampScale * walk : amp * Math.sin(k * 1.25 + phase));
    prevTrunk = i;
    k++;
    inRow++;
  }

  for (let i = 0; i < words.length; i++) {
    if (!leaves[i]) continue;
    const p = nodes[parentOf[i]];
    const siblings = words.map((_, j) => j).filter(j => leaves[j] && parentOf[j] === parentOf[i]);
    const order = siblings.indexOf(i);
    let dx = 0;
    for (let q = siblings.length - 1; q >= order; q--) dx += labelWidth(words[siblings[q]].text, leafFont) + leafFont * 1.6;
    nodes[i].x = p.x - dx;
    nodes[i].y = p.y + trunkFont * 0.75 + (order % 2) * leafFont * 1.3;
  }

  const box: Box = { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
  const add = (l: number, t: number, r: number, b: number) => {
    box.l = Math.min(box.l, l);
    box.t = Math.min(box.t, t);
    box.r = Math.max(box.r, r);
    box.b = Math.max(box.b, b);
  };
  nodes.forEach((n, i) => {
    const w = labelWidth(words[i].text, n.font);
    add(n.x - 8, n.y - 8, n.x + 8, n.y + 8);
    if (n.leaf) add(n.x + 8, n.y + 4, n.x + 8 + w, n.y + 4 + n.font * 1.05);
    else add(n.x + 10, n.y - 10 - n.font * 1.05, n.x + 10 + w, n.y - 10);
  });
  return { nodes, box, rows: row + 1 };
}

const SAFE_X = 0.05;
const SAFE_Y = 0.08;

function fitTree(words: KineticWordItem[], W: number, H: number, seed: number, heightShare = 1, organic = false) {
  const availW = W * (1 - 2 * SAFE_X);
  const availH = H * (1 - 2 * SAFE_Y) * heightShare;
  let best: (ReturnType<typeof layoutTree> & { s: number }) | null = null;
  for (const f of [Infinity, 2.2, 1.7, 1.35, 1.05, 0.8]) {
    const l = layoutTree(words, W, H, seed, availW * f, organic);
    const s = Math.min(1, availW / Math.max(1, l.box.r - l.box.l), availH / Math.max(1, l.box.b - l.box.t));
    if (!best || s > best.s + 0.02 || (Math.abs(s - best.s) <= 0.02 && l.rows < best.rows)) best = { ...l, s };
  }
  return best!;
}

type Placed = {
  nodes: TreeNode[];
  box: Box;
  s: number;
  first: number;
  last: number;
  seed: number;
};

const LINE_SHARE = 0.66;
const LINE_GAP = 0.05;
const V_MARGIN = 0.07;
const AGE_OPACITY = [1, 0.6, 0.42, 0];
const PREPARE_MS = 900;
const SOFT_FADE_S = 1.1;
const FONT_STEP = Math.log(1.03);
const stepFont = (px: number) => Math.round(Math.exp(Math.floor(Math.log(Math.max(8, px)) / FONT_STEP) * FONT_STEP) * 100) / 100;

function whenIdle(fn: () => void, timeout = 600) {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(fn, { timeout });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 60);
  return () => clearTimeout(id);
}

function organicPath(a: Pt, b: Pt, r: () => number, bend = 0.25): { d: string; pts: Pt[] } {
  const curve = (c1: Pt, c2: Pt) => ({
    d: `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`,
    pts: [a, c1, c2, b],
  });
  if (b.y - a.y > Math.abs(b.x - a.x) * 0.2 && b.x < a.x) {
    const midY = (a.y + b.y) / 2;
    const swing = 70 + r() * 140;
    return curve({ x: a.x + swing, y: midY + (r() - 0.5) * 60 }, { x: b.x - swing, y: midY + (r() - 0.5) * 60 });
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const t1 = 0.15 + r() * 0.3;
  const t2 = 0.55 + r() * 0.3;
  const b1 = (r() * 2 - 1) * len * bend;
  const b2 = (r() * 2 - 1) * len * bend;
  const c1 = { x: a.x + dx * t1 + nx * b1, y: a.y + dy * t1 + ny * b1 };
  const c2 = { x: a.x + dx * t2 + nx * b2, y: a.y + dy * t2 + ny * b2 };
  return curve(c1, c2);
}

function firstTrunk(nodes: TreeNode[]) {
  const i = nodes.findIndex(n => !n.leaf);
  return i < 0 ? 0 : i;
}
function lastTrunk(nodes: TreeNode[]) {
  for (let i = nodes.length - 1; i >= 0; i--) if (!nodes[i].leaf) return i;
  return nodes.length - 1;
}

function placeRun(lines: KineticLine[], from: number, to: number, songSeed: number, W: number, H: number): Placed[] {
  const out: Placed[] = [];
  for (let k = from; k <= to; k++) {
    const line = lines[k];
    const seed = (songSeed ^ hashString(line.text)) >>> 0;
    const t = fitTree(line.words, W, H, seed, LINE_SHARE, true);
    const first = firstTrunk(t.nodes);
    let ox = 0;
    let oy = 0;
    const prev = out[out.length - 1];
    if (prev) {
      const r = rng(seed ^ 0x9e3779b9);
      const w = (t.box.r - t.box.l) * t.s;
      const prevMid = (prev.box.l + prev.box.r) / 2;
      const shift = (r() < 0.5 ? -1 : 1) * W * (0.05 + r() * 0.3);
      const lx = Math.min(prev.box.r - W * 0.1, Math.max(prev.box.l + W * 0.1 - w, prevMid + shift - w / 2));
      const gap = H * LINE_GAP * (0.6 + r());
      const ty = prev.box.b + gap;
      ox = lx - t.box.l * t.s;
      oy = ty - t.box.t * t.s;
    }
    const nodes = t.nodes.map(n => ({ ...n, x: ox + n.x * t.s, y: oy + n.y * t.s, font: stepFont(n.font * t.s) }));
    out.push({
      nodes,
      box: { l: ox + t.box.l * t.s, t: oy + t.box.t * t.s, r: ox + t.box.r * t.s, b: oy + t.box.b * t.s },
      s: t.s,
      first,
      last: lastTrunk(nodes),
      seed,
    });
  }
  return out;
}

type Edge = { key: string; d: string; pts: Pt[]; from: Pt; to: Pt; color: string; width: number; opacity: number; shown: boolean; duration: number };

const DRAW_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const POP_EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const BLUR_STEPS = [1.2, 1.8, 2.6, 3.5, 4.6, 5.9, 7.4, 9.2];
const BLUR_ALPHA = 0.085;

function lineEdges(p: Placed, prev: Placed | undefined, shownCount: number, color: string): Edge[] {
  const nodes = p.nodes;
  const edges: Edge[] = [];
  const r = rng(p.seed ^ 0x6a09e667);
  if (prev) {
    const a = prev.nodes[prev.last];
    const b = nodes[p.first];
    edges.push({ key: 'bridge', ...organicPath(a, b, r, 0.4), from: a, to: b, color, width: 3 * p.s, opacity: 1, shown: shownCount > 0, duration: 0.7 });
  }
  nodes.forEach((n, i) => {
    const shown = i < shownCount;
    if (n.leaf) {
      const par = nodes[n.parent];
      edges.push({ key: `e${i}`, d: `M ${par.x} ${par.y} L ${n.x} ${n.y}`, pts: [par, n], from: par, to: n, color: LABEL, width: 1.5 * p.s, opacity: 0.55, shown, duration: 0.55 });
      return;
    }
    let prevTrunk = -1;
    for (let j = i - 1; j >= 0; j--) if (!nodes[j].leaf) { prevTrunk = j; break; }
    if (prevTrunk >= 0) {
      edges.push({ key: `e${i}`, ...organicPath(nodes[prevTrunk], n, r), from: nodes[prevTrunk], to: n, color, width: 3 * p.s, opacity: 1, shown, duration: 0.55 });
    }
  });
  return edges;
}

function edgeBounds(pts: Pt[], pad: number) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pt of pts) {
    minX = Math.min(minX, pt.x);
    minY = Math.min(minY, pt.y);
    maxX = Math.max(maxX, pt.x);
    maxY = Math.max(maxY, pt.y);
  }
  return { x: minX - pad, y: minY - pad, w: Math.max(2, maxX - minX + 2 * pad), h: Math.max(2, maxY - minY + 2 * pad) };
}

const WipeEdge: React.FC<{ e: Edge; x: number; y: number; w: number; h: number; d: string }> = ({ e, x, y, w, h, d }) => {
  const dx = e.to.x - e.from.x;
  const dy = e.to.y - e.from.y;
  const vertical = Math.abs(dy) > Math.abs(dx) * 0.5;
  const sx = vertical ? 0 : (Math.sign(dx) || 1) * w;
  const sy = vertical ? (Math.sign(dy) || 1) * h : 0;
  const t = `transform ${e.duration}s ${DRAW_EASE}`;
  return (
    <div style={{ position: 'absolute', overflow: 'hidden', left: x, top: y, width: w, height: h, transform: e.shown ? 'translate(0px, 0px)' : `translate(${-sx}px, ${-sy}px)`, transition: t }}>
      <div style={{ width: w, height: h, transform: e.shown ? 'translate(0px, 0px)' : `translate(${sx}px, ${sy}px)`, transition: t }}>
        <svg style={{ display: 'block' }} width={w} height={h} viewBox={`${x} ${y} ${w} ${h}`} aria-hidden>
          <path d={d} fill="none" stroke={e.color} strokeWidth={e.width} strokeOpacity={e.opacity} strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

const Branches = memo(function Branches({ p, prev, shownCount, soft, palette }: { p: Placed; prev?: Placed; shownCount: number; soft: boolean; palette: Palette }) {
  const color = vivid(palette.accents[p.seed % 3], 0.66);
  const nodes = p.nodes;
  const edges = lineEdges(p, prev, shownCount, color);

  if (soft) {
    const b = edgeBounds([...nodes, ...edges.flatMap(e => e.pts)], 40 * Math.max(1, p.s));
    const byColor = new Map<string, { color: string; width: number; opacity: number; d: string }>();
    for (const e of edges) {
      const g = byColor.get(e.color);
      if (g) g.d += ' ' + e.d;
      else byColor.set(e.color, { color: e.color, width: e.width, opacity: e.opacity, d: e.d });
    }
    const groups = [...byColor.values()];
    const dotGroups = [true, false].map(leaf => {
      const ns = nodes.filter(n => n.leaf === leaf);
      return {
        color: leaf ? LABEL : color,
        dots: (m: number) =>
          ns.map(n => {
            const rad = (leaf ? 4 : 7) * p.s * m;
            return `M ${n.x - rad} ${n.y} a ${rad} ${rad} 0 1 0 ${2 * rad} 0 a ${rad} ${rad} 0 1 0 ${-2 * rad} 0`;
          }).join(' '),
      };
    });
    return (
      <svg style={{ position: 'absolute', left: b.x, top: b.y }} width={b.w} height={b.h} viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`} aria-hidden>
        {BLUR_STEPS.map((k, si) =>
          groups.map(g => (
            <path key={`${si}-${g.color}`} d={g.d} fill="none" stroke={g.color} strokeWidth={g.width * k} strokeOpacity={g.opacity * BLUR_ALPHA} strokeLinecap="round" />
          ))
        )}
        {BLUR_STEPS.slice(0, 5).map((k, si) =>
          dotGroups.map(g => (
            <path key={`d${si}-${g.color}`} d={g.dots(0.6 + k * 0.35)} fill={g.color} fillOpacity={BLUR_ALPHA * 1.3} />
          ))
        )}
      </svg>
    );
  }

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, willChange: 'transform' }} aria-hidden>
      {edges.map(e => {
        const b = edgeBounds(e.pts, e.width * 2 + 2);
        return <WipeEdge key={e.key} e={e} x={b.x} y={b.y} w={b.w} h={b.h} d={e.d} />;
      })}
      {nodes.map((n, i) => {
        const shown = i < shownCount;
        const rad = (n.leaf ? 4 : 7) * p.s;
        return (
          <div
            key={`n${i}`}
            style={{
              position: 'absolute',
              borderRadius: '9999px',
              left: n.x - rad,
              top: n.y - rad,
              width: rad * 2,
              height: rad * 2,
              background: n.leaf ? LABEL : color,
              transform: shown ? 'scale(1)' : 'scale(0.4)',
              opacity: shown ? 1 : 0,
              transition: `transform 0.45s ${POP_EASE}, opacity 0.25s ease-out`,
            }}
          />
        );
      })}
    </div>
  );
});

const LineWords = memo(function LineWords({
  line,
  index,
  p,
  isCurrent,
  pending,
  soft,
  revealed,
  palette,
}: {
  line: KineticLine;
  index: number;
  p: Placed;
  isCurrent: boolean;
  pending: boolean;
  soft: boolean;
  revealed: number;
  palette: Palette;
}) {
  return (
    <div data-line={isCurrent ? index : undefined} lang={langAttr(line.lang)} aria-hidden={soft || undefined}>
      {line.words.map((w, j) => {
        const n = p.nodes[j];
        const shown = pending ? false : !isCurrent || j < revealed;
        const color = wordColor(line, j, palette, p.seed);
        const [r, g, b] = parseColor(color);
        const shadow = soft ? `0 0 0.07em rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.95)` : lyricShadow(color);
        return (
          <span
            key={j}
            data-fit={isCurrent ? '' : undefined}
            style={{
              position: 'absolute',
              transformOrigin: 'bottom left',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.025em',
              whiteSpace: 'nowrap',
              transition: 'opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)',
              left: n.x + (n.leaf ? 8 : 10) * p.s,
              top: n.y + (n.leaf ? 4 : -10) * p.s,
              fontSize: n.font,
              color: soft ? 'transparent' : color,
              textShadow: shadow,
              opacity: shown ? 1 : 0,
              transform: `translateY(${n.leaf ? '0%' : '-100%'}) ${shown ? 'translateY(0px) scale(1)' : 'translateY(6px) scale(0.85)'}`,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
});

const LineLayer: React.FC<{ age: number; children: (soft: boolean, drawn: boolean) => React.ReactNode }> = ({ age, children }) => {
  const [drawn, setDrawn] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const [armed, setArmed] = useState(false);
  const ended = age > 0;
  const started = age >= 0;

  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!started) return;
    let cancel = () => {};
    const t = setTimeout(() => (cancel = whenIdle(() => setPrepared(true))), ended ? 0 : PREPARE_MS);
    return () => {
      clearTimeout(t);
      cancel();
    };
  }, [started, ended]);

  useEffect(() => {
    if (!prepared) return;
    const id = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(id);
  }, [prepared]);

  const blurred = ended && armed;
  const fade = `opacity ${SOFT_FADE_S}s ease-in-out`;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: age < 0 ? 0 : AGE_OPACITY[Math.min(age, AGE_OPACITY.length - 1)],
        visibility: age < 0 ? 'hidden' : undefined,
        transition: `opacity ${age <= 0 ? 0.35 : 0.8}s ease-out`,
        transform: 'translateZ(0)',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, opacity: blurred ? 0 : 1, transition: fade, willChange: 'opacity' }}>
        {children(false, drawn)}
      </div>
      {prepared && (
        <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, opacity: blurred ? 1 : 0.001, transition: fade, willChange: 'opacity' }}>
          {children(true, true)}
        </div>
      )}
    </div>
  );
};

export const GraphStream: React.FC<{
  lines: KineticLine[];
  from: number;
  to: number;
  current: number;
  revealed: number;
  palette: Palette;
  seed: number;
}> = ({ lines, from, to, current, revealed, palette, seed }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState({ vw: 0, vh: 0, left: 0, top: 0, fitW: 0, fitH: 0 });
  const reduce = prefersReducedMotion();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setFrame({
        vw: r.width,
        vh: r.height,
        left: 0,
        top: 0,
        fitW: r.width * (1 - 2 * SAFE_X),
        fitH: r.height * (1 - 2 * V_MARGIN),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { vw, vh, fitW, fitH } = frame;
  const ready = vw > 0 && fitW > 0;
  const placed = useMemo(() => (ready ? placeRun(lines, from, to, seed, fitW, fitH) : []), [lines, from, to, seed, fitW, fitH, ready]);
  const k = current - from;
  const cur = placed[k];

  let camX = 0;
  let camY = 0;
  if (cur) {
    camX = vw / 2 - (cur.box.l + cur.box.r) / 2;
    camY = vh / 2 - (cur.box.t + cur.box.b) / 2;
    const bw = cur.box.r - cur.box.l;
    const active = cur.nodes[Math.max(0, Math.min(revealed, cur.nodes.length) - 1)];
    if (active) {
      const slackX = Math.max(0, (fitW * (1 - 2 * SAFE_X) - bw) / 2);
      camX += Math.max(-slackX, Math.min(slackX, (vw / 2 - (camX + active.x)) * 0.3));
    }
  }

  const [ghosts, setGhosts] = useState<number[]>([]);
  const prevK = useRef(k);
  useEffect(() => {
    const was = prevK.current;
    prevK.current = k;
    if (was === k) return;
    setGhosts(g => (k < was ? [] : [...g, was].filter(i => i >= k - 3 && i < k)));
  }, [k]);

  const camRef = useRef<HTMLDivElement>(null);
  const placedOnce = useRef(false);
  const lastLine = useRef(current);
  useEffect(() => {
    const el = camRef.current;
    if (!cur || !el) return;
    const transform = `translate(${camX}px, ${camY}px)`;
    const newLine = lastLine.current !== current;
    lastLine.current = current;
    if (!placedOnce.current || reduce) {
      el.style.transform = transform;
      placedOnce.current = true;
      return;
    }
    const timing = newLine
      ? { type: 'spring' as const, stiffness: 90, damping: 20, mass: 1 }
      : { type: 'spring' as const, stiffness: 30, damping: 12, mass: 1 };
    animateTo(el, { transform }, resolveTiming(timing));
  }, [camX, camY, cur, current, reduce]);

  const [prebuilt, setPrebuilt] = useState(-1);
  useEffect(() => whenIdle(() => startTransition(() => setPrebuilt(k + 1))), [k]);
  const visible = [...ghosts, k, ...(prebuilt === k + 1 ? [k + 1] : [])].filter(i => i >= 0 && i < placed.length);

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {ready && (
        <div ref={camRef} style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0', willChange: 'transform' }}>
          {visible.map(i => (
            <LineLayer key={from + i} age={k - i}>
              {(soft, drawn) => (
                <>
                  <Branches
                    p={placed[i]}
                    prev={placed[i - 1]}
                    shownCount={i > k ? 0 : soft ? Infinity : !drawn ? 0 : i === k ? revealed : Infinity}
                    soft={soft}
                    palette={palette}
                  />
                  <LineWords
                    line={lines[from + i]}
                    index={from + i}
                    p={placed[i]}
                    isCurrent={i === k && !soft}
                    pending={i > k}
                    soft={soft}
                    revealed={drawn && i === k ? revealed : 0}
                    palette={palette}
                  />
                </>
              )}
            </LineLayer>
          ))}
        </div>
      )}
    </div>
  );
};

export const GraphSingle: React.FC<TemplateProps> = ({ line, revealed, palette, seed }) => (
  <GraphStream lines={[line]} from={0} to={0} current={0} revealed={revealed} palette={palette} seed={seed} />
);

export const TEMPLATES = {
  stack: { name: 'Stack', component: Stack },
  slide: { name: 'Slide', component: Slide },
  zoom: { name: 'Zoom', component: Zoom },
  letters: { name: 'Letters', component: Letters },
  scatter: { name: 'Scatter', component: Scatter },
  graph: { name: 'Graph', component: GraphSingle },
  flow: { name: 'Flow', component: Flow },
} as const;

export type TemplateId = keyof typeof TEMPLATES;
export type TemplateChoice = TemplateId | 'auto';

export const isGraph = (t?: TemplateId) => t === 'graph';

export type Scene = {
  template: TemplateId;
  tilt: number;
};

function pick<T>(r: () => number, weighted: [T, number][]): T {
  const total = weighted.reduce((a, [, w]) => a + w, 0);
  let x = r() * total;
  for (const [v, w] of weighted) {
    x -= w;
    if (x <= 0) return v;
  }
  return weighted[0][0];
}

export function chooseScene(line: KineticLine, songSeed: number, forced?: TemplateId): Scene {
  const r = rng(songSeed ^ hashString(line.text));
  const n = line.words.length;
  const wps = n / Math.max(0.5, line.end - line.start);
  const energetic = wps > 2.5;
  const calm = wps < 1.4;
  const chorus = line.repeats >= 3;

  let template: TemplateId;
  if (forced) template = forced;
  else if (n <= 2) template = pick(r, [['zoom', 3], ['letters', 2], ['stack', 1]]);
  else if (n > 11 || wps > 3.8) template = pick(r, [['flow', 3], ['slide', 2]]);
  else if (chorus && n <= 7) {
    template = energetic
      ? pick(r, [['zoom', 2], ['slide', 2], ['letters', 1]])
      : pick(r, [['stack', 2], ['letters', 1], ['zoom', 1]]);
  } else {
    template = pick(r, [
      ['stack', calm ? 3 : 2],
      ['slide', energetic ? 3 : 2],
      ['graph', n <= 8 ? (calm ? 2.5 : 1.5) : 0],
      ['scatter', energetic ? 2 : 1],
      ['zoom', energetic ? 2 : 1],
      ['letters', 1.5],
      ['flow', calm ? 2 : 0.5],
    ]);
  }

  const tilt = isGraph(template) || r() > 0.32 ? 0 : (r() - 0.5) * 7;
  return { template, tilt };
}
