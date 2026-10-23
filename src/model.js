/**
 * Builder Island — Minimalist 3D Practice Playground Model (Stages 1–4)
 * Stage 1 — Basics: 8 single-action spatial steps (preserved 100% unchanged).
 * Stage 2 — Challenge: 8 progressive steps for Move + Hold-to-Turn Rotation, Directional Markers, and Multi-Block Matching.
 */

export const WORKPLANE = Object.freeze({
  width: 100,
  depth: 80,
  maxHeight: 60
});

export const CAMERA_PRESETS = Object.freeze({
  ISO: { face: '3D', yaw: 38, pitch: 28 },
  TOP: { face: 'TOP', yaw: 0, pitch: 88 },
  FRONT: { face: 'FRONT', yaw: 0, pitch: 6 },
  SIDE: { face: 'SIDE', yaw: 88, pitch: 6 }
});

export const STORY_INTRO =
  'A little robot has arrived on Builder Island. It has no home yet! Help it build a safe base, a doorway, and a welcome sign.';

/**
 * Stage 1: 8 minimalist hands-on tasks (100% preserved).
 * Each step practices strictly ONE primary action and only enables its relevant control.
 */
export const STEPS = Object.freeze([
  {
    step: 1,
    stage: 1,
    title: 'Move the Box',
    instruction: 'Drag the box to the target.',
    hintText: 'Drag the red box.',
    allowedAction: 'move',
    initialCamera: 'ISO',
    initialBox: { x: 14, y: 46, z: 0, length: 20, width: 20, height: 20, rotation: 0 },
    target: { x: 52, y: 30, z: 0, length: 20, width: 20, height: 20, rotation: 0 }
  },
  {
    step: 2,
    stage: 1,
    title: 'Stretch Length',
    instruction: 'Stretch the box to fit.',
    hintText: 'Drag the right white square.',
    allowedAction: 'length',
    initialCamera: 'ISO',
    initialBox: { x: 30, y: 30, z: 0, length: 20, width: 20, height: 20, rotation: 0 },
    target: { x: 30, y: 30, z: 0, length: 44, width: 20, height: 20, rotation: 0 }
  },
  {
    step: 3,
    stage: 1,
    title: 'Push Height Down',
    instruction: 'Push the top handle down.',
    hintText: 'Drag the top square down.',
    allowedAction: 'height',
    initialCamera: 'ISO',
    initialBox: { x: 30, y: 25, z: 0, length: 40, width: 30, height: 26, rotation: 0 },
    target: { x: 30, y: 25, z: 0, length: 40, width: 30, height: 4, rotation: 0 }
  },
  {
    step: 4,
    stage: 1,
    title: 'Top View',
    instruction: 'Look from the TOP view.',
    hintText: 'Click TOP on the view bar.',
    allowedAction: 'view-top',
    initialCamera: 'ISO',
    requiredFace: 'TOP',
    initialBox: { x: 35, y: 25, z: 0, length: 30, width: 30, height: 14, rotation: 0 },
    target: { x: 35, y: 25, z: 0, length: 30, width: 30, height: 14, rotation: 0 }
  },
  {
    step: 5,
    stage: 1,
    title: 'Rotate 90°',
    instruction: 'Rotate the box to fit.',
    hintText: 'Hold and turn the ↻ handle.',
    allowedAction: 'rotate',
    initialCamera: 'ISO',
    initialBox: { x: 30, y: 32, z: 0, length: 40, width: 16, height: 14, rotation: 0 },
    target: { x: 30, y: 32, z: 0, length: 40, width: 16, height: 14, rotation: 90 }
  },
  {
    step: 6,
    stage: 1,
    title: 'Front View',
    instruction: 'Look from the FRONT view.',
    hintText: 'Click FRONT on the view bar.',
    allowedAction: 'view-front',
    initialCamera: 'ISO',
    requiredFace: 'FRONT',
    initialBox: { x: 38, y: 30, z: 0, length: 24, width: 20, height: 26, rotation: 0 },
    target: { x: 38, y: 30, z: 0, length: 24, width: 20, height: 26, rotation: 0 }
  },
  {
    step: 7,
    stage: 1,
    title: 'Lift with Cone',
    instruction: 'Lift the block up high.',
    hintText: 'Drag the top black cone up.',
    allowedAction: 'lift',
    initialCamera: 'FRONT',
    initialBox: { x: 35, y: 30, z: 0, length: 30, width: 20, height: 10, rotation: 0 },
    target: { x: 35, y: 30, z: 22, length: 30, width: 20, height: 10, rotation: 0 }
  },
  {
    step: 8,
    stage: 1,
    title: 'Pull Width Out',
    instruction: 'Pull the front handle out.',
    hintText: 'Drag the front white square.',
    allowedAction: 'width',
    initialCamera: 'ISO',
    initialBox: { x: 30, y: 25, z: 0, length: 40, width: 14, height: 4, rotation: 0 },
    target: { x: 30, y: 25, z: 0, length: 40, width: 30, height: 4, rotation: 0 }
  }
]);

/**
 * Stage 2: 8 Challenge tasks (Move, Hold-to-Turn Rotation, Directional Markers, Multi-Block).
 */
