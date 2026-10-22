/**
 * Builder Island — Minimalist 3D Practice Playground Controller (Stages 1–4)
 * Supports Stage 1 (8 single-action steps) and Stage 2 (8 challenge steps: move, hold-to-turn rotate,
 * 360° directional markers, and multi-block combinations).
 */

import {
  WORKPLANE,
  CAMERA_PRESETS,
  TOTAL_STEPS,
  getStageConfig,
  getStepConfig,
  getStepBoxesAndTargets,
  getBoxVertices,
  createStepState,
  evaluateStepMatch,
  selectBoxInState,
  updateBoxInState,
  setCameraInState,
  clamp,
  TURN_AXES,
  rotateVector,
  orientedPoint
} from './model.js';

import { createStorageManager } from './storage.js';

const storageManager = createStorageManager({
  searchString: typeof window !== 'undefined' ? window.location.search : ''
});

const requestedStage = Number(new URLSearchParams(window.location.search).get('stage'));
let appState = storageManager.loadProgress([1,2,3,4].includes(requestedStage) ? requestedStage : null);
let pointerSession = null;

const dom = {
  btnStage1: document.getElementById('btn-stage-1'),
  btnStage2: document.getElementById('btn-stage-2'),
  btnStage3: document.getElementById('btn-stage-3'),
  currentStageName: document.getElementById('current-stage-name'),
  stepProgress: document.getElementById('step-progress'),
  stepInstruction: document.getElementById('step-instruction'),
  storageWarningBanner: document.getElementById('storage-warning-banner'),
  workspaceSvg: document.getElementById('workspace-3d'),
  targetMiniSvg: document.getElementById('target-mini-svg'),
  hintToast: document.getElementById('hint-toast'),
  btnPrev: document.getElementById('btn-prev'),
  btnReset: document.getElementById('btn-reset'),
  btnHint: document.getElementById('btn-hint'),
  btnNext: document.getElementById('btn-next'),
  btnOpenInfo: document.getElementById('btn-open-info'),
  btnCloseInfo: document.getElementById('btn-close-info'),
  modalInfo: document.getElementById('modal-info'),
  modalStages: document.getElementById('modal-stages'),
  btnCloseStages: document.getElementById('btn-close-stages'),
  cardSelectStage1: document.getElementById('card-select-stage-1'),
  cardSelectStage2: document.getElementById('card-select-stage-2'),
  stage1ProgressSummary: document.getElementById('stage-1-progress-summary'),
  stage2ProgressSummary: document.getElementById('stage-2-progress-summary'),
  modalComplete: document.getElementById('modal-complete'),
  modalCompleteTitle: document.getElementById('modal-complete-title'),
  modalCompleteDesc: document.getElementById('modal-complete-desc'),
  skillsReviewGrid: document.getElementById('skills-review-grid'),
  btnCloseComplete: document.getElementById('btn-close-complete'),
  btnStageSelect: document.getElementById('btn-stage-select'),
  btnChangeDesign: document.getElementById('btn-change-design'),
  btnReplayAll: document.getElementById('btn-replay-all'),
  viewBtns: Array.from(document.querySelectorAll('.cube-face-btn'))
};

const BLOCK_COLOR_THEMES = {
  matched: {
    top: '#4ade80',
    front: '#22c55e',
    right: '#16a34a',
    left: '#15803d',
    back: '#166534',
    bottom: '#14532d',
    stroke: '#14532d',
    badgeBg: '#16a34a'
  },
  coral: {
    top: '#f87171',
    front: '#ef4444',
    right: '#dc2626',
    left: '#b91c1c',
    back: '#991b1b',
    bottom: '#7f1d1d',
    stroke: '#7f1d1d',
    badgeBg: '#dc2626'
  },
  cobalt: {
    top: '#60a5fa',
    front: '#3b82f6',
    right: '#2563eb',
    left: '#1d4ed8',
    back: '#1e40af',
    bottom: '#1e3a8a',
    stroke: '#1e3a8a',
    badgeBg: '#2563eb'
  },
  amber: {
    top: '#c084fc',
    front: '#a855f7',
    right: '#9333ea',
    left: '#7e22ce',
    back: '#6b21a8',
    bottom: '#581c87',
    stroke: '#581c87',
    badgeBg: '#7e22ce'
  }
};

const TARGET_THEME_STROKES = {
  coral: { stroke: '#16a34a', fill: 'rgba(34, 197, 94, 0.13)', matchedFill: 'rgba(34, 197, 94, 0.26)' },
  cobalt: { stroke: '#0284c7', fill: 'rgba(56, 189, 248, 0.15)', matchedFill: 'rgba(34, 197, 94, 0.26)' },
  amber: { stroke: '#7e22ce', fill: 'rgba(168, 85, 247, 0.14)', matchedFill: 'rgba(34, 197, 94, 0.26)' }
};

/**
 * Projects a 3D point (wx, wy, wz) onto 2D SVG coordinates based on camera yaw & pitch.
 */
function projectPoint(wx, wy, wz, cam, cx = 500, cy = 340, scale = 5.6) {
  const dx = wx - WORKPLANE.width / 2;
  const dy = wy - WORKPLANE.depth / 2;
  const dz = wz;

  const yawRad = (cam.yaw * Math.PI) / 180;
  const pitchRad = (cam.pitch * Math.PI) / 180;

  const rx = dx * Math.cos(yawRad) - dy * Math.sin(yawRad);
  const ry = dx * Math.sin(yawRad) + dy * Math.cos(yawRad);

  const screenX = cx + rx * scale;
  const screenY = cy + ry * Math.sin(pitchRad) * scale - dz * Math.cos(pitchRad) * scale;
  const depth = ry * Math.cos(pitchRad) + dz * Math.sin(pitchRad);

  return { x: screenX, y: screenY, depth };
}

/**
 * Builds SVG markup for a 3D directional marker (end stripe + direction arrow on top face)
 * using the exact 3D vertices from `getBoxVertices(box).directionMarker`.
 */
function buildDirectionMarkerSvg(v, cam, cx, cy, scale, isTarget = false) {
  if (!v.directionMarker) return '';
  const bandPts = v.directionMarker.band
    .map((p) => projectPoint(p.x, p.y, p.z, cam, cx, cy, scale))
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  const arrowPts = v.directionMarker.arrow
    .map((p) => projectPoint(p.x, p.y, p.z, cam, cx, cy, scale))
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  if (isTarget) {
    return `
      <polygon class="target-dir-band" points="${bandPts}" fill="rgba(250, 204, 21, 0.45)" stroke="#ca8a04" stroke-width="1.8" pointer-events="none" />
      <polygon class="target-dir-arrow" points="${arrowPts}" fill="rgba(234, 179, 8, 0.85)" stroke="#713f12" stroke-width="1.8" stroke-linejoin="round" pointer-events="none" />
    `;
  }

  return `
    <polygon class="box-dir-band" points="${bandPts}" fill="#fde047" stroke="#0f172a" stroke-width="1.6" pointer-events="none" />
    <polygon class="box-dir-arrow" points="${arrowPts}" fill="#0f172a" stroke="#fef08a" stroke-width="1.4" stroke-linejoin="round" pointer-events="none" />
  `;
}

