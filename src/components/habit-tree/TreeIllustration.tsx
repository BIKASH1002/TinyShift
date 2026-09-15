import React, { memo, useId } from 'react';

type Point = readonly [number, number];
type Curve = readonly [Point, Point, Point, Point];
function pointOn(curve: Curve, t: number): Point {
  const u = 1 - t;
  return [0, 1].map((axis) =>
    u ** 3 * curve[0][axis] + 3 * u * u * t * curve[1][axis] +
    3 * u * t * t * curve[2][axis] + t ** 3 * curve[3][axis],
  ) as unknown as Point;
}
// A continuous taper around a curved centreline avoids sharp, triangular joins.
function taperedBranch(curve: Curve, width: number) {
  const sides: Point[][] = [[], []];
  for (let step = 0; step <= 32; step++) {
    const t = step / 32;
    const point = pointOn(curve, t);
    const before = pointOn(curve, Math.max(0, t - 0.001));
    const after = pointOn(curve, Math.min(1, t + 0.001));
    const dx = after[0] - before[0], dy = after[1] - before[1];
    const length = Math.hypot(dx, dy) || 1;
    const radius = (0.65 + (width - 0.65) * (1 - t) ** 1.35) / 2;
    sides[0].push([point[0] - dy / length * radius, point[1] + dx / length * radius]);
    sides[1].push([point[0] + dy / length * radius, point[1] - dx / length * radius]);
  }
  return 'M' + [...sides[0], ...sides[1].reverse()]
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L') + 'Z';
}
const leader: Curve = [[236, 402], [223, 309], [250, 208], [237, 104]];
const limbs: Curve[] = [
  leader,
  [pointOn(leader, 0.34), [216, 265], [143, 201], [92, 186]],
  [pointOn(leader, 0.32), [264, 268], [348, 228], [379, 182]],
  [pointOn(leader, 0.59), [218, 188], [172, 143], [136, 147]],
  [pointOn(leader, 0.53), [261, 200], [298, 137], [330, 133]],
];
// Keep every existing leaf attachment point, including saved browser positions.
const twigs: readonly (readonly [number, number, Point, Point])[] = [
  [1, .63, [145, 197], [155, 172]],
  [4, .65, [296, 178], [313, 164]],
  [3, .40, [197, 156], [204, 133]],
  [0, .82, [267, 146], [279, 118]],
  [1, .81, [126, 209], [115, 205]],
  [2, .75, [342, 197], [356, 199]],
  [3, .73, [165, 146], [171, 126]],
  [4, .75, [305, 129], [305, 108]],
  [0, .72, [242, 178], [240, 164]],
  [1, .37, [196, 220], [190, 199]],
  [2, .35, [279, 223], [294, 210]],
  [0, .83, [215, 131], [212, 96]],
  [0, .89, [261, 115], [261, 90]],
  [1, .47, [167, 244], [150, 231]],
  [2, .48, [310, 261], [335, 240]],
  [3, .56, [181, 171], [181, 159]],
  [4, .42, [276, 178], [284, 154]],
  [0, .54, [221, 228], [220, 208]],
  [2, .20, [265, 243], [267, 226]],
  [1, .59, [142, 244], [112, 242]],
  [2, .65, [348, 242], [369, 234]],
  [1, .18, [210, 241], [192, 245]],
  [2, .32, [293, 269], [311, 267]],
];
const branchPaths = [
  ...limbs.map((curve, index) => taperedBranch(curve, [20, 10, 10, 6, 7][index])),
  ...twigs.map(([parent, t, control, tip]) => {
    const start = pointOn(limbs[parent], t);
    const forward = pointOn(limbs[parent], Math.min(1, t + .1));
    return taperedBranch([start, forward, control, tip], parent === 0 ? 3 : 2.6);
  }),
];