export const STAGE_2_STEPS = Object.freeze([
  {
    step: 1,
    stage: 2,
    title: 'Turn and Move',
    instruction: 'Turn and move the block to match the target.',
    hintText: 'Hold ↻ to turn 90°, and drag the block into the green outline.',
    allowedActions: ['move', 'rotate'],
    initialCamera: 'ISO',
    initialBoxes: [
      {
        id: 'b1',
        badge: '1 ★',
        colorTheme: 'coral',
        hasDirectionMarker: false,
        allowedActions: ['move', 'rotate'],
        x: 12,
        y: 48,
        z: 0,
        length: 36,
        width: 16,
        height: 12,
        rotation: 0
      }
    ],
    targets: [
      {
        id: 'b1',
        badge: '1 ★',
        colorTheme: 'coral',
        hasDirectionMarker: false,
        x: 52,
        y: 24,
        z: 0,
        length: 36,
        width: 16,
        height: 12,
        rotation: 90
      }
    ]
  },
  {
    step: 2,
    stage: 2,
    title: 'Match the Direction',
    instruction: 'Match the direction, then move to the target.',
    hintText: 'Hold ↻ and turn 180° so the yellow arrow points left, then move to the target.',
    allowedActions: ['move', 'rotate'],
    initialCamera: 'ISO',
    initialBoxes: [
      {
        id: 'b1',
        badge: '1 ▶',
        colorTheme: 'coral',
        hasDirectionMarker: true,
        allowedActions: ['move', 'rotate'],
        x: 12,
        y: 46,
        z: 0,
        length: 36,
        width: 18,
        height: 12,
        rotation: 0
      }
    ],
    targets: [
      {
        id: 'b1',
        badge: '1 ▶',
        colorTheme: 'coral',
        hasDirectionMarker: true,
        x: 52,
        y: 20,
        z: 0,
        length: 36,
        width: 18,
        height: 12,
        rotation: 180
      }
    ]
  },
  {
    step: 3,
    stage: 2,
    title: 'Find the Turn',
    instruction: 'Turn the block to match the target.',
    hintText: 'Turn ↻ clockwise or counter-clockwise until the arrow points back (270°), and move to the target.',
    allowedActions: ['move', 'rotate'],
    initialCamera: 'ISO',
    initialBoxes: [
      {
        id: 'b1',
        badge: '1 ▶',
        colorTheme: 'coral',
        hasDirectionMarker: true,
        allowedActions: ['move', 'rotate'],
        x: 14,
        y: 22,
        z: 0,
        length: 36,
        width: 18,
        height: 12,
        rotation: 0
      }
    ],
    targets: [
      {
        id: 'b1',
        badge: '1 ▶',
        colorTheme: 'coral',
        hasDirectionMarker: true,
        x: 50,
        y: 36,
        z: 0,
        length: 36,
        width: 18,
        height: 12,
        rotation: 270
      }
    ]
  },
  {
    step: 4,
    stage: 2,
    title: 'Look and Match',
    instruction: 'Look closely. Match the position and direction.',
    hintText: 'Move the block to the front-left target and turn ↻ 90° so the arrow points front.',
    allowedActions: ['move', 'rotate'],
    initialCamera: 'ISO',
    initialBoxes: [
      {
        id: 'b1',
        badge: '1 ▶',
        colorTheme: 'coral',
        hasDirectionMarker: true,
        allowedActions: ['move', 'rotate'],
        x: 54,
        y: 16,
        z: 0,
        length: 36,
        width: 16,
        height: 12,
        rotation: 0
      }
    ],
    targets: [
      {
        id: 'b1',
        badge: '1 ▶',
        colorTheme: 'coral',
        hasDirectionMarker: true,
        x: 16,
        y: 42,
        z: 0,
        length: 36,
        width: 16,
        height: 12,
        rotation: 90
      }
    ]
  },
  {
    step: 5,
    stage: 2,
    title: 'Two Blocks',
    instruction: 'Move both blocks to their matching targets.',
    hintText: 'Drag Block 1 ★ to Target 1 ★, and Block 2 ◆ to Target 2 ◆.',
    allowedActions: ['move'],
    initialCamera: 'ISO',
    initialBoxes: [
      {
        id: 'b1',
        badge: '1 ★',
        colorTheme: 'coral',
        hasDirectionMarker: false,
        allowedActions: ['move'],
        x: 10,
        y: 14,
        z: 0,
        length: 30,
        width: 18,
        height: 12,
        rotation: 0
      },
      {
        id: 'b2',
        badge: '2 ◆',
        colorTheme: 'cobalt',
        hasDirectionMarker: false,
        allowedActions: ['move'],
        x: 12,
        y: 48,
        z: 0,
        length: 22,
        width: 22,
        height: 12,
        rotation: 0
      }
    ],
    targets: [
      {
        id: 'b1',
        badge: '1 ★',
        colorTheme: 'coral',
        hasDirectionMarker: false,
        x: 54,
        y: 48,
        z: 0,
        length: 30,
        width: 18,
        height: 12,
        rotation: 0
      },
      {
        id: 'b2',
        badge: '2 ◆',
        colorTheme: 'cobalt',
        hasDirectionMarker: false,
        x: 60,
        y: 16,
        z: 0,
        length: 22,
        width: 22,
        height: 12,
        rotation: 0
      }
    ]
  },
  {
    step: 6,
    stage: 2,
    title: 'One Needs a Turn',
    instruction: 'One block needs a turn. Match both targets.',
    hintText: 'Move and turn Block 1 ★ by 90°. Move Block 2 ◆ straight to Target 2 ◆.',
    allowedActions: ['move', 'rotate'],
    initialCamera: 'ISO',
    initialBoxes: [
      {
        id: 'b1',
        badge: '1 ★',
        colorTheme: 'coral',
        hasDirectionMarker: false,
        allowedActions: ['move', 'rotate'],
        x: 10,
        y: 14,
        z: 0,
        length: 34,
        width: 16,
        height: 12,
        rotation: 0
      },
      {
        id: 'b2',
        badge: '2 ◆',
        colorTheme: 'cobalt',
        hasDirectionMarker: false,
        allowedActions: ['move', 'rotate'],
        x: 56,
        y: 14,
        z: 0,
        length: 30,
        width: 16,
        height: 12,
        rotation: 0
      }
    ],
    targets: [
      {
        id: 'b1',
        badge: '1 ★',
        colorTheme: 'coral',
        hasDirectionMarker: false,
        x: 16,
        y: 44,
        z: 0,
        length: 34,
        width: 16,
        height: 12,
        rotation: 90
      },
      {
        id: 'b2',
        badge: '2 ◆',
        colorTheme: 'cobalt',
        hasDirectionMarker: false,
        x: 54,
        y: 50,
        z: 0,
        length: 30,
        width: 16,
        height: 12,
        rotation: 0
      }
    ]
  },
  {
    step: 7,
    stage: 2,
    title: 'Turn Both',
    instruction: 'Turn and move both blocks to match.',
    hintText: 'Turn Block 1 ★ by 90°. Turn Block 2 ▶ by 180° so its arrow points left.',
    allowedActions: ['move', 'rotate'],
    initialCamera: 'ISO',
    initialBoxes: [
      {
        id: 'b1',
        badge: '1 ★',
        colorTheme: 'coral',
        hasDirectionMarker: false,
        allowedActions: ['move', 'rotate'],
        x: 10,
        y: 14,
        z: 0,
        length: 34,
        width: 16,
        height: 12,
        rotation: 0
      },
      {
        id: 'b2',
        badge: '2 ▶',
        colorTheme: 'cobalt',
        hasDirectionMarker: true,
        allowedActions: ['move', 'rotate'],
        x: 54,
        y: 14,
        z: 0,
        length: 34,
        width: 16,
        height: 12,
        rotation: 0
      }
    ],
    targets: [
      {
        id: 'b1',
        badge: '1 ★',
        colorTheme: 'coral',
        hasDirectionMarker: false,
        x: 16,
        y: 44,
        z: 0,
        length: 34,
        width: 16,
        height: 12,
        rotation: 90
      },
      {
        id: 'b2',
        badge: '2 ▶',
        colorTheme: 'cobalt',
        hasDirectionMarker: true,
        x: 52,
        y: 48,
        z: 0,
        length: 34,
        width: 16,
        height: 12,
        rotation: 180
      }
    ]
  },
  {
    step: 8,
    stage: 2,
    title: 'Build the Shape',
    instruction: 'Build the whole shape. Match all three blocks.',
    hintText: 'Place 1 ★ on the left (turn 90°), 2 ◆ across the back, and 3 ▶ on the right (turn 90°).',
    allowedActions: ['move', 'rotate'],
    initialCamera: 'ISO',
    initialBoxes: [
      {
        id: 'b1',
        badge: '1 ★',
        colorTheme: 'coral',
        hasDirectionMarker: false,
        allowedActions: ['move', 'rotate'],
        x: 4,
        y: 8,
        z: 0,
        length: 30,
        width: 14,
        height: 10,
        rotation: 0
      },
      {
        id: 'b2',
        badge: '2 ◆',
        colorTheme: 'cobalt',
        hasDirectionMarker: false,
        allowedActions: ['move', 'rotate'],
        x: 34,
        y: 62,
        z: 0,
        length: 32,
        width: 14,
        height: 10,
        rotation: 0
      },
      {
        id: 'b3',
        badge: '3 ▶',
        colorTheme: 'amber',
        hasDirectionMarker: true,
        allowedActions: ['move', 'rotate'],
        x: 66,
        y: 8,
        z: 0,
        length: 30,
        width: 14,
        height: 10,
        rotation: 0
      }
    ],
    targets: [
      {
        id: 'b1',
        badge: '1 ★',
        colorTheme: 'coral',
        hasDirectionMarker: false,
        x: 12,
        y: 40,
        z: 0,
        length: 30,
        width: 14,
        height: 10,
        rotation: 90
      },
      {
        id: 'b2',
        badge: '2 ◆',
        colorTheme: 'cobalt',
        hasDirectionMarker: false,
        x: 34,
        y: 12,
        z: 0,
        length: 32,
        width: 14,
        height: 10,
        rotation: 0
      },
      {
        id: 'b3',
        badge: '3 ▶',
        colorTheme: 'amber',
        hasDirectionMarker: true,
        x: 58,
        y: 40,
        z: 0,
        length: 30,
        width: 14,
        height: 10,
        rotation: 90
      }
    ]
  }
]);