// Stage 4 face marks are geometry on their own faces, never screen-space stickers.
function buildOrientedFaces(box, cam, cx, cy, scale, options) {
  const hx=box.length/2, hy=box.width/2, hz=box.height/2;
  const localFaces = [
    {id:'top', normal:[0,0,1], map:(u,v)=>[u*hx,v*hy,hz]},
    {id:'bottom', normal:[0,0,-1], map:(u,v)=>[u*hx,v*hy,-hz]},
    {id:'front', normal:[0,1,0], map:(u,v)=>[u*hx,hy,v*hz]},
    {id:'back', normal:[0,-1,0], map:(u,v)=>[u*hx,-hy,v*hz]},
    {id:'right', normal:[1,0,0], map:(u,v)=>[hx,u*hy,v*hz]},
    {id:'left', normal:[-1,0,0], map:(u,v)=>[-hx,u*hy,v*hz]}
  ];
  const yaw=cam.yaw*Math.PI/180, pitch=cam.pitch*Math.PI/180;
  const towardCamera=[Math.sin(yaw)*Math.cos(pitch),Math.cos(yaw)*Math.cos(pitch),Math.sin(pitch)];
  const points = (face, shape) => shape.map(([u,v])=>{
    const p=orientedPoint(box,face.map(u,v));
    return projectPoint(p.x,p.y,p.z,cam,cx,cy,scale);
  });
  const polygon = vertices => vertices.map(p=>`${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const star = Array.from({length:10},(_,i)=>{
    const a=-Math.PI/2+i*Math.PI/5, r=i%2?0.25:0.63;
    return [Math.cos(a)*r,Math.sin(a)*r];
  });
  const marks = {
    top:star,
    front:[[-.18,-.62],[.18,-.62],[.18,.05],[.55,.05],[0,.68],[-.55,.05],[-.18,.05]],
    right:[[0,.68],[.58,0],[0,-.68],[-.58,0]],
    back:[[-.6,-.2],[.6,-.2],[.6,.2],[-.6,.2]],
    left:[[-.6,-.55],[-.2,-.55],[-.2,.55],[-.6,.55]],
    bottom:Array.from({length:16},(_,i)=>[Math.cos(i*Math.PI/8)*.5,Math.sin(i*Math.PI/8)*.5])
  };
  return localFaces.filter(face=>{
    const normal=rotateVector(box.orientation,face.normal);
    return normal.reduce((sum,n,i)=>sum+n*towardCamera[i],0)>0.00001;
  }).map(face=>{
    const vertices=points(face,[[-1,-1],[1,-1],[1,1],[-1,1]]);
    return {...face,vertices,depth:vertices.reduce((sum,p)=>sum+p.depth,0)/4};
  }).sort((a,b)=>a.depth-b.depth).map(face=>{
    const fill=options.isTarget?'rgba(34,197,94,.12)':(options.faceColors?.[face.id] || '#ef4444');
    return `<g data-face="${face.id}" class="oriented-face">
      <polygon class="oriented-surface" points="${polygon(face.vertices)}" fill="${fill}" stroke="${options.isTarget?'#15803d':options.stroke}" stroke-width="${options.strokeWidth || 2}" ${options.isTarget?'stroke-dasharray="6 4"':''} />
      <polygon class="face-mark face-mark-${face.id}" points="${polygon(points(face,marks[face.id]))}" fill="${options.isTarget?'#dcfce7':'#fff7ed'}" stroke="${options.isTarget?'#166534':'#0f172a'}" stroke-width="${scale>2?2:1}" stroke-linejoin="round" />
    </g>`;
  }).join('');
}

// Handle positions follow the projected center/bounds; the reference axes remain WORLD axes.
function buildTurnHandles(box, target, cam, cx, cy, scale) {
  const cfg=getStepConfig(appState.currentStep,4);
  const screen=dom.workspaceSvg.getScreenCTM()?.a || 1;
  const v=getBoxVertices(box), t=getBoxVertices(target);
  const center=projectPoint(v.cx,v.cy,box.z+box.height/2,cam,cx,cy,scale);
  const bounds=[...v.corners,...t.corners].map(p=>projectPoint(p.x,p.y,p.z,cam,cx,cy,scale));
  const radius=Math.max(...bounds.map(p=>Math.abs(p.x-center.x)))+62/screen;
  const positions={
    spin:{x:center.x,y:Math.max(...bounds.map(p=>p.y))+54/screen},
    'tip-forward':{x:center.x-radius,y:center.y+8/screen},
    'tip-side':{x:center.x+radius,y:center.y+8/screen}
  };
  const active=TURN_AXES[pointerSession?.action] ? pointerSession.action : null;
  let guide='';
  if(active){
    const axis=TURN_AXES[active].axis;
    const axisIndex={x:0,y:1,z:2}[axis];
    const worldCenter=[v.cx,v.cy,box.z+box.height/2];
    const project = local => projectPoint(...local.map((n,i)=>n+worldCenter[i]),cam,cx,cy,scale);
    const a=[0,0,0], b=[0,0,0];a[axisIndex]=-34;b[axisIndex]=34;
    const p=project(a),q=project(b);
    const ring=Array.from({length:65},(_,i)=>{
      const local=[0,0,0], rest=[0,1,2].filter(n=>n!==axisIndex);
      local[rest[0]]=28*Math.cos(i*Math.PI/32);local[rest[1]]=28*Math.sin(i*Math.PI/32);
      const r=project(local);return `${r.x},${r.y}`;
    }).join(' ');
    guide=`<g id="turn-axis-guide" data-world-axis="${axis}" pointer-events="none">
      <polyline points="${ring}" fill="none" stroke="${TURN_AXES[active].color}" stroke-width="${2/screen}" stroke-dasharray="6 5" opacity=".7" />
      <line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${TURN_AXES[active].color}" stroke-width="${3/screen}" />
      <text x="${window.innerWidth<600?140:20}" y="600" font-size="${13/screen}" fill="#0f172a">${TURN_AXES[active].label} · fixed ${axis.toUpperCase()} axis</text>
    </g>`;
  }
  const controls=cfg.allowedActions.map(action=>{
    const meta=TURN_AXES[action],p=positions[action];
    return `<g class="turn-handle handle-node ${active===action?'active-turn':''}" data-action="${action}" data-world-axis="${meta.axis}" role="img" aria-label="${meta.label}: hold and drag" transform="translate(${p.x},${p.y}) scale(${1/screen})" opacity="${active && active!==action?'.3':'1'}" style="cursor:grab">
      <rect x="-58" y="-24" width="116" height="74" rx="12" fill="transparent" />
      <circle r="22" fill="${active===action?'#fef08a':'#fff'}" stroke="${meta.color}" stroke-width="${active===action?4:2.5}" />
      <path d="M -11 8 A 14 14 0 1 1 12 4" fill="none" stroke="#0f172a" stroke-width="3" />
      <path d="M 6 2 L 13 9 L 18 -1 Z" fill="#0f172a" />
      <text x="0" y="38" text-anchor="middle" font-size="11" font-weight="800" fill="#0f172a">${meta.label}</text>
      <text x="0" y="49" text-anchor="middle" font-size="10" fill="#334155">${meta.drag==='vertical'?'Drag ↕':'Drag ↔'} · ${meta.axis.toUpperCase()}</text>
    </g>`;
  }).join('');
  return guide+controls;
}

/**
 * Renders a 3D box (either solid interactive block or translucent target ghost outline)
 * using the exact shared `getBoxVertices(box)` coordinate basis from `src/model.js`.
 */
function buildBoxSvgFaces(box, cam, cx, cy, scale, styleOptions) {
  if (box.orientation) return buildOrientedFaces(box, cam, cx, cy, scale, styleOptions);
  const v = getBoxVertices(box);
  const { corners } = v;
  const pts = corners.map((c) => projectPoint(c.x, c.y, c.z, cam, cx, cy, scale));

  const faces = [
    { id: 'bottom', indices: [0, 1, 2, 3] },
    { id: 'back', indices: [0, 1, 5, 4] },
    { id: 'left', indices: [0, 3, 7, 4] },
    { id: 'right', indices: [1, 2, 6, 5] },
    { id: 'front', indices: [3, 2, 6, 7] },
    { id: 'top', indices: [4, 5, 6, 7] }
  ];

  faces.forEach((f) => {
    f.avgDepth = f.indices.reduce((sum, idx) => sum + pts[idx].depth, 0) / 4;
  });
  faces.sort((a, b) => a.avgDepth - b.avgDepth);

  const facesHtml = faces
    .map((f) => {
      const polyPoints = f.indices.map((i) => `${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`).join(' ');
      if (styleOptions.isTarget) {
        return `<polygon points="${polyPoints}" fill="${styleOptions.fill}" stroke="${styleOptions.stroke}" stroke-width="${styleOptions.strokeWidth}" stroke-dasharray="${styleOptions.dashArray || '6 4'}" />`;
      }
      const faceColor = styleOptions.faceColors?.[f.id] || styleOptions.fill;
      return `<polygon points="${polyPoints}" fill="${faceColor}" fill-opacity="${styleOptions.opacity ?? 0.94}" stroke="${styleOptions.stroke}" stroke-width="${styleOptions.strokeWidth}" stroke-linejoin="round" />`;
    })
    .join('');

  const dirMarkerHtml = box.hasDirectionMarker
    ? buildDirectionMarkerSvg(v, cam, cx, cy, scale, Boolean(styleOptions.isTarget))
    : '';

  return facesHtml + dirMarkerHtml;
}

/**
 * Renders only the handle(s) relevant to the current step/block's allowed actions.
 */
// The lowest projected bottom vertex is the visible outside corner.
function getScaleCornerProjection(vertices, camera, cx, cy, scale) {
  return vertices.corners.slice(0, 4)
    .map(corner => projectPoint(corner.x, corner.y, corner.z, camera, cx, cy, scale))
    .sort((a, b) => b.y - a.y || b.x - a.x)[0];
}

function buildRelevantHandleMarkup(allowedActionsInput, v, cam, cx, cy, scale, hintActive) {
  const isSizeStage = appState.currentStage === 3;
  const screenScale = dom.workspaceSvg.getScreenCTM()?.a || 1;
  const hitSize = Math.max(30, 44 / screenScale);
  const hSize = isSizeStage ? hitSize : 18;
  const pulseRing = (pt) =>
    `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="24" fill="none" stroke="#f59e0b" stroke-width="4" stroke-dasharray="5 3" pointer-events="none" />`;

  const actions = Array.isArray(allowedActionsInput) ? allowedActionsInput : [allowedActionsInput];
  const showAll = actions.includes('all');
  const parts = [];
  if (actions.includes('scale')) {
    const pt = getScaleCornerProjection(v, cam, cx, cy, scale);
    parts.push(`<g class="handle-node" data-action="scale" transform="translate(${pt.x},${pt.y})" style="cursor:nwse-resize">
      <rect x="${-hitSize/2}" y="${-hitSize/2}" width="${hitSize}" height="${hitSize}" fill="transparent" />
      <rect x="-13" y="-13" width="26" height="26" fill="white" stroke="#0f172a" stroke-width="3" pointer-events="none" />
    </g>`);
    if (hintActive) parts.push(pulseRing(pt));
  }

  if (actions.includes('move') && hintActive) {
    const centerPt = projectPoint((v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2, (v.z0 + v.z1) / 2, cam, cx, cy, scale);
    parts.push(pulseRing(centerPt));
  }

  if (showAll || actions.includes('length')) {
    const rightMid = projectPoint(v.x1, (v.y0 + v.y1) / 2, v.z0, cam, cx, cy, scale);
    const rightAnchor = { ...rightMid };
    if (isSizeStage) {
      const ux = Math.cos(cam.yaw*Math.PI/180), uy = Math.sin(cam.yaw*Math.PI/180)*Math.sin(cam.pitch*Math.PI/180);
      const offset = 32 / screenScale / Math.hypot(ux,uy);
      rightMid.x += offset*ux; rightMid.y += offset*uy;
      parts.push(`<line x1="${rightAnchor.x}" y1="${rightAnchor.y}" x2="${rightMid.x}" y2="${rightMid.y}" stroke="#334155" stroke-width="2" pointer-events="none" />`);
    }
    parts.push(`
      ${hintActive && !showAll ? pulseRing(rightMid) : ''}
      <rect
        class="handle-node"
        data-action="length"
        x="${(rightMid.x - hSize / 2).toFixed(1)}"
        y="${(rightMid.y - hSize / 2).toFixed(1)}"
        width="${hSize}"
        height="${hSize}"
        rx="4"
        fill="${isSizeStage ? '#0f172a' : '#ffffff'}"
        stroke="${isSizeStage ? '#ffffff' : '#0f172a'}"
        stroke-width="3"
        style="cursor: ew-resize;"
      />
    `);
  }

  if (showAll || actions.includes('width')) {
    const frontMid = projectPoint((v.x0 + v.x1) / 2, v.y1, v.z0, cam, cx, cy, scale);
    const frontAnchor = { ...frontMid };
    if (isSizeStage) {
      const vx = -Math.sin(cam.yaw*Math.PI/180), vy = Math.cos(cam.yaw*Math.PI/180)*Math.sin(cam.pitch*Math.PI/180);
      const offset = 32 / screenScale / Math.hypot(vx,vy);
      frontMid.x += offset*vx; frontMid.y += offset*vy;
      parts.push(`<line x1="${frontAnchor.x}" y1="${frontAnchor.y}" x2="${frontMid.x}" y2="${frontMid.y}" stroke="#334155" stroke-width="2" pointer-events="none" />`);
    }
    parts.push(`
      ${hintActive && !showAll ? pulseRing(frontMid) : ''}
      <rect
        class="handle-node"
        data-action="width"
        x="${(frontMid.x - hSize / 2).toFixed(1)}"
        y="${(frontMid.y - hSize / 2).toFixed(1)}"
        width="${hSize}"
        height="${hSize}"
        rx="4"
        fill="${isSizeStage ? '#0f172a' : '#ffffff'}"
        stroke="${isSizeStage ? '#ffffff' : '#0f172a'}"
        stroke-width="3"
        style="cursor: ns-resize;"
      />
    `);
  }

  if (showAll || actions.includes('height')) {
    const topCenter = projectPoint((v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2, v.z1, cam, cx, cy, scale);
    parts.push(`
      ${hintActive && !showAll ? pulseRing(topCenter) : ''}
      <rect
        class="handle-node"
        data-action="height"
        x="${(topCenter.x - hSize / 2).toFixed(1)}"
        y="${(topCenter.y - hSize / 2).toFixed(1)}"
        width="${hSize}"
        height="${hSize}"
        rx="4"
        fill="#ffffff"
        stroke="#2563eb"
        stroke-width="3"
        style="cursor: ns-resize;"
      />
    `);
  }

  if (showAll || actions.includes('lift')) {
    const topCenter = projectPoint((v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2, v.z1, cam, cx, cy, scale);
    const liftConePt = projectPoint((v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2, v.z1 + (isSizeStage ? 8 : 12), cam, cx, cy, scale);
    parts.push(`
      ${hintActive && !showAll ? pulseRing(liftConePt) : ''}
      <line
        x1="${topCenter.x.toFixed(1)}"
        y1="${topCenter.y.toFixed(1)}"
        x2="${liftConePt.x.toFixed(1)}"
        y2="${liftConePt.y.toFixed(1)}"
        stroke="#0f172a"
        stroke-width="2.5"
        pointer-events="none"
      />
      ${isSizeStage ? `<g class="handle-node" data-action="lift"><rect x="${liftConePt.x-hitSize/2}" y="${liftConePt.y-4-hitSize/2}" width="${hitSize}" height="${hitSize}" fill="transparent" />` : ''}
      <polygon
        class="handle-node"
        data-action="lift"
        points="${liftConePt.x.toFixed(1)},${(liftConePt.y - 14).toFixed(1)} ${(liftConePt.x - 11).toFixed(1)},${(liftConePt.y + 6).toFixed(1)} ${(liftConePt.x + 11).toFixed(1)},${(liftConePt.y + 6).toFixed(1)}"
        fill="#0f172a"
        stroke="#ffffff"
        stroke-width="2"
        style="cursor: ns-resize;"
      />
      ${isSizeStage ? '</g>' : ''}
    `);
  }

  if (showAll || actions.includes('rotate')) {
    const c2 = v.corners[2];
    const dirX = c2.x - v.cx;
    const dirY = c2.y - v.cy;
    const len = Math.hypot(dirX, dirY) || 1;
    const hx = c2.x + (dirX / len) * 12;
    const hy = c2.y + (dirY / len) * 12;
    const rotateHandlePt = projectPoint(hx, hy, v.z0, cam, cx, cy, scale);
    const centerPt = projectPoint(v.cx, v.cy, v.z0, cam, cx, cy, scale);
    parts.push(`
      <line
        x1="${centerPt.x.toFixed(1)}"
        y1="${centerPt.y.toFixed(1)}"
        x2="${rotateHandlePt.x.toFixed(1)}"
        y2="${rotateHandlePt.y.toFixed(1)}"
        stroke="#ca8a04"
        stroke-width="2"
        stroke-dasharray="4 4"
        pointer-events="none"
      />
      ${hintActive && !showAll ? pulseRing(rotateHandlePt) : ''}
      <g class="handle-node" data-action="rotate" transform="translate(${rotateHandlePt.x.toFixed(1)}, ${rotateHandlePt.y.toFixed(1)})" style="cursor: grab;">
        <circle r="24" fill="transparent" />
        <circle r="16" fill="#fef08a" stroke="#0f172a" stroke-width="2.5" />
        <text x="0" y="6" text-anchor="middle" font-size="17" font-weight="900" fill="#0f172a">↻</text>
      </g>
    `);
  }

  return parts.join('');
}

/**
 * Helper to get the active boxes list for the current state
 */
function getActiveBoxes(state) {
  if ((state.currentStage || 1) === 1) {
    return [state.box];
  }
  return Array.isArray(state.boxes) && state.boxes.length > 0 ? state.boxes : [state.box];
}

/**
 * Helper to get allowed actions for a specific box in the current step
 */
function getBoxAllowedActions(box, cfg, freePlay) {
  if (freePlay) return ['all'];
  if (Array.isArray(box.allowedActions) && box.allowedActions.length > 0) {
    return box.allowedActions;
  }
  if (Array.isArray(cfg.allowedActions) && cfg.allowedActions.length > 0) {
    return cfg.allowedActions;
  }
  return [cfg.allowedAction];
}

/**
 * Renders the main 3D interactive workspace SVG
 */
function renderMainWorkspace() {
  const stageId = appState.currentStage || 1;
  dom.workspaceSvg.setAttribute('viewBox', stageId === 4 && window.innerWidth < 600 ? '100 -40 800 680' : stageId === 3 && window.innerWidth < 600 ? '150 70 700 560' : '0 0 1000 620');
  const cfg = getStepConfig(appState.currentStep, stageId);
  const { targets } = getStepBoxesAndTargets(cfg);
  const boxes = getActiveBoxes(appState);
  const cam = appState.camera;
  const match = evaluateStepMatch(appState);
  const cx = 500;
  const cy = stageId === 3 ? 400 : 345;
  const scale = 5.6;

  // 1. Workplane floor grid
  const wpCorners = [
    projectPoint(0, 0, 0, cam, cx, cy, scale),
    projectPoint(WORKPLANE.width, 0, 0, cam, cx, cy, scale),
    projectPoint(WORKPLANE.width, WORKPLANE.depth, 0, cam, cx, cy, scale),
    projectPoint(0, WORKPLANE.depth, 0, cam, cx, cy, scale)
  ];
  const wpPoly = wpCorners.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  let gridLines = '';
  for (let x = 10; x < WORKPLANE.width; x += 10) {
    const p0 = projectPoint(x, 0, 0, cam, cx, cy, scale);
    const p1 = projectPoint(x, WORKPLANE.depth, 0, cam, cx, cy, scale);
    gridLines += `<line x1="${p0.x.toFixed(1)}" y1="${p0.y.toFixed(1)}" x2="${p1.x.toFixed(1)}" y2="${p1.y.toFixed(1)}" stroke="#bae6fd" stroke-width="1" pointer-events="none" />`;
  }
  for (let y = 10; y < WORKPLANE.depth; y += 10) {
    const p0 = projectPoint(0, y, 0, cam, cx, cy, scale);
    const p1 = projectPoint(WORKPLANE.width, y, 0, cam, cx, cy, scale);
    gridLines += `<line x1="${p0.x.toFixed(1)}" y1="${p0.y.toFixed(1)}" x2="${p1.x.toFixed(1)}" y2="${p1.y.toFixed(1)}" stroke="#bae6fd" stroke-width="1" pointer-events="none" />`;
  }

  const frontMid = projectPoint(WORKPLANE.width / 2, WORKPLANE.depth + 5, 0, cam, cx, cy, scale);

  // 2. Target Ghost Outlines on the 3D Workplane
  const badgeOverlays = [];
  const targetGroupsMarkup = targets
    .map((t, idx) => {
      const boxRes = match.boxResults?.[idx] || { matched: match.matched };
      const isTargetMatched = boxRes.matched;
      const tTheme =
        stageId === 2 && targets.length > 1
          ? TARGET_THEME_STROKES[t.colorTheme] || TARGET_THEME_STROKES.coral
          : TARGET_THEME_STROKES.coral;

      const facesSvg = buildBoxSvgFaces(t, cam, cx, cy, scale, {
        isTarget: true,
        fill: isTargetMatched ? tTheme.matchedFill : tTheme.fill,
        stroke: isTargetMatched ? '#16a34a' : tTheme.stroke,
        strokeWidth: isTargetMatched ? 3 : 2.5,
        dashArray: isTargetMatched ? '' : '7 5'
      });

      if (stageId === 2 && t.badge) {
        const tv = getBoxVertices(t);
        const labelPt = projectPoint(tv.cx, tv.cy, tv.z1 + 2, cam, cx, cy, scale);
        badgeOverlays.push(`
          <g class="target-badge-label" transform="translate(${labelPt.x.toFixed(1)}, ${labelPt.y.toFixed(1)})" pointer-events="none">
            <rect x="-24" y="-12" width="48" height="22" rx="11" fill="#ffffff" fill-opacity="0.92" stroke="${isTargetMatched ? '#16a34a' : tTheme.stroke}" stroke-width="2" />
            <text x="0" y="4" text-anchor="middle" font-size="12" font-weight="900" fill="#0f172a">${t.badge}</text>
          </g>
        `);
      }

      return `
        <g id="target-ghost-${t.id || 'b1'}" data-target-id="${t.id || 'b1'}">
          ${facesSvg}
        </g>
      `;
    })
    .join('');

  // 3. Shadows on workplane when any box is lifted (z > 0)
  const shadowsMarkup = boxes
    .map((b) => {
      if (!b.z || b.z <= 0) return '';
      const v = getBoxVertices(b);
      const shadowPts = [
        projectPoint(v.x0, v.y0, 0, cam, cx, cy, scale),
        projectPoint(v.x1, v.y0, 0, cam, cx, cy, scale),
        projectPoint(v.x1, v.y1, 0, cam, cx, cy, scale),
        projectPoint(v.x0, v.y1, 0, cam, cx, cy, scale)
      ]
        .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(' ');
      return `<polygon points="${shadowPts}" fill="rgba(15, 23, 42, 0.16)" pointer-events="none" />`;
    })
    .join('');

  // 4. Interactive Student Boxes (depth-sorted so closer blocks render cleanly)
  const selectedId = appState.selectedBoxId || boxes[0]?.id || 'b1';
  const boxesWithDepth = boxes.map((b, idx) => {
    const v = getBoxVertices(b);
    const center3d = projectPoint(v.cx, v.cy, (v.z0 + v.z1) / 2, cam, cx, cy, scale);
    const boxRes =
      match.boxResults?.find((r) => r.id === (b.id || 'b1')) ||
      match.boxResults?.[idx] ||
      { matched: match.matched };
    return { b, v, depth: center3d.depth, isBoxMatched: boxRes.matched };
  });

  boxesWithDepth.sort((a, bItem) => a.depth - bItem.depth);

  const studentBoxesMarkup = boxesWithDepth
    .map(({ b, v, isBoxMatched }) => {
      const boxId = b.id || 'b1';
      const isSelected = boxes.length === 1 || boxId === selectedId;
      const theme = isBoxMatched
        ? BLOCK_COLOR_THEMES.matched
        : BLOCK_COLOR_THEMES[b.colorTheme] || BLOCK_COLOR_THEMES.coral;

      const boxFacesMarkup = buildBoxSvgFaces(b, cam, cx, cy, scale, {
        isTarget: false,
        faceColors: theme,
        stroke: isSelected && boxes.length > 1 ? '#0f172a' : theme.stroke,
        strokeWidth: isSelected && boxes.length > 1 ? 2.8 : 2
      });

      // Selection base ring for multi-block steps
      let selectionRingMarkup = '';
      if (boxes.length > 1 && isSelected) {
        const ringPts = [0, 1, 2, 3]
          .map((idx) => {
            const c = v.corners[idx];
            const p = projectPoint(c.x, c.y, c.z, cam, cx, cy, scale);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          })
          .join(' ');
        selectionRingMarkup = `<polygon class="selected-box-halo" points="${ringPts}" fill="none" stroke="#facc15" stroke-width="4.5" stroke-linejoin="round" pointer-events="none" />`;
      }

      // Badge pill on block for Stage 2
      if (stageId === 2 && b.badge) {
        const topPt = projectPoint(v.cx, v.cy, v.z1 + 4, cam, cx, cy, scale);
        badgeOverlays.push(`
          <g class="box-badge-label" transform="translate(${topPt.x.toFixed(1)}, ${topPt.y.toFixed(1)})" pointer-events="none">
            <rect x="-24" y="-12" width="48" height="22" rx="11" fill="${isSelected ? '#0f172a' : '#334155'}" stroke="${isSelected ? '#facc15' : '#ffffff'}" stroke-width="2" />
            <text x="0" y="4" text-anchor="middle" font-size="12" font-weight="900" fill="#ffffff">${b.badge}</text>
          </g>
        `);
      }

      const allowedList = getBoxAllowedActions(b, cfg, appState.freePlay);
      const canMoveOrSelect =
        allowedList.includes('move') || allowedList.includes('all') || boxes.length > 1;
      const itemActionAttr =
        allowedList.includes('move') || allowedList.includes('all')
          ? 'data-action="move" style="cursor: move;"'
          : canMoveOrSelect
            ? 'data-action="select" style="cursor: pointer;"'
            : 'style="cursor: default;"';

      return `
        <g id="student-box-${boxId}" class="student-box-item ${isSelected ? 'selected' : ''}" data-box-id="${boxId}" ${itemActionAttr}>
          ${selectionRingMarkup}
          ${boxFacesMarkup}
        </g>
      `;
    })
    .join('');

  // Keep top-level `#student-box-group` attributes compatible with single-box Stage 1 tests
  const primaryBox = boxes.find((b) => (b.id || 'b1') === selectedId) || boxes[0];
  const primaryVertices = getBoxVertices(primaryBox);
  const primaryAllowed = getBoxAllowedActions(primaryBox, cfg, appState.freePlay);
  const groupDataAction =
    boxes.length === 1 && (primaryAllowed.includes('move') || primaryAllowed.includes('all'))
      ? 'data-action="move" style="cursor: move;"'
      : '';

  // 5. Relevant handle ONLY for the currently selected box (rendered on top of all blocks so never occluded)
  const handlesMarkup = stageId === 4 ? buildTurnHandles(primaryBox, targets[0], cam, cx, cy, scale) : buildRelevantHandleMarkup(
    primaryAllowed,
    primaryVertices,
    cam,
    cx,
    cy,
    scale,
    appState.hintActive
  );

  // Cute Little Bot mascot on the completed Stage 1 Step 8 Safe Robot Base (40 × 30 × 4 mm)
  let robotMascotMarkup = '';
  if (stageId === 1 && appState.currentStep === TOTAL_STEPS && match.matched && !appState.freePlay) {
    const botPt = projectPoint(
      (primaryVertices.x0 + primaryVertices.x1) / 2,
      (primaryVertices.y0 + primaryVertices.y1) / 2,
      primaryVertices.z1,
      cam,
      cx,
      cy,
      scale
    );
    robotMascotMarkup = `
      <g id="little-bot-mascot" transform="translate(${botPt.x.toFixed(1)}, ${(botPt.y - 22).toFixed(1)})" pointer-events="none">
        <line x1="0" y1="-26" x2="0" y2="-16" stroke="#0284c7" stroke-width="3" stroke-linecap="round" />
        <circle cx="0" cy="-28" r="4" fill="#facc15" stroke="#ca8a04" stroke-width="1.5" />
        <rect x="-16" y="-16" width="32" height="24" rx="6" fill="#38bdf8" stroke="#0284c7" stroke-width="2.5" />
        <circle cx="-6" cy="-5" r="3.5" fill="#0f172a" />
        <circle cx="6" cy="-5" r="3.5" fill="#0f172a" />
      </g>
    `;
  }

  // Success "Nice!" badge above the matched block(s)
  let niceBadgeMarkup = '';
  if (match.matched && !appState.freePlay) {
    const badgeZ =
      stageId === 1 && appState.currentStep === TOTAL_STEPS
        ? primaryVertices.z1 + 26
        : primaryVertices.z1 + 18;
    const badgePt = projectPoint(
      (primaryVertices.x0 + primaryVertices.x1) / 2,
      (primaryVertices.y0 + primaryVertices.y1) / 2,
      badgeZ,
      cam,
      cx,
      cy,
      scale
    );
    niceBadgeMarkup = `
      <g id="nice-badge" transform="translate(${badgePt.x.toFixed(1)}, ${badgePt.y.toFixed(1)})" pointer-events="none">
        <rect x="-42" y="-18" width="84" height="32" rx="16" fill="#16a34a" stroke="#ffffff" stroke-width="2.5" />
        <text x="0" y="4" text-anchor="middle" font-size="16" font-weight="900" fill="#ffffff">Nice!</text>
      </g>
    `;
  }

  dom.workspaceSvg.innerHTML = `
    <rect id="orbit-bg" x="0" y="0" width="1000" height="620" fill="transparent" style="cursor: grab;" />
    <polygon points="${wpPoly}" fill="#f0f9ff" stroke="#0284c7" stroke-width="3" stroke-linejoin="round" pointer-events="none" />
    ${gridLines}
    <text x="${frontMid.x.toFixed(1)}" y="${(frontMid.y + 16).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="800" fill="#0284c7" pointer-events="none">
      ${stageId === 4 ? 'FRONT (+Y) · WORKPLANE' : 'WORKPLANE'}
    </text>

    <g id="target-ghost-group" pointer-events="none">
      ${targetGroupsMarkup}
    </g>

    ${shadowsMarkup}
    ${stageId === 3 ? (() => {
      const floor = projectPoint(primaryVertices.cx, primaryVertices.cy, 0, cam, cx, cy, scale);
      const bottom = projectPoint(primaryVertices.cx, primaryVertices.cy, primaryVertices.z0, cam, cx, cy, scale);
      return `<g pointer-events="none" id="lift-ground-guide"><line x1="${floor.x}" y1="${floor.y}" x2="${bottom.x}" y2="${bottom.y}" stroke="#334155" stroke-width="2" stroke-dasharray="5 4" /><circle cx="${floor.x}" cy="${floor.y}" r="5" fill="#334155" /></g>`;
    })() : ''}

    <g id="student-box-group" ${groupDataAction}>
      ${studentBoxesMarkup}
    </g>

    <g id="badges-overlay-group" pointer-events="none">
      ${badgeOverlays.join('')}
    </g>

    ${robotMascotMarkup}
    ${handlesMarkup}
    ${niceBadgeMarkup}
    ${stageId === 3 ? `<g pointer-events="none" fill="#0f172a" font-size="${window.innerWidth < 600 ? 24 : 16}">
      <text x="${window.innerWidth < 600 ? 180 : 20}" y="565">Length ${primaryBox.length.toFixed(1)} · Width ${primaryBox.width.toFixed(1)} mm</text>
      <text x="${window.innerWidth < 600 ? 180 : 20}" y="595">Block height ${primaryBox.height.toFixed(1)} · Above ground ${primaryBox.z.toFixed(1)} mm</text>
    </g>` : ''}
  `;
}

/**
 * Renders the small corner Target schematic thumbnail (#target-mini-svg)
 */
function renderTargetMiniPreview() {
  const stageId = appState.currentStage || 1;
  const cfg = getStepConfig(appState.currentStep, stageId);
  const { targets } = getStepBoxesAndTargets(cfg);
  const miniCam = cfg.requiredFace ? CAMERA_PRESETS[cfg.requiredFace] : CAMERA_PRESETS.ISO;
  const cx = 70;
  const cy = 62;
  const scale = 1.05;

  const wpCorners = [
    projectPoint(0, 0, 0, miniCam, cx, cy, scale),
    projectPoint(WORKPLANE.width, 0, 0, miniCam, cx, cy, scale),
    projectPoint(WORKPLANE.width, WORKPLANE.depth, 0, miniCam, cx, cy, scale),
    projectPoint(0, WORKPLANE.depth, 0, miniCam, cx, cy, scale)
  ]
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  const targetBoxesSvg = targets
    .map((t) => {
      const theme =
        stageId === 2 && targets.length > 1
          ? BLOCK_COLOR_THEMES[t.colorTheme] || BLOCK_COLOR_THEMES.matched
          : BLOCK_COLOR_THEMES.matched;
      return buildBoxSvgFaces(t, miniCam, cx, cy, scale, {
        isTarget: false,
        faceColors: theme,
        stroke: theme.stroke,
        strokeWidth: 1.1
      });
    })
    .join('');

  dom.targetMiniSvg.innerHTML = `
    <polygon points="${wpCorners}" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.2" />
    ${targetBoxesSvg}
  `;
}

/**
 * Updates the Completion Modal content to match the active stage (Stages 1–4)
 */
function updateCompletionModalContent() {
  const stageId = appState.currentStage || 1;
  if (!dom.modalCompleteTitle || !dom.modalCompleteDesc || !dom.skillsReviewGrid) return;

  dom.btnChangeDesign?.classList.toggle('hidden', stageId >= 3);
  if (stageId === 4) {
    dom.modalCompleteTitle.textContent = '🏆 Stage 4 — Rotate in 3D Complete!';
    dom.modalCompleteDesc.textContent = 'You explored three ways to turn and matched all 8 targets!';
    dom.skillsReviewGrid.innerHTML = getStageConfig(4).steps.map(task=>`<span class="skill-chip">✓ ${task.step}. ${task.title}</span>`).join('');
  } else if (stageId === 3) {
    dom.modalCompleteTitle.textContent = '🏆 Stage 3 — Size & Lift Complete!';
    dom.modalCompleteDesc.textContent = 'You matched all 8 size and lift targets!';
    dom.skillsReviewGrid.innerHTML = getStageConfig(3).steps.map(task => `<span class="skill-chip">✓ ${task.step}. ${task.title}</span>`).join('');
  } else if (stageId === 2) {
    dom.modalCompleteTitle.textContent = '🏆 Stage 2 — Challenge Complete!';
    dom.modalCompleteDesc.innerHTML =
      'You mastered all 8 <strong>Stage 2 — Challenge</strong> tasks: turning, matching direction arrows, and building a 3-block shape!';
    dom.skillsReviewGrid.innerHTML = `
      <span class="skill-chip">✓ 1. Turn and Move</span>
      <span class="skill-chip">✓ 2. Match Direction (180°)</span>
      <span class="skill-chip">✓ 3. Find the Turn (270°)</span>
      <span class="skill-chip">✓ 4. Look and Match</span>
      <span class="skill-chip">✓ 5. Two Blocks</span>
      <span class="skill-chip">✓ 6. One Needs a Turn</span>
      <span class="skill-chip">✓ 7. Turn Both</span>
      <span class="skill-chip">✓ 8. Build the Shape</span>
    `;
  } else {
    dom.modalCompleteTitle.textContent = '🎉 Safe Robot Base Complete!';
    dom.modalCompleteDesc.innerHTML =
      'You mastered all 8 spatial 3D steps and built Little Bot’s <strong>40 × 30 × 4 mm</strong> Safe Base!';
    dom.skillsReviewGrid.innerHTML = `
      <span class="skill-chip">✓ 1. Drag to Move</span>
      <span class="skill-chip">✓ 2. Stretch Length</span>
      <span class="skill-chip">✓ 3. Push Height (4 mm)</span>
      <span class="skill-chip">✓ 4. Look TOP View</span>
      <span class="skill-chip">✓ 5. Rotate 90°</span>
      <span class="skill-chip">✓ 6. Look FRONT View</span>
      <span class="skill-chip">✓ 7. Lift Cone (Z)</span>
      <span class="skill-chip">✓ 8. Pull Width (40×30×4)</span>
    `;
  }
}

/**
 * Synchronizes top bar, Stage pills, ViewCube buttons, 3D canvas, mini target preview, and Next button
 */
function renderAll() {
  const stageId = appState.currentStage || 1;
  const stageCfg = getStageConfig(stageId);
  const cfg = getStepConfig(appState.currentStep, stageId);
  const match = evaluateStepMatch(appState);

  if (dom.currentStageName) {
    dom.currentStageName.textContent = stageCfg.name;
  }
  if (dom.btnStage1) {
    dom.btnStage1.classList.toggle('active', stageId === 1);
  }
  if (dom.btnStage2) {
    dom.btnStage2.classList.toggle('active', stageId === 2);
  }
  if (dom.cardSelectStage1) {
    dom.cardSelectStage1.classList.toggle('active', stageId === 1);
  }
  if (dom.cardSelectStage2) {
    dom.cardSelectStage2.classList.toggle('active', stageId === 2);
  }

  dom.btnStage3?.classList.toggle('active', stageId === 3);
  document.getElementById('card-select-stage-3')?.classList.toggle('active', stageId === 3);

  document.getElementById('btn-stage-4')?.classList.toggle('active',stageId===4);
  document.getElementById('card-select-stage-4')?.classList.toggle('active',stageId===4);
  document.body.classList.toggle('stage-four',stageId===4);
  document.querySelector('.viewcube-widget').classList.toggle('hidden',stageId===4);
  document.getElementById('turn-toolbar').classList.toggle('hidden',stageId!==4);
  dom.viewBtns.forEach(button=>{button.disabled=stageId===4;});
  dom.stepProgress.textContent = `${appState.currentStep} / ${TOTAL_STEPS}`;
  if (appState.freePlay) {
    dom.stepInstruction.textContent = 'Free build! Try any handle.';
  } else {
    dom.stepInstruction.textContent = match.matched ? 'Nice!' : cfg.instruction;
  }

  if (!storageManager.isStorageAvailable) {
    dom.storageWarningBanner.classList.remove('hidden');
  } else {
    dom.storageWarningBanner.classList.add('hidden');
  }

  // Highlight relevant ViewCube button on view steps ('view-top', 'view-front')
  dom.viewBtns.forEach((btn) => {
    const viewKey = btn.dataset.view;
    const preset = CAMERA_PRESETS[viewKey];
    btn.classList.toggle('active', appState.camera.face === preset.face);

    const isTargetViewBtn =
      (cfg.allowedAction === 'view-top' && viewKey === 'TOP') ||
      (cfg.allowedAction === 'view-front' && viewKey === 'FRONT');
    btn.classList.toggle('hint-pulse', Boolean(!match.matched && isTargetViewBtn));
  });

  // Hint toast
  if (appState.hintActive && !match.matched) {
    dom.hintToast.textContent = stageId===4 && appState.currentStep===8 && appState.hintLevel>=2 ? 'Try Spin 90°, then Tip Forward 90°. Watch where the star goes.' : cfg.hintText;
    dom.hintToast.classList.remove('hidden');
  } else {
    dom.hintToast.classList.add('hidden');
  }

  // Back & Next buttons: Next depends strictly on current live `match.matched` (never unlocked solely by completedSteps history)
  if (dom.btnPrev) {
    dom.btnPrev.disabled = appState.currentStep <= 1;
  }
  dom.btnNext.disabled = !appState.freePlay && !match.matched;
  dom.btnNext.textContent =
    appState.currentStep === TOTAL_STEPS && (match.matched || appState.freePlay) ? 'Finish 🎉' : 'Next →';

  updateCompletionModalContent();
  renderMainWorkspace();
  renderTargetMiniPreview();
}

function persistAndRender() {
  storageManager.saveProgress(appState);
  renderAll();
}

function switchStage(targetStageId) {
  const normalizedTarget = [1,2,3,4].includes(targetStageId) ? targetStageId : 1;
  pointerSession = null;
  // Save current stage before switching
  storageManager.saveProgress(appState);
  // Load target stage state from storage (preserves step & completedSteps per stage)
  appState = storageManager.loadProgress(normalizedTarget);
  if (dom.modalComplete) dom.modalComplete.classList.add('hidden');
  if (dom.modalStages) dom.modalStages.classList.add('hidden');
  persistAndRender();
  document.getElementById('modal-turn-intro').classList.toggle('hidden',normalizedTarget!==4);
}

function safeSetPointerCapture(el, pointerId) {
  if (typeof pointerId === 'number' && typeof el.setPointerCapture === 'function') {
    try {
      el.setPointerCapture(pointerId);
    } catch (_err) {
      // Ignore synthetic pointer capture errors
    }
  }
}

function setupInteractions() {
  function clientToSvgPoint(clientX, clientY) {
    const ctm = dom.workspaceSvg.getScreenCTM();
    if (ctm && ctm.a !== 0 && ctm.d !== 0) {
      return {
        x: (clientX - ctm.e) / ctm.a,
        y: (clientY - ctm.f) / ctm.d
      };
    }
    const rect = dom.workspaceSvg.getBoundingClientRect();
    const scaleX = 1000 / Math.max(1, rect.width);
    const scaleY = 620 / Math.max(1, rect.height);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  dom.workspaceSvg.addEventListener('pointerdown', (e) => {
    const stageId = appState.currentStage || 1;
    const cfg = getStepConfig(appState.currentStep, stageId);

    // Check if the user clicked a specific block in a multi-block step
    const boxItemEl = e.target.closest('[data-box-id]');
    if (boxItemEl && boxItemEl.dataset.boxId) {
      const clickedBoxId = boxItemEl.dataset.boxId;
      if (clickedBoxId !== appState.selectedBoxId) {
        appState = selectBoxInState(appState, clickedBoxId);
        renderAll();
      }
    }

    const activeBoxes = getActiveBoxes(appState);
    const selectedId = appState.selectedBoxId || activeBoxes[0]?.id || 'b1';
    const activeBox = activeBoxes.find((b) => (b.id || 'b1') === selectedId) || activeBoxes[0];
    const allowedList = getBoxAllowedActions(activeBox, cfg, appState.freePlay);

    const actionEl = e.target.closest('[data-action]');
    const rawAction = actionEl ? actionEl.dataset.action : 'orbit';

    if (rawAction === 'select') {
      e.preventDefault();
      persistAndRender();
      return;
    }

    const isPermitted =
      appState.freePlay && ['move', 'length', 'width', 'height', 'lift', 'rotate'].includes(rawAction)
        ? true
        : allowedList.includes(rawAction);
    if (stageId===4 && !isPermitted) { e.preventDefault(); return; }
    const action = isPermitted ? rawAction : 'orbit';

    e.preventDefault();
    const v = getBoxVertices(activeBox);
    const centerSvg = projectPoint(v.cx, v.cy, v.z0, appState.camera, 500, 345, 5.6);
    const startSvg = clientToSvgPoint(e.clientX, e.clientY);
    const startAngleRad = Math.atan2(startSvg.y - centerSvg.y, startSvg.x - centerSvg.x);

    if (pointerSession || (e.button !== undefined && e.button !== 0)) return;
    pointerSession = {
      pointerId: e.pointerId,
      action,
      boxId: activeBox.id || 'b1',
      startX: e.clientX,
      startY: e.clientY,
      startSvg,
      centerSvg,
      startAngleRad,
      prevAngleRad: startAngleRad,
      accumulatedAngleDeg: 0,
      scaleBasis: rawAction === 'scale' ? (() => {
        const initial = cfg.initialBoxes[0];
        const factor = activeBox.length / initial.length;
        const corner = getScaleCornerProjection(v, appState.camera, 500, 400, 5.6);
        const center = projectPoint(v.cx, v.cy, v.z0, appState.camera, 500, 400, 5.6);
        return { x: (corner.x - center.x) / factor, y: (corner.y - center.y) / factor };
      })() : null,
      startBox: { ...activeBox },
      startCam: { ...appState.camera }
    };
    safeSetPointerCapture(dom.workspaceSvg, e.pointerId);
    if (stageId===4) renderAll();
  });

  function clientDeltaToSvgDelta(startX, startY, currentX, currentY) {
    const ctm = dom.workspaceSvg.getScreenCTM();
    if (ctm && ctm.a !== 0 && ctm.d !== 0) {
      return {
        dxSvg: (currentX - startX) / ctm.a,
        dySvg: (currentY - startY) / ctm.d
      };
    }
    const rect = dom.workspaceSvg.getBoundingClientRect();
    const fallbackScale = 1000 / Math.max(1, rect.width);
    return {
      dxSvg: (currentX - startX) * fallbackScale,
      dySvg: (currentY - startY) * fallbackScale
    };
  }

  dom.workspaceSvg.addEventListener('pointermove', (e) => {
    if (!pointerSession || e.pointerId !== pointerSession.pointerId) return;
    const { dxSvg, dySvg } = clientDeltaToSvgDelta(
      pointerSession.startX,
      pointerSession.startY,
      e.clientX,
      e.clientY
    );

    const { action, boxId, startBox, startCam } = pointerSession;

    if (appState.currentStage===4 && TURN_AXES[action]) {
      const distance=TURN_AXES[action].drag==='vertical' ? -dySvg : dxSvg;
      if (Math.hypot(dxSvg,dySvg)<3) return;
      const nearest=Math.round(distance/90)*90;
      const angle=Math.abs(distance-nearest)<=5 ? nearest : distance;
      appState=updateBoxInState({...appState,box:{...startBox},boxes:[{...startBox}]},{turnAction:action,turnDegrees:angle});
      renderAll();
      return;
    }

    // Orbiting the camera NEVER alters `appState.box` or `appState.boxes`
    if (action === 'orbit') {
      const nextYaw = clamp(startCam.yaw - dxSvg * 0.25, -88, 88);
      const nextPitch = clamp(startCam.pitch + dySvg * 0.22, 5, 88);
      appState = setCameraInState(appState, { face: '3D', yaw: nextYaw, pitch: nextPitch });
      renderAll();
      return;
    }

    const mmScale = 5.6;
    const yawRad = (appState.camera.yaw * Math.PI) / 180;
    const pitchRad = (appState.camera.pitch * Math.PI) / 180;
    const sinPitch = Math.max(0.25, Math.sin(pitchRad));
    const cosPitch = Math.max(0.25, Math.cos(pitchRad));

    if (action === 'move') {
      const rx = dxSvg / mmScale;
      const ry = dySvg / (mmScale * sinPitch);
      const dWorldX = rx * Math.cos(yawRad) + ry * Math.sin(yawRad);
      const dWorldY = -rx * Math.sin(yawRad) + ry * Math.cos(yawRad);

      appState = updateBoxInState(appState, {
        boxId,
        x: startBox.x + dWorldX,
        y: startBox.y + dWorldY
      });
      renderAll();
    } else if (action === 'scale') {
      if (Math.hypot(dxSvg, dySvg) < 1) return;
      const initial = getStepConfig(appState.currentStep, 3).initialBoxes[0];
      const basis = pointerSession.scaleBasis;
      const denominator = basis.x * basis.x + basis.y * basis.y;
      const deltaScale = denominator > 0 ? (dxSvg * basis.x + dySvg * basis.y) / denominator : 0;
      appState = updateBoxInState(appState, { scale: startBox.length / initial.length + deltaScale });
      renderAll();
    } else if (action === 'length') {
      const ux = Math.cos(yawRad) * mmScale;
      const uy = Math.sin(yawRad) * sinPitch * mmScale;
      const denom = ux * ux + uy * uy;
      const deltaLen = denom > 0 ? (dxSvg * ux + dySvg * uy) / denom : 0;
      appState = updateBoxInState(appState, { boxId, length: startBox.length + deltaLen * (appState.currentStage === 3 ? 2 : 1) });
      renderAll();
    } else if (action === 'width') {
      const vx = -Math.sin(yawRad) * mmScale;
      const vy = Math.cos(yawRad) * sinPitch * mmScale;
      const denom = vx * vx + vy * vy;
      const deltaWid = denom > 0 ? (dxSvg * vx + dySvg * vy) / denom : 0;
      appState = updateBoxInState(appState, { boxId, width: startBox.width + deltaWid * (appState.currentStage === 3 ? 2 : 1) });
      renderAll();
    } else if (action === 'height') {
      const deltaH = -dySvg / (mmScale * cosPitch);
      appState = updateBoxInState(appState, { boxId, height: startBox.height + deltaH });
      renderAll();
    } else if (action === 'lift') {
      const deltaZ = -dySvg / (mmScale * cosPitch);
      appState = updateBoxInState(appState, { boxId, z: startBox.z + deltaZ });
      renderAll();
    } else if (action === 'rotate') {
      // Click and hold then turn: require actual pointer drag (single click does not rotate)
      const dragDist = Math.hypot(dxSvg, dySvg);
      if (dragDist < 5) return;

      const currSvgX = pointerSession.startSvg.x + dxSvg;
      const currSvgY = pointerSession.startSvg.y + dySvg;
      const currAngleRad = Math.atan2(
        currSvgY - pointerSession.centerSvg.y,
        currSvgX - pointerSession.centerSvg.x
      );

      let stepDeg = ((currAngleRad - pointerSession.prevAngleRad) * 180) / Math.PI;
      if (stepDeg > 180) stepDeg -= 360;
      if (stepDeg < -180) stepDeg += 360;
      pointerSession.accumulatedAngleDeg += stepDeg;
      pointerSession.prevAngleRad = currAngleRad;

      // Signed tangential check around centerSvg so both clockwise (+) and counter-clockwise (-) drags work
      const radX = pointerSession.startSvg.x - pointerSession.centerSvg.x;
      const radY = pointerSession.startSvg.y - pointerSession.centerSvg.y;
      const radLen = Math.hypot(radX, radY) || 1;
      const tanX = -radY / radLen;
      const tanY = radX / radLen;
      const tangentDist = dxSvg * tanX + dySvg * tanY;

      const acc = pointerSession.accumulatedAngleDeg;
      const sign = (Math.abs(acc) >= 4 ? Math.sign(acc) : Math.sign(tangentDist)) || 1;
      const turnAmount = sign * Math.max(Math.abs(acc), dragDist * 0.85);

      appState = updateBoxInState(appState, {
        boxId,
        rotation: startBox.rotation + turnAmount
      });
      renderAll();
    }
  });

  const endPointer = (e) => {
    if (pointerSession && (!e || e.pointerId === pointerSession.pointerId)) {
      pointerSession = null;
      persistAndRender();
    }
  };
  dom.workspaceSvg.addEventListener('pointerup', endPointer);
  dom.workspaceSvg.addEventListener('pointercancel', endPointer);
  dom.workspaceSvg.addEventListener('lostpointercapture', endPointer);
  dom.btnStage3?.addEventListener('click', () => switchStage(3));
  document.getElementById('card-select-stage-3')?.addEventListener('click', () => switchStage(3));

  document.getElementById('btn-stage-4').addEventListener('click',()=>switchStage(4));
  document.getElementById('card-select-stage-4').addEventListener('click',()=>switchStage(4));
  for (const id of ['btn-close-turn-intro','btn-start-turn']) {
    document.getElementById(id).addEventListener('click',()=>document.getElementById('modal-turn-intro').classList.add('hidden'));
  }
  document.getElementById('btn-turn-help').addEventListener('click',()=>document.getElementById('modal-turn-intro').classList.remove('hidden'));

  // Stage Switcher Buttons (Stage 1 — Basics / Stage 2 — Challenge)
  if (dom.btnStage1) {
    dom.btnStage1.addEventListener('click', () => switchStage(1));
  }
  if (dom.btnStage2) {
    dom.btnStage2.addEventListener('click', () => switchStage(2));
  }
  if (dom.cardSelectStage1) {
    dom.cardSelectStage1.addEventListener('click', () => switchStage(1));
  }
  if (dom.cardSelectStage2) {
    dom.cardSelectStage2.addEventListener('click', () => switchStage(2));
  }
  if (dom.btnCloseStages) {
    dom.btnCloseStages.addEventListener('click', () => {
      dom.modalStages.classList.add('hidden');
    });
  }

  // ViewCube Face Buttons (3D, TOP, FRONT, SIDE) — strictly camera-only
  dom.viewBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      pointerSession = null;
      if (appState.currentStage===4) return;
      const viewKey = btn.dataset.view;
      const preset = CAMERA_PRESETS[viewKey] || CAMERA_PRESETS.ISO;
      appState = setCameraInState(appState, { ...preset });
      persistAndRender();
    });
  });

  // Back Button: returns to the previous step in the current stage
  if (dom.btnPrev) {
    dom.btnPrev.addEventListener('click', () => {
      pointerSession = null;
      if (appState.currentStep <= 1) return;
      const stageId = appState.currentStage || 1;
      const prevStep = appState.currentStep - 1;
      const remainingCompleted = appState.completedSteps.filter((s) => s !== prevStep);
      appState = createStepState(prevStep, remainingCompleted, stageId);
      persistAndRender();
    });
  }

  // Reset Button: resets ONLY the current step in the current stage
  dom.btnReset.addEventListener('click', () => {
    pointerSession = null;
    const stageId = appState.currentStage || 1;
    const remainingCompleted = appState.completedSteps.filter((s) => s !== appState.currentStep);
    appState = createStepState(appState.currentStep, remainingCompleted, stageId);
    persistAndRender();
  });

  // Hint Button
  dom.btnHint.addEventListener('click', () => {
    if (appState.currentStage===4 && appState.currentStep===8) {
      appState.hintLevel=((appState.hintLevel || 0)+1)%3;
      appState.hintActive=appState.hintLevel>0;
    } else appState.hintActive = !appState.hintActive;
    renderAll();
  });

  // Next Button: advances only when the user clicks Next; on Step 8 opens Completion Modal
  dom.btnNext.addEventListener('click', () => {
    const match = evaluateStepMatch(appState);
    if (!match.matched && !appState.freePlay) return;

    if (appState.currentStep === TOTAL_STEPS) {
      if (dom.modalComplete) {
        updateCompletionModalContent();
        dom.modalComplete.classList.remove('hidden');
      }
      return;
    }

    const stageId = appState.currentStage || 1;
    const nextStep = appState.currentStep + 1;
    const remainingCompleted = appState.completedSteps.filter((s) => s !== nextStep);
    appState = createStepState(nextStep, remainingCompleted, stageId);
    persistAndRender();
  });

  // Completion Modal Actions (Choose Stage / Change My Design / Replay 1 / 8)
  if (dom.btnCloseComplete) {
    dom.btnCloseComplete.addEventListener('click', () => {
      dom.modalComplete.classList.add('hidden');
    });
  }
  if (dom.btnStageSelect) {
    dom.btnStageSelect.addEventListener('click', () => {
      dom.modalComplete.classList.add('hidden');
      if (dom.modalStages) {
        const s1 = storageManager.loadProgress(1);
        const s2 = storageManager.loadProgress(2);
        const s3 = storageManager.loadProgress(3);
        const s4 = storageManager.loadProgress(4);
        document.getElementById('stage-4-progress-summary').textContent = `Step ${s4.currentStep} / ${TOTAL_STEPS} (${s4.completedSteps.length} done)`;
        document.getElementById('stage-3-progress-summary').textContent = `Step ${s3.currentStep} / ${TOTAL_STEPS} (${s3.completedSteps.length} done)`;
        if (dom.stage1ProgressSummary) {
          dom.stage1ProgressSummary.textContent = `Step ${s1.currentStep} / ${TOTAL_STEPS} (${s1.completedSteps.length} done)`;
        }
        if (dom.stage2ProgressSummary) {
          dom.stage2ProgressSummary.textContent = `Step ${s2.currentStep} / ${TOTAL_STEPS} (${s2.completedSteps.length} done)`;
        }
        dom.modalStages.classList.remove('hidden');
      }
    });
  }
  if (dom.btnChangeDesign) {
    dom.btnChangeDesign.addEventListener('click', () => {
      dom.modalComplete.classList.add('hidden');
      appState = {
        ...appState,
        freePlay: true
      };
      persistAndRender();
    });
  }
  if (dom.btnReplayAll) {
    dom.btnReplayAll.addEventListener('click', () => {
      dom.modalComplete.classList.add('hidden');
      const stageId = appState.currentStage || 1;
      appState = createStepState(1, [], stageId);
      persistAndRender();
    });
  }

  // Separate Story & Teacher Info Modal
  dom.btnOpenInfo.addEventListener('click', () => {
    dom.modalInfo.classList.remove('hidden');
  });
  dom.btnCloseInfo.addEventListener('click', () => {
    dom.modalInfo.classList.add('hidden');
  });
}

setupInteractions();
window.addEventListener('resize', () => { pointerSession = null; renderAll(); });
renderAll();

if (appState.currentStage===4) document.getElementById('modal-turn-intro').classList.remove('hidden');
