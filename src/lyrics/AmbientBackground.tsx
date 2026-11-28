import React, { useEffect, useRef, useState } from 'react';
import { Palette } from './palette';
import { parseColor } from './shared';

const MAX_RIPPLES = 8;

const VERT = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uBase;
uniform vec4 uRip[${MAX_RIPPLES}];
uniform float uLineT;
uniform sampler2D uArt;
uniform float uArtAmt;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.55;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 1.9 + vec2(1.7, 9.2); a *= 0.45; }
  return v / 0.88;
}

vec3 lightField(vec2 p, float t) {
  vec2 s = p * 0.62;
  vec2 q = vec2(fbm(s + vec2(0.0, t * 0.035)), fbm(s + vec2(5.2, -t * 0.03)));
  vec2 r = vec2(fbm(s + 1.6 * q + vec2(1.7, 9.2) + t * 0.022), fbm(s + 1.6 * q + vec2(8.3, 2.8) - t * 0.026));
  float f = fbm(s * 0.9 + 1.4 * r);
  float w0 = smoothstep(0.42, 0.82, f);
  float w1 = smoothstep(0.5, 0.88, r.x) * (1.0 - w0 * 0.6);
  float w2 = smoothstep(0.55, 0.92, q.y) * (1.0 - max(w0, w1) * 0.6);
  vec3 col = uBase * 0.7 + uC0 * w0 * 0.95 + uC1 * w1 * 0.8 + uC2 * w2 * 0.65;
  vec3 art = texture2D(uArt, vec2(0.5) + p * 0.3 + (r - 0.5) * 0.2, 5.0).rgb;
  col += art * uArtAmt * 0.1;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  return max(mix(vec3(lum), col, 1.45), 0.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  float t = uTime;

  vec2 slope = vec2(
    sin(p.y * 2.3 + t * 0.21) + 0.6 * sin(p.x * 1.7 - p.y * 1.3 + t * 0.17),
    cos(p.x * 2.1 - t * 0.19) + 0.6 * cos(p.y * 1.9 + p.x * 0.8 - t * 0.23)) * 0.012;

  float ring = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec4 rp = uRip[i];
    float age = t - rp.z;
    if (rp.w <= 0.0 || age < 0.0 || age > 3.5) continue;
    vec2 c = vec2((rp.x - 0.5) * aspect, (1.0 - rp.y) - 0.5);
    vec2 d = p - c;
    float dist = length(d);
    float x = dist - age * 0.32;
    float env = exp(-x * x * 90.0) * exp(-age * 1.25) * rp.w;
    slope += (d / max(dist, 0.001)) * sin(x * 55.0) * env * 0.035;
    ring += env;
  }

  float lineAge = t - uLineT;
  float sweep = 0.0;
  if (lineAge > 0.0 && lineAge < 2.2) {
    float s = (p.x * 0.7 + p.y * 0.45) - (lineAge * 1.5 - 1.2);
    sweep = exp(-s * s * 16.0) * (1.0 - lineAge / 2.2);
    slope += vec2(0.7, 0.45) * sweep * 0.02;
  }

  vec3 col = lightField(p + slope * 6.0, t);
  col += vec3(slope.x, 0.3 * (slope.y - slope.x), -slope.y) * 1.6;

  vec3 n = normalize(vec3(-slope * 14.0, 1.0));
  vec3 L = normalize(vec3(-0.45, 0.55, 0.7));
  float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 40.0);
  col += spec * 0.2 + ring * 0.05 + sweep * 0.1;

  col += smoothstep(0.012, 0.0, 1.0 - uv.y) * 0.18 + (smoothstep(0.006, 0.0, uv.x) + smoothstep(0.006, 0.0, 1.0 - uv.x)) * 0.05;
  col *= mix(0.4, 1.0, smoothstep(1.2, 0.3, length(p * vec2(0.85, 1.1))));

  col = col / (1.0 + col * 0.7);
  col = pow(col, vec3(1.18)) * 0.95;
  col += (hash(gl_FragCoord.xy + fract(t) * 100.0) - 0.5) * 0.018;
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader error');
  return s;
}

const toVec3 = (c: string) => parseColor(c).slice(0, 3).map(v => v / 255);
const withAlpha = (c: string, a: number) => {
  const [r, g, b] = parseColor(c);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
};