// Size changes in Stage 3 use the fixed bottom-face center (50, 40).
export const SIZE_LIMITS = Object.freeze({ min: 6, maxLength: 80, maxWidth: 60, maxHeight: 30, maxLift: 28 });
const sizeTask = (step, title, instruction, actions, initial, target) => ({
  step, stage: 3, title, instruction, hintText: instruction,
  allowedActions: actions, initialCamera: 'ISO',
  initialBoxes: [{ id: 'b1', colorTheme: 'coral', hasDirectionMarker: false,
    allowedActions: actions, rotation: 0, ...initial,
    x: 50 - initial.length / 2, y: 40 - initial.width / 2 }],
  targets: [{ id: 'b1', rotation: 0, ...target,
    x: 50 - target.length / 2, y: 40 - target.width / 2 }]
});
const sizeBox = (length, width, height, z = 0) => ({ length, width, height, z });
export const STAGE_3_STEPS = Object.freeze([
  sizeTask(1, 'Make It Bigger', 'Make the whole block bigger.', ['scale'], sizeBox(20,16,12), sizeBox(40,32,24)),
  sizeTask(2, 'Make It Smaller', 'Make the whole block smaller.', ['scale'], sizeBox(40,32,24), sizeBox(20,16,12)),
  sizeTask(3, 'Make It Longer', 'Make the block longer.', ['length'], sizeBox(24,20,12), sizeBox(48,20,12)),
  sizeTask(4, 'Make It Narrower', 'Make the block narrower.', ['width'], sizeBox(36,36,12), sizeBox(36,18,12)),
  sizeTask(5, 'Match Two Dimensions', 'Match the length and width.', ['length','width'], sizeBox(24,32,12), sizeBox(48,20,12)),
  sizeTask(6, 'Lift It Up', 'Lift the block to the target.', ['lift'], sizeBox(32,24,12), sizeBox(32,24,12,24)),
  sizeTask(7, 'Resize and Lift', 'Resize and lift the block to match.', ['scale','lift'], sizeBox(20,16,12), sizeBox(30,24,18,20)),
  sizeTask(8, 'Size and Lift Challenge', 'Match the size and height above the ground.', ['length','width','lift'], sizeBox(24,32,12), sizeBox(44,20,12,24))
]);

// Stage 4: +Z up, +Y front, +X right. Quaternions are [w, x, y, z].
export const TURN_AXES = Object.freeze({
  spin: { axis: 'z', label: 'Spin', color: '#7c3aed', drag: 'horizontal' },
  'tip-forward': { axis: 'x', label: 'Tip Forward / Back', color: '#b45309', drag: 'vertical' },
  'tip-side': { axis: 'y', label: 'Tip Sideways', color: '#0369a1', drag: 'horizontal' }
});
export const ORIENTATION_VERSION = 1;
export function normalizeOrientation(raw) {
  if (!Array.isArray(raw) || raw.length !== 4 || !raw.every(Number.isFinite)) return [1, 0, 0, 0];
  const norm = Math.hypot(...raw);
  return Number.isFinite(norm) && norm > 1e-10 ? raw.map(value => value / norm) : [1, 0, 0, 0];
}
export function multiplyOrientation(a, b) {
  const [w,x,y,z] = a, [v,i,j,k] = b;
  return normalizeOrientation([w*v-x*i-y*j-z*k, w*i+x*v+y*k-z*j, w*j-x*k+y*v+z*i, w*k+x*j-y*i+z*v]);
}
export function rotateWorld(orientation, axis, degrees) {
  if (!['x','y','z'].includes(axis) || !Number.isFinite(degrees)) return normalizeOrientation(orientation);
  const half = degrees * Math.PI / 360;
  const turn = [Math.cos(half), 0, 0, 0];
  turn[{x:1,y:2,z:3}[axis]] = Math.sin(half);
  // Left multiplication applies each turn about a FIXED WORLD axis.
  return multiplyOrientation(turn, normalizeOrientation(orientation));
}
export function rotateVector(orientation, vector) {
  const [w,x,y,z] = normalizeOrientation(orientation);
  const [a,b,c] = vector;
  const tx = 2*(y*c-z*b), ty = 2*(z*a-x*c), tz = 2*(x*b-y*a);
  return [a+w*tx+y*tz-z*ty, b+w*ty+z*tx-x*tz, c+w*tz+x*ty-y*tx];
}
export function orientationDistance(a, b) {
  const qa = normalizeOrientation(a), qb = normalizeOrientation(b);
  const dot = Math.min(1, Math.abs(qa.reduce((sum,value,i) => sum+value*qb[i],0)));
  return 2 * Math.acos(dot) * 180 / Math.PI;
}
export function orientedPoint(box, local) {
  const [x,y,z] = rotateVector(box.orientation, local);
  return { x: box.x+box.length/2+x, y: box.y+box.width/2+y, z: box.z+box.height/2+z };
}
const turnTask = (step, title, instruction, hintText, actions, solution, stage = 4) => {
  const initial = { id:'b1', colorTheme:'coral', x:34, y:29, z:26, length:32, width:22, height:16,
    rotation:0, orientationVersion:ORIENTATION_VERSION, orientation:[1,0,0,0], allowedActions:actions };
  const orientation = solution.reduce((q,[axis,angle]) => rotateWorld(q,axis,angle), initial.orientation);
  return { step, stage, title, instruction, hintText, allowedActions:actions, initialCamera:'ISO',
    initialBoxes:[initial], targets:[{...initial,orientation}], solution };
};
export const STAGE_4_STEPS = Object.freeze([
  turnTask(1,'Spin to Match','Spin the block to match.','Hold the curved arrow. Drag to turn on the workplane.',['spin'],[['z',90]]),
  turnTask(2,'Spin the Other Way','Spin the other way to match.','Look at the front arrow. Turn it toward the target.',['spin'],[['z',-90]]),
  turnTask(3,'Tip Forward','Tip the block forward.','Watch the top mark as the block tips forward.',['tip-forward'],[['x',-90]]),
  turnTask(4,'Tip Backward','Tip the block backward.','Use the same arrow. Tip the other way.',['tip-forward'],[['x',90]]),
  turnTask(5,'Tip Sideways','Tip the block sideways to match.','This arrow tips the block from side to side.',['tip-side'],[['y',90]]),
  turnTask(6,'Tip the Other Way','Tip the other way to match.','Watch the top mark. Tip toward the target.',['tip-side'],[['y',-90]]),
  turnTask(7,'Choose the Right Arrow','Choose the right arrow. Turn to match.','Try Tip Forward / Back: tip backward toward the target.',['spin','tip-forward','tip-side'],[['x',90]]),
  turnTask(8,'Two-Turn Challenge','Use two turns to match the target.','Look at the front arrow and the top star.',['spin','tip-forward','tip-side'],[['z',90],['x',-90]])
]);