// Shared opaque pigment makes overlapping branch roots read as one surface.
// Painted vector layers: no raster downloads, texture filters or animation loop.
export const TreeIllustration = memo(function TreeIllustration() {
  const id = useId();
  const bark = id + '-bark';
  const branch = id + '-branch';
  const ground = id + '-ground';
  return (
    <g aria-hidden="true">
      <defs>
        <linearGradient
          id={bark}
          gradientUnits="userSpaceOnUse"
          x1="100"
          y1="100"
          x2="330"
          y2="410"
        >
          <stop offset="0" stopColor="#cda675" />
          <stop offset=".4" stopColor="#bd925e" />
          <stop offset=".72" stopColor="#ac804e" />
          <stop offset="1" stopColor="#936b43" />
        </linearGradient>
        {/* One coordinate space keeps every overlapping join the same colour. */}
        <linearGradient id={branch} href={`#${bark}`} />
        <radialGradient id={ground}>
          <stop stopColor="#b4b880" stopOpacity=".6" />
          <stop offset=".7" stopColor="#c5c990" stopOpacity=".3" />
          <stop offset="1" stopColor="#d6d7aa" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="242" cy="405" rx="112" ry="20" fill={`url(#${ground})`} />
      <path
        d="M153 405 Q179 400 202 403 L215 396 266 396 284 403 Q314 400 332 406 Q284 413 236 410 Q192 414 153 405Z"
        fill="#b5b880"
        opacity=".28"
      />
      <g fill={`url(#${branch})`}>
        {branchPaths.map((d, index) => <path key={index} d={d} />)}
      </g>
      <path
        d="M203 403 C221 388 224 368 224 343 C224 323 232 304 234 282 C236 262 232 238 235 216 C237 240 244 259 246 280 C247 304 241 324 244 345 C246 370 248 387 270 403 L252 399 242 403 229 397 217 403Z"
        fill={`url(#${bark})`}
      />
      <g fill="none" strokeLinecap="round">
        <path
          d="M216 395 Q232 367 230 340 T240 287 M244 396 Q236 370 240 347 M252 394 Q244 381 245 361"
          stroke="#ead19b"
          strokeWidth="1.5"
          opacity=".38"
        />
        <path
          d="M227 390 Q236 369 233 350 T238 311 M239 394 Q230 381 233 369 M245 336 Q237 318 242 298 M235 302 Q239 279 237 261"
          stroke="#775035"
          strokeWidth="1.15"
          opacity=".3"
        />
        <path
          d="M231 384 L235 366 M231 357 L235 343 M238 339 L241 326 M234 321 L238 306 M240 291 L241 280 M247 384 L243 375"
          stroke="#f0cf89"
          strokeWidth=".8"
          opacity=".4"
        />
        <path
          d="M235 357 C224 349 230 340 234 341 C240 342 237 353 235 357 M234 352 Q230 348 234 345"
          stroke="#88603a"
          strokeWidth="1"
          opacity=".4"
        />
      </g>
      <g fill="#899955" opacity=".78">
        <path d="M205 404 Q203 386 190 379 Q200 394 200 405Z M210 404 Q213 386 221 382 Q213 396 214 404Z M191 407 Q184 393 172 391 Q184 401 187 407Z M268 403 Q272 381 282 376 Q275 391 273 405Z M277 406 Q287 388 299 387 Q286 397 283 407Z" />
        <path
          d="M191 406 Q188 390 186 386 L196 405Z M217 403 Q218 392 212 385 L212 404Z M285 407 Q296 396 310 399 Q295 401 290 408Z M171 407 Q180 399 188 402 L182 408Z"
          fill="#b1b975"
        />
      </g>
      <g fill="#a5a773" opacity=".48">
        <ellipse cx="174" cy="410" rx="3" ry="1" />
        <ellipse cx="195" cy="411" rx="2" ry="1.2" />
        <ellipse cx="288" cy="411" rx="4" ry="1" />
        <ellipse cx="310" cy="406" rx="2" ry="1" />
        <ellipse cx="220" cy="410" rx="3" ry=".8" />
        <ellipse cx="257" cy="413" rx="2" ry="1" />
      </g>
    </g>
  );
});