const MIN_FRAME_MS = 1000 / 60 - 2;

/**
 * WebGL Liquid Glass background from LyricalStudio (MIT): album-art light pools,
 * slow glass undulation, and ripples triggered by each sung word (`ls:word`).
 */
export const AmbientBackground: React.FC<{ palette: Palette; artwork?: string | null }> = ({ palette, artwork }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const target = useRef({ colors: [...palette.accents, palette.base].map(toVec3) });
  const artRef = useRef<{ url?: string; image?: HTMLCanvasElement; version: number }>({ version: 0 });

  useEffect(() => {
    target.current.colors = [...palette.accents, palette.base].map(toVec3);
  }, [palette]);

  useEffect(() => {
    if (!artwork) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = artwork;
    img
      .decode()
      .then(() => {
        if (cancelled) return;
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        c.getContext('2d')?.drawImage(img, 0, 0, 128, 128);
        artRef.current = { url: artwork, image: c, version: artRef.current.version + 1 };
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [artwork]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      setFailed(true);
      return;
    }

    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link error');
    } catch {
      setFailed(true);
      return;
    }
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uRes = u('uRes');
    const uTime = u('uTime');
    const uCols = [u('uC0'), u('uC1'), u('uC2'), u('uBase')];
    const uRip = u('uRip');
    const uLineT = u('uLineT');
    const uArtAmt = u('uArtAmt');

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([20, 20, 30]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(u('uArt'), 0);

    let artVersion = 0;
    let artAmt = 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const speed = reduce ? 0.25 : 1;
    let scale = 0.5;

    const resize = () => {
      canvas.width = Math.max(2, Math.floor(window.innerWidth * scale));
      canvas.height = Math.max(2, Math.floor(window.innerHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const ripples = new Float32Array(MAX_RIPPLES * 4);
    let next = 0;
    let lineT = -10;
    const start = performance.now();
    const now = () => ((performance.now() - start) / 1000) * speed;

    const onWord = (e: Event) => {
      if (reduce) return;
      const d = (e as CustomEvent<{ x?: number; y?: number; strength?: number; newLine?: boolean }>).detail ?? {};
      const i = next++ % MAX_RIPPLES;
      ripples.set([d.x ?? 0.5, d.y ?? 0.5, now(), d.strength ?? 1], i * 4);
      if (d.newLine) lineT = now();
    };
    window.addEventListener('ls:word', onWord);

    const colors = target.current.colors.map(c => [...c]);
    let raf = 0;
    let last = 0;
    let slowFrames = 0;
    let frames = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const t = performance.now();
      if (t - last < MIN_FRAME_MS) return;
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;

      frames++;
      if (dt > 0.024) slowFrames++;
      if (frames >= 90) {
        if (slowFrames > 30 && scale > 0.28) {
          scale = Math.max(0.28, scale * 0.8);
          resize();
        }
        frames = slowFrames = 0;
      }

      const k = Math.min(1, dt * 1.6);
      colors.forEach((c, ci) => c.forEach((v, j) => (c[j] = v + (target.current.colors[ci][j] - v) * k)));
      colors.forEach((c, ci) => gl.uniform3f(uCols[ci], c[0], c[1], c[2]));

      const art = artRef.current;
      if (art.version !== artVersion && art.image) {
        artVersion = art.version;
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, art.image);
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          artAmt = 0;
        } catch {
          // Ignore tainted canvas mipmap upload
        }
      }
      artAmt = Math.min(1, artAmt + dt * (art.image ? 0.8 : 0));

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, now());
      gl.uniform4fv(uRip, ripples);
      gl.uniform1f(uLineT, lineT);
      gl.uniform1f(uArtAmt, artAmt);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(frame);

    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      setFailed(true);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('ls:word', onWord);
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.deleteProgram(program);
      gl.deleteBuffer(buf);
      gl.deleteTexture(tex);
    };
  }, []);

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: palette.base, zIndex: 0 }}>
      {failed ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(60% 70% at 25% 30%, ${withAlpha(palette.accents[0], 0.35)}, transparent 70%), radial-gradient(60% 70% at 75% 70%, ${withAlpha(palette.accents[1], 0.35)}, transparent 70%), ${palette.base}`,
          }}
        />
      ) : (
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
      )}
    </div>
  );
};