// Stage 5 reuses the Stage 4 block, world axes and orientation generator unchanged.
const challengeTurn = (step, instruction, solution) => {
  const actions = Object.keys(TURN_AXES);
  const observe = 'Look at the top star, front arrow, and side diamond.';
  const action = actions.find(key => TURN_AXES[key].axis === solution[0][0]);
  const describe = ([axis, degrees]) => axis === 'x'
    ? `Tip ${degrees > 0 ? 'backward' : 'forward'} ${Math.abs(degrees)}°`
    : axis === 'y' ? `Tip Sideways ${degrees > 0 ? 'right' : 'left'} ${Math.abs(degrees)}°`
      : `Spin ${degrees > 0 ? '+' : '−'}${Math.abs(degrees)}°`;
  return {
    ...turnTask(step, `Rotation Challenge ${step}`, instruction, observe, actions, solution, 5),
    hintLevels: [observe, `${TURN_AXES[action].label} is one helpful action. Compare the face marks as you turn.`,
      `From the start: ${solution.map(describe).join(', then ')}. You may click Reset first to try this example.`]
  };
};
export const STAGE_5_STEPS = Object.freeze([
  challengeTurn(1, 'Choose an arrow. Match the target.', [['z',90]]),
  challengeTurn(2, 'Look at the top mark. Turn to match.', [['x',90]]),
  challengeTurn(3, 'Match the front and top marks.', [['y',90]]),
  challengeTurn(4, 'Which arrow will help?', [['z',-90]]),
  challengeTurn(5, 'Turn the block to match the target.', [['x',-90]]),
  challengeTurn(6, 'Look closely. Match the direction.', [['y',-90]]),
  challengeTurn(7, 'Use two turns to match.', [['x',90],['y',90]]),
  challengeTurn(8, 'Watch where the top mark goes.', [['z',90],['x',90]]),
  // Original Y+90, Z-90 duplicates Q7. Change only the Z sign.
  challengeTurn(9, 'Match all the visible marks.', [['y',90],['z',90]]),
  challengeTurn(10, 'Look again. The target is different.', [['y',90],['x',90]]),
  challengeTurn(11, 'Keep turning until the marks match.', [['z',180],['x',90]]),
  // Original X+90, Y+90, Z+90 collapses to Q3 (Y+90). Change only Z.
  challengeTurn(12, 'Final challenge! Match the whole block.', [['x',90],['y',90],['z',-90]])
]);

export function isRotationStage(stageId) {
  return stageId === 4 || stageId === 5;
}

// Align uses unrotated WORLD bounds: +X right, +Y front, +Z up.
export const ALIGN_AXES = Object.freeze({
  x: { position:'x', size:'length', labels:['Left','Center','Right'], title:'Left / Right' },
  y: { position:'y', size:'width', labels:['Back','Center','Front'], title:'Front / Back' },
  z: { position:'z', size:'height', labels:['Bottom','Middle','Top'], title:'Height' }
});
export const ALIGN_MODES = Object.freeze(['min','center','max']);
export function alignCoordinate(box, axis, mode) {
  const spec=ALIGN_AXES[axis];
  return box[spec.position]+box[spec.size]*(mode==='min'?0:mode==='center'?.5:1);
}
export function alignedBoxes(boxes, selectedIds, referenceId, axis, mode) {
  if (!ALIGN_AXES[axis] || !ALIGN_MODES.includes(mode)) return boxes;
  const ref=boxes.find(b=>b.id===referenceId);
  if (!ref || !selectedIds.includes(referenceId) || selectedIds.length<2) return boxes;
  const spec=ALIGN_AXES[axis], anchor=alignCoordinate(ref,axis,mode);
  return boxes.map(b=>b.id===referenceId || !selectedIds.includes(b.id) ? {...b}
    : {...b,[spec.position]:anchor-b[spec.size]*(mode==='min'?0:mode==='center'?.5:1)});
}
const alignBox=(id,badge,colorTheme,x,y,z,length,width,height)=>({id,badge,colorTheme,x,y,z,length,width,height,rotation:0,allowedActions:[]});
const alignTask=(step,title,instruction,requirements,initialBoxes,axes)=>{
  const referenceId='b1',ids=initialBoxes.map(b=>b.id);
  const targets=requirements.reduce((boxes,[axis,mode])=>alignedBoxes(boxes,ids,referenceId,axis,mode),initialBoxes);
  return {step,stage:6,title,instruction,initialBoxes,targets,referenceId,axes,requirements,initialCamera:'ISO',allowedActions:[],
    hintLevels:[`Look at ${requirements.map(([a,m])=>m==='center'?(a==='z'?'middle heights':'centers'):ALIGN_AXES[a].labels[ALIGN_MODES.indexOf(m)].toLowerCase()+(a==='z'?' faces':' edges')).join(' and ')}. Compare A ★ with the other shapes.`,
      `Use ${requirements.map(([a])=>ALIGN_AXES[a].title).join(' and ')}. Reference A ★ stays still.`,
      `Choose A ★ as Reference. Click ${requirements.map(([a,m])=>ALIGN_AXES[a].title+': '+ALIGN_AXES[a].labels[ALIGN_MODES.indexOf(m)]).join(', then ')}. Undo or Reset lets you try again.`]};
};
const horizontalPair=()=>[alignBox('b1','A ★','coral',42,12,0,30,18,12),alignBox('b2','B ◆','cobalt',12,50,0,16,16,10)];
const depthPair=()=>[alignBox('b1','A ★','coral',12,34,0,20,30,12),alignBox('b2','B ◆','cobalt',64,8,0,18,14,10)];
const heightPair=()=>[alignBox('b1','A ★','coral',12,12,24,24,18,18),alignBox('b2','B ◆','cobalt',64,50,4,18,16,10)];
export const STAGE_6_STEPS=Object.freeze([
  alignTask(1,'Match the Left Edges','Click a dot to line up the left edges.',[['x','min']],horizontalPair(),['x']),
  alignTask(2,'Match the Centers','Line up the centers.',[['x','center']],horizontalPair(),['x']),
  alignTask(3,'Match the Right Edges','Line up the right edges.',[['x','max']],horizontalPair(),['x']),
  alignTask(4,'Match the Front Edges','Choose the reference. Align the front edges.',[['y','max']],depthPair(),['y']),
  alignTask(5,'Center Front to Back','Match the centers from front to back.',[['y','center']],depthPair(),['y']),
  alignTask(6,'Match the Back Edges','Line up the back edges.',[['y','min']],depthPair(),['y']),
  alignTask(7,'Match the Bottoms','Line up the bottoms.',[['z','min']],heightPair(),['z']),
  alignTask(8,'Match the Middle Heights','Line up the middle heights.',[['z','center']],heightPair(),['z']),
  alignTask(9,'Match the Tops','Line up the tops. Keep the sizes the same.',[['z','max']],heightPair(),['z'])
]);
export function initialAlignState(cfg) {
  return {version:1,selectedIds:cfg.step<=9?cfg.initialBoxes.map(b=>b.id):[],multiple:cfg.step<=9,active:cfg.step<=3,
    referenceId:cfg.step<=3?cfg.referenceId:null,operations:[],undo:null,feedback:'Reference stays still. Use A ★ as Reference.'};
}
export function selectAlignBox(state,id,shift=false) {
  if(state.currentStage!==6 || !state.boxes.some(b=>b.id===id))return state;
  const a=state.align;
  if(a.active){
    if(!a.selectedIds.includes(id))return {...state,align:{...a,feedback:'Select this shape before choosing it as Reference.'}};
    return {...state,align:{...a,referenceId:id,feedback:id===getStepConfig(state.currentStep,6).referenceId?'Reference A ★ stays still. Click a dot.':'Use A ★ as Reference for this task. No shapes moved.'}};
  }
  const selectedIds=a.multiple||shift?(a.selectedIds.includes(id)?a.selectedIds.filter(n=>n!==id):[...a.selectedIds,id]):[id];
  return {...state,align:{...a,selectedIds,referenceId:selectedIds.includes(a.referenceId)?a.referenceId:null,feedback:`${selectedIds.length} shapes selected. Choose Align when ready.`}};
}
export function setAlignMode(state,active) {
  if(state.currentStage!==6 || (active && state.align.selectedIds.length<2))return state;
  return {...state,align:{...state.align,active,feedback:active?'Choose a selected shape as Reference.':'Selection mode. Choose shapes, then Align.'}};
}
export function previewAlign(state,axis,mode) {
  if(state.currentStage!==6 || !state.align.active || state.align.referenceId!==getStepConfig(state.currentStep,6).referenceId)return state.boxes;
  return alignedBoxes(state.boxes,state.align.selectedIds,state.align.referenceId,axis,mode);
}
export function applyAlign(state,axis,mode) {
  if(state.currentStage!==6)return state;
  const cfg=getStepConfig(state.currentStep,6),a=state.align;
  if(!a.active || a.referenceId!==cfg.referenceId || !a.selectedIds.includes(a.referenceId) || a.selectedIds.length<2 || !cfg.axes.includes(axis) || !ALIGN_MODES.includes(mode))return state;
  const boxes=previewAlign(state,axis,mode);
  if(boxes.some(b=>b.z<0))return {...state,align:{...a,feedback:'That would go below the workplane. Try another dot.'}};
  const key=`${axis}:${mode}`;
  // One local undo, not a global history. A no-op repeat keeps the last useful undo.
  const changed=boxes.some((b,i)=>['x','y','z'].some(k=>b[k]!==state.boxes[i][k]));
  const result={...state,boxes,box:toPlainBox(boxes[0]),align:{...a,operations:[...new Set([...a.operations,key])],
    undo:changed?{boxes:state.boxes.map(b=>({...b})),operations:[...a.operations]}:a.undo,
    feedback:`Aligned ${ALIGN_AXES[axis].labels[ALIGN_MODES.indexOf(mode)]} (${ALIGN_AXES[axis].title}). Reference stays still. Undo Align to try again.`}};
  if(evaluateAlignMatch(result).matched&&!result.completedSteps.includes(result.currentStep))result.completedSteps=[...result.completedSteps,result.currentStep];
  return result;
}
export function undoAlign(state) {
  if(state.currentStage!==6 || !state.align.undo)return state;
  const u=state.align.undo;
  return {...state,boxes:u.boxes.map(b=>({...b})),box:toPlainBox(u.boxes[0]),align:{...state.align,operations:[...u.operations],undo:null,feedback:'Last alignment undone. Reference stays still.'}};
}
// Only positions and validated Align UI state restore; configured dimensions/rotation remain authoritative.
export function restoreAlignSnapshot(state,snap) {
  const cfg=getStepConfig(state.currentStep,6),raw=snap.align;
  if(raw?.version!==1)return {...state,boxes:cfg.initialBoxes.map(b=>({...b})),box:toPlainBox(cfg.initialBoxes[0]),align:initialAlignState(cfg)};
  const positions=(saved)=>cfg.initialBoxes.map(initial=>{
    const b=saved?.find(b=>b?.id===initial.id);
    if(initial.id===cfg.referenceId)return {...initial};
    return {...initial,...Object.fromEntries(['x','y','z'].map(k=>[k,Number.isFinite(b?.[k])&&b[k]>=0&&b[k]<=100?b[k]:initial[k]]))};
  });
  const ids=cfg.initialBoxes.map(b=>b.id),ops=v=>Array.isArray(v)?[...new Set(v.filter(x=>typeof x==='string' && /^[xyz]:(min|center|max)$/.test(x)))]:[];
  const selectedIds=Array.isArray(raw.selectedIds)?[...new Set(raw.selectedIds.filter(id=>ids.includes(id)))]:[];
  const boxes=positions(snap.boxes);
  return {...state,boxes,box:toPlainBox(boxes[0]),align:{...initialAlignState(cfg),selectedIds,multiple:!!raw.multiple,active:!!raw.active&&selectedIds.length>=2,
    referenceId:selectedIds.includes(raw.referenceId)?raw.referenceId:null,operations:ops(raw.operations),
    undo:raw.undo&&Array.isArray(raw.undo.boxes)?{boxes:positions(raw.undo.boxes),operations:ops(raw.undo.operations)}:null}};
}
export function evaluateAlignMatch(state) {
  const cfg=getStepConfig(state.currentStep,6),a=state.align;
  const boxResults=cfg.targets.map(t=>{const b=state.boxes.find(b=>b.id===t.id);return {id:t.id,matched:!!b&&['x','y','z','length','width','height','rotation'].every(k=>Math.abs(b[k]-t[k])<1e-6)&&!b.orientation};});
  const operationsOk=cfg.requirements.every(([axis,mode])=>a.operations.includes(`${axis}:${mode}`));
  const matched=boxResults.every(r=>r.matched)&&operationsOk&&a.referenceId===cfg.referenceId&&cfg.initialBoxes.every(b=>a.selectedIds.includes(b.id));
  return {matched,boxResults,faceOk:true,rotOk:true};
}

export const STAGES = Object.freeze({
  1: {
    id: 1,
    name: 'Stage 1 — Basics',
    shortName: 'Stage 1',
    steps: STEPS
  },
  2: {
    id: 2,
    name: 'Stage 2 — Challenge',
    shortName: 'Stage 2',
    steps: STAGE_2_STEPS
  },
  3: { id: 3, name: 'Stage 3 — Size & Lift', shortName: 'Stage 3', steps: STAGE_3_STEPS },
  4: { id: 4, name: 'Stage 4 — Rotate in 3D', shortName: 'Stage 4', steps: STAGE_4_STEPS },
  5: { id: 5, name: 'Stage 5 — Rotation Challenge', shortName: 'Stage 5', steps: STAGE_5_STEPS },
  6: { id: 6, name: 'Stage 6 — Align Shapes', shortName: 'Stage 6', steps: STAGE_6_STEPS }
});

// Legacy Stage 1 alias retained for existing consumers; navigation uses getStageStepCount.
export const TOTAL_STEPS = STEPS.length;

export function getStageConfig(stageId = 1) {
  return STAGES[[1, 2, 3, 4, 5, 6].includes(stageId) ? stageId : 1];
}

export function getStageStepCount(stageId = 1) {
  return getStageConfig(stageId).steps.length;
}

export function getStepConfig(stepNumber, stageId = 1) {
  const stage = getStageConfig(stageId);
  const index = Math.max(0, Math.min(stage.steps.length - 1, (Number(stepNumber) || 1) - 1));
  return stage.steps[index];
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * 180-degree modulo normalization for symmetric cuboids without directional markers.
 */
export function normalizeRotation(deg) {
  const raw = Number(deg) || 0;
  const mod = ((raw % 180) + 180) % 180;
  return Math.round(mod) % 180;
}

/**
 * 360-degree modulo normalization for directional blocks (handles 270 deg === -90 deg).
 */
export function normalizeRotation360(deg) {
  const raw = Number(deg) || 0;
  const mod = ((Math.round(raw) % 360) + 360) % 360;
  return mod === 360 ? 0 : mod;
}

/**
 * Shortest angular distance in degrees (0..180) between two angles a and b.
 */
export function angleDiff360(a, b) {
  const na = normalizeRotation360(a);
  const nb = normalizeRotation360(b);
  const diff = Math.abs(na - nb) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Shortest angular distance modulo 180 degrees (0..90) for symmetric cuboids.
 */
export function angleDiff180(a, b) {
  const na = normalizeRotation(a);
  const nb = normalizeRotation(b);
  const diff = Math.abs(na - nb) % 180;
  return diff > 90 ? 180 - diff : diff;
}

/**
 * Shared 3D coordinate basis for both rendering and target validation.
 * Rotation pivots around the horizontal center (cx, cy) of the unrotated box.
 * Also computes 3D directional marker geometry (`directionMarker`) that rotates with the box.
 */
export function getBoxVertices(box) {
  if (box.orientation) {
    const hx = box.length/2, hy = box.width/2, hz = box.height/2;
    const corners = [[-hx,-hy,-hz],[hx,-hy,-hz],[hx,hy,-hz],[-hx,hy,-hz],[-hx,-hy,hz],[hx,-hy,hz],[hx,hy,hz],[-hx,hy,hz]]
      .map(point => orientedPoint(box,point));
    const bounds = axis => [Math.min(...corners.map(p=>p[axis])), Math.max(...corners.map(p=>p[axis]))];
    const [x0,x1] = bounds('x'), [y0,y1] = bounds('y'), [z0,z1] = bounds('z');
    return {corners,x0,x1,y0,y1,z0,z1,cx:box.x+hx,cy:box.y+hy,effLength:x1-x0,effWidth:y1-y0};
  }
  const rot360 = normalizeRotation360(box.rotation);
  const rot180 = normalizeRotation(box.rotation);
  const cx = box.x + box.length / 2;
  const cy = box.y + box.width / 2;
  const z0 = box.z || 0;
  const z1 = z0 + box.height;

  // Directional marker (end stripe + arrow triangle on top face) rotates by full 360 deg
  const rad360 = (rot360 * Math.PI) / 180;
  const ux = Math.cos(rad360);
  const uy = Math.sin(rad360);
  const vx = -Math.sin(rad360);
  const vy = Math.cos(rad360);
  const hx = box.length / 2;
  const hy = box.width / 2;

  const toWorldTop = (lx, ly) => ({
    x: cx + lx * ux + ly * vx,
    y: cy + lx * uy + ly * vy,
    z: z1
  });

  const directionMarker = {
    band: [
      toWorldTop(hx * 0.32, -hy * 0.88),
      toWorldTop(hx * 0.92, -hy * 0.88),
      toWorldTop(hx * 0.92, hy * 0.88),
      toWorldTop(hx * 0.32, hy * 0.88)
    ],
    arrow: [
      toWorldTop(hx * 0.78, 0),
      toWorldTop(-hx * 0.35, -hy * 0.52),
      toWorldTop(-hx * 0.35, hy * 0.52)
    ]
  };

  if (rot180 === 0 || rot180 === 90) {
    const effLength = rot180 === 90 ? box.width : box.length;
    const effWidth = rot180 === 90 ? box.length : box.width;

    const x0 = cx - effLength / 2;
    const x1 = cx + effLength / 2;
    const y0 = cy - effWidth / 2;
    const y1 = cy + effWidth / 2;

    return {
      x0,
      x1,
      y0,
      y1,
      z0,
      z1,
      cx,
      cy,
      effLength,
      effWidth,
      rot360,
      directionMarker,
      corners: [
        { x: x0, y: y0, z: z0 }, // 0: back-left-bottom
        { x: x1, y: y0, z: z0 }, // 1: back-right-bottom
        { x: x1, y: y1, z: z0 }, // 2: front-right-bottom
        { x: x0, y: y1, z: z0 }, // 3: front-left-bottom
        { x: x0, y: y0, z: z1 }, // 4: back-left-top
        { x: x1, y: y0, z: z1 }, // 5: back-right-top
        { x: x1, y: y1, z: z1 }, // 6: front-right-top
        { x: x0, y: y1, z: z1 }  // 7: front-left-top
      ]
    };
  }

  // Smooth intermediate angle during click-and-hold turning
  const localBase = [
    { lx: -hx, ly: -hy },
    { lx: hx, ly: -hy },
    { lx: hx, ly: hy },
    { lx: -hx, ly: hy }
  ];

  const baseCorners = localBase.map(({ lx, ly }) => ({
    x: cx + lx * ux + ly * vx,
    y: cy + lx * uy + ly * vy
  }));

  const xs = baseCorners.map((p) => p.x);
  const ys = baseCorners.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);

  return {
    x0,
    x1,
    y0,
    y1,
    z0,
    z1,
    cx,
    cy,
    effLength: x1 - x0,
    effWidth: y1 - y0,
    rot360,
    directionMarker,
    corners: [
      { x: baseCorners[0].x, y: baseCorners[0].y, z: z0 },
      { x: baseCorners[1].x, y: baseCorners[1].y, z: z0 },
      { x: baseCorners[2].x, y: baseCorners[2].y, z: z0 },
      { x: baseCorners[3].x, y: baseCorners[3].y, z: z0 },
      { x: baseCorners[0].x, y: baseCorners[0].y, z: z1 },
      { x: baseCorners[1].x, y: baseCorners[1].y, z: z1 },
      { x: baseCorners[2].x, y: baseCorners[2].y, z: z1 },
      { x: baseCorners[3].x, y: baseCorners[3].y, z: z1 }
    ]
  };
}

/**
 * Normalizes step config into an array of initial boxes and targets while keeping Stage 1 compatibility.
 */
export function getStepBoxesAndTargets(cfg) {
  if (Array.isArray(cfg.initialBoxes) && Array.isArray(cfg.targets)) {
    return {
      initialBoxes: cfg.initialBoxes.map((b) => ({ ...b })),
      targets: cfg.targets.map((t) => ({ ...t }))
    };
  }
  return {
    initialBoxes: [
      {
        id: 'b1',
        badge: '',
        colorTheme: 'coral',
        hasDirectionMarker: false,
        allowedActions: [cfg.allowedAction],
        ...cfg.initialBox
      }
    ],
    targets: [
      {
        id: 'b1',
        badge: '',
        colorTheme: 'coral',
        hasDirectionMarker: false,
        ...cfg.target
      }
    ]
  };
}

export function toPlainBox(b) {
  return {
    x: b.x,
    y: b.y,
    z: b.z,
    length: b.length,
    width: b.width,
    height: b.height,
    rotation: b.rotation,
    ...(b.orientation ? { orientationVersion: ORIENTATION_VERSION, orientation: [...b.orientation] } : {})
  };
}

export function createStepState(stepNumber = 1, completedSteps = [], stageId = 1) {
  const normalizedStage = [1, 2, 3, 4, 5, 6].includes(stageId) ? stageId : 1;
  const cfg = getStepConfig(stepNumber, normalizedStage);
  const cam = CAMERA_PRESETS[cfg.initialCamera] || CAMERA_PRESETS.ISO;
  const { initialBoxes } = getStepBoxesAndTargets(cfg);

  return {
    ...(normalizedStage===6 ? {align:initialAlignState(cfg)} : {}),
    version: isRotationStage(normalizedStage) ? 5 : 4,
    currentStage: normalizedStage,
    currentStep: cfg.step,
    completedSteps: Array.from(new Set(completedSteps)),
    box: toPlainBox(initialBoxes[0]),
    boxes: initialBoxes.map((b) => ({ ...b })),
    selectedBoxId: initialBoxes[0].id || 'b1',
    selected: true,
    camera: { ...cam },
    hintActive: false,
    freePlay: false
  };
}

export function createInitialState(stageId = 1) {
  return createStepState(1, [], stageId);
}

/**
 * Evaluates a single box against its corresponding fixed target.
 */
export function evaluateSingleBoxMatch(box, target) {
  if (target.orientation) {
    const rotOk = orientationDistance(box.orientation, target.orientation) <= 6;
    const center = b => [b.x+b.length/2,b.y+b.width/2,b.z+b.height/2];
    const dimensionsOk = ['length','width','height'].every(key=>Math.abs(box[key]-target[key]) < 0.001);
    const centerOk = center(box).every((n,i)=>Math.abs(n-center(target)[i]) < 0.001);
    return {id:box.id, matched:rotOk && dimensionsOk && centerOk, rotOk,
      x0Ok:centerOk,x1Ok:dimensionsOk,y0Ok:centerOk,y1Ok:dimensionsOk,z0Ok:centerOk,z1Ok:dimensionsOk};
  }
  const bv = getBoxVertices(box);
  const tv = getBoxVertices(target);

  const tol = 3.0;
  const x0Ok = Math.abs(bv.x0 - tv.x0) <= tol;
  const x1Ok = Math.abs(bv.x1 - tv.x1) <= tol;
  const y0Ok = Math.abs(bv.y0 - tv.y0) <= tol;
  const y1Ok = Math.abs(bv.y1 - tv.y1) <= tol;
  const z0Ok = Math.abs(bv.z0 - tv.z0) <= tol;
  const z1Ok = Math.abs(bv.z1 - tv.z1) <= tol;

  const rotOk = target.hasDirectionMarker
    ? angleDiff360(box.rotation, target.rotation) === 0
    : angleDiff180(box.rotation, target.rotation) === 0;

  const matched = x0Ok && x1Ok && y0Ok && y1Ok && z0Ok && z1Ok && rotOk;

  return {
    id: box.id || 'b1',
    matched,
    x0Ok,
    x1Ok,
    y0Ok,
    y1Ok,
    z0Ok,
    z1Ok,
    rotOk
  };
}

/**
 * Evaluates whether the current state matches the step target(s).
 * Uses fixed `id` mapping for multi-block steps so traversal order never alters results.
 */
export function evaluateStepMatch(state) {
  if(state.currentStage===6)return evaluateAlignMatch(state);
  const stageId = state.currentStage || 1;
  const cfg = getStepConfig(state.currentStep, stageId);
  const { targets } = getStepBoxesAndTargets(cfg);
  const boxes =
    stageId === 1 && state.box
      ? [state.box]
      : Array.isArray(state.boxes) && state.boxes.length > 0
        ? state.boxes
        : [state.box];

  const boxResults = targets.map((target, idx) => {
    const matchingBox = boxes.find((b) => b.id && b.id === target.id) || boxes[idx] || boxes[0];
    const result = evaluateSingleBoxMatch(matchingBox, target);
    if (stageId === 3) {
      result.matched = result.matched && ['length','width','height','z'].every(key => Math.abs(matchingBox[key] - target[key]) <= 2.5);
    }
    return result;
  });

  const faceOk = !cfg.requiredFace || state.camera.face === cfg.requiredFace;
  const allBoxesMatched = boxResults.every((r) => r.matched);
  const matched = allBoxesMatched && faceOk;

  const first = boxResults[0] || {
    x0Ok: false,
    x1Ok: false,
    y0Ok: false,
    y1Ok: false,
    z0Ok: false,
    z1Ok: false,
    rotOk: false
  };

  return {
    matched,
    boxResults,
    x0Ok: first.x0Ok,
    x1Ok: first.x1Ok,
    y0Ok: first.y0Ok,
    y1Ok: first.y1Ok,
    z0Ok: first.z0Ok,
    z1Ok: first.z1Ok,
    rotOk: first.rotOk,
    faceOk
  };
}

/**
 * Snaps active properties when dragged close to target.
 */
export function snapBoxToTargetIfClose(box, target, allowedActionsList) {
  const next = { ...box };
  const actions = Array.isArray(allowedActionsList) ? allowedActionsList : [allowedActionsList];

  if (actions.includes('move') || actions.includes('all')) {
    if (Math.abs(next.x - target.x) <= 6.0 && Math.abs(next.y - target.y) <= 6.0) {
      next.x = target.x;
      next.y = target.y;
    }
  }
  if (actions.includes('length') || actions.includes('all')) {
    if (Math.abs(next.length - target.length) <= 2.5) {
      next.length = target.length;
    }
  }
  if (actions.includes('width') || actions.includes('all')) {
    if (Math.abs(next.width - target.width) <= 2.5) {
      next.width = target.width;
    }
  }
  if (actions.includes('height') || actions.includes('all')) {
    if (Math.abs(next.height - target.height) <= 2.5) {
      next.height = target.height;
    }
  }
  if (actions.includes('lift') || actions.includes('all')) {
    if (Math.abs(next.z - target.z) <= 2.5) {
      next.z = target.z;
    }
  }
  if (actions.includes('rotate') || actions.includes('all')) {
    if (target.hasDirectionMarker) {
      if (angleDiff360(next.rotation, target.rotation) <= 16) {
        next.rotation = normalizeRotation360(target.rotation);
      }
    } else {
      if (angleDiff180(next.rotation, target.rotation) <= 16) {
        next.rotation = normalizeRotation(target.rotation);
      }
    }
  }
  return next;
}

/**
 * Selects a specific block by id in multi-block steps.
 */
export function selectBoxInState(state, boxId) {
  if (!Array.isArray(state.boxes) || state.boxes.length === 0) return state;
  const found = state.boxes.find((b) => b.id === boxId);
  if (!found) return state;
  return {
    ...state,
    selectedBoxId: found.id,
    box: toPlainBox(found)
  };
}

/**
 * Updates only the currently selected box (or specified `updates.boxId`),
 * and only the properties permitted by the step/block configuration.
 */
export function updateBoxInState(state, updates, enableSnap = true) {
  if(state.currentStage===6)return state;
  const stageId = state.currentStage || 1;
  const cfg = getStepConfig(state.currentStep, stageId);
  const { targets } = getStepBoxesAndTargets(cfg);

  const hasBoxesArray = Array.isArray(state.boxes) && state.boxes.length > 0;
  const boxes = hasBoxesArray
    ? state.boxes.map((b) => ({ ...b }))
    : [{ id: 'b1', ...state.box }];

  const targetBoxId = updates.boxId || state.selectedBoxId || boxes[0].id || 'b1';
  const boxIndex = Math.max(
    0,
    boxes.findIndex((b) => (b.id || 'b1') === targetBoxId)
  );
  // Keep `state.box` synchronization if Stage 1 tests mutated `state.box` directly
  const b = boxes.length === 1 && state.box ? { ...boxes[0], ...state.box } : boxes[boxIndex];
  const target = targets.find((t) => t.id === b.id) || targets[boxIndex] || targets[0];

  const stepAllowed = state.freePlay
    ? ['all']
    : Array.isArray(b.allowedActions)
      ? b.allowedActions
      : Array.isArray(cfg.allowedActions)
        ? cfg.allowedActions
        : [cfg.allowedAction];

  if (isRotationStage(stageId)) {
    const action = updates.turnAction;
    const degrees = updates.turnDegrees;
    if (!cfg.allowedActions.includes(action) || !Number.isFinite(degrees)) return state;
    const box = { ...cfg.initialBoxes[0], orientation: rotateWorld(b.orientation, TURN_AXES[action].axis, degrees) };
    const next = { ...state, box: toPlainBox(box), boxes:[box] };
    if (evaluateStepMatch(next).matched && !next.completedSteps.includes(next.currentStep)) {
      next.completedSteps = [...next.completedSteps,next.currentStep];
    }
    return next;
  }

  if (stageId === 3) {
    const initial = cfg.initialBoxes[0];
    const actions = cfg.allowedActions;
    const next = { ...b };
    const finite = value => Number.isFinite(Number(value));
    if (actions.includes('scale') && finite(updates.scale)) {
      const minScale = Math.max(...['length','width','height'].map(k => SIZE_LIMITS.min / initial[k]));
      const maxScale = Math.min(SIZE_LIMITS.maxLength / initial.length, SIZE_LIMITS.maxWidth / initial.width, SIZE_LIMITS.maxHeight / initial.height);
      let factor = clamp(Number(updates.scale), minScale, maxScale);
      const targetFactor = target.length / initial.length;
      if (enableSnap && Math.abs(factor - targetFactor) <= 0.08) factor = targetFactor;
      for (const key of ['length','width','height']) next[key] = initial[key] * factor;
    }
    for (const [key, maximum] of [['length', SIZE_LIMITS.maxLength], ['width', SIZE_LIMITS.maxWidth]]) {
      if (actions.includes(key) && finite(updates[key])) {
        next[key] = clamp(Number(updates[key]), SIZE_LIMITS.min, maximum);
        if (enableSnap && Math.abs(next[key] - target[key]) <= 2.5) next[key] = target[key];
      }
    }
    if (actions.includes('lift') && finite(updates.z)) {
      next.z = clamp(Number(updates.z), 0, SIZE_LIMITS.maxLift);
      if (enableSnap && Math.abs(next.z - target.z) <= 2.5) next.z = target.z;
    }
    next.x = initial.x + initial.length / 2 - next.length / 2;
    next.y = initial.y + initial.width / 2 - next.width / 2;
    const result = { ...state, box: toPlainBox(next), boxes: [next] };
    if (evaluateStepMatch(result).matched && !result.completedSteps.includes(result.currentStep)) {
      result.completedSteps = [...result.completedSteps, result.currentStep];
    }
    return result;
  }

  if (stepAllowed.includes('view-top') || stepAllowed.includes('view-front')) {
    return state;
  }

  let length = b.length;
  let width = b.width;
  let height = b.height;
  let x = b.x;
  let y = b.y;
  let z = b.z;
  let rotation = b.rotation;

  if (stepAllowed.includes('all') || stepAllowed.includes('length')) {
    if (updates.length !== undefined) length = clamp(Math.round(updates.length), 6, WORKPLANE.width - x);
  }
  if (stepAllowed.includes('all') || stepAllowed.includes('width')) {
    if (updates.width !== undefined) width = clamp(Math.round(updates.width), 6, WORKPLANE.depth - y);
  }
  if (stepAllowed.includes('all') || stepAllowed.includes('height')) {
    if (updates.height !== undefined) height = clamp(Math.round(updates.height), 2, WORKPLANE.maxHeight);
  }
  if (stepAllowed.includes('all') || stepAllowed.includes('move')) {
    if (updates.x !== undefined) x = clamp(Math.round(updates.x), 0, WORKPLANE.width - length);
    if (updates.y !== undefined) y = clamp(Math.round(updates.y), 0, WORKPLANE.depth - width);
  }
  if (stepAllowed.includes('all') || stepAllowed.includes('lift')) {
    if (updates.z !== undefined) z = clamp(Math.round(updates.z), 0, 36);
  }
  if (stepAllowed.includes('all') || stepAllowed.includes('rotate')) {
    if (updates.rotation !== undefined) {
      rotation = b.hasDirectionMarker
        ? normalizeRotation360(updates.rotation)
        : stageId === 2
          ? normalizeRotation360(updates.rotation)
          : normalizeRotation(updates.rotation);
    }
  }

  const rawBox = { ...b, x, y, z, length, width, height, rotation };
  const finalBox =
    enableSnap && !state.freePlay ? snapBoxToTargetIfClose(rawBox, target, stepAllowed) : rawBox;

  boxes[boxIndex] = finalBox;

  const nextState = {
    ...state,
    selectedBoxId: finalBox.id || 'b1',
    box: toPlainBox(boxes[0]),
    boxes
  };

  const match = evaluateStepMatch(nextState);
  if (match.matched && !nextState.completedSteps.includes(nextState.currentStep)) {
    nextState.completedSteps = [...nextState.completedSteps, nextState.currentStep];
  }

  return nextState;
}

/**
 * Updates ONLY the camera state. Never mutates `state.box` or `state.boxes`.
 */
export function setCameraInState(state, cameraUpdates) {
  if (isRotationStage(state.currentStage) || state.currentStage===6) return state;
  const nextCamera = {
    ...state.camera,
    ...cameraUpdates
  };
  const nextState = {
    ...state,
    box: { ...state.box },
    boxes: Array.isArray(state.boxes) ? state.boxes.map((b) => ({ ...b })) : [{ ...state.box }],
    camera: nextCamera
  };
  const match = evaluateStepMatch(nextState);
  if (match.matched && !nextState.completedSteps.includes(nextState.currentStep)) {
    nextState.completedSteps = [...nextState.completedSteps, nextState.currentStep];
  }
  return nextState;
}
