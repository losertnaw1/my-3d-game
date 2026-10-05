// ============================================================
// ZONES — Build order matters: landmarks first, ground cover last
// ============================================================
import { buildAncientGrove } from './AncientGrove.js';
import { buildMeadow } from './Meadow.js';
import { buildPond } from './Pond.js';
import { buildDryValley } from './DryValley.js';
import { buildAutumnHill } from './AutumnHill.js';
import { buildFlowerValley } from './FlowerValley.js';
import { buildPineForest } from './PineForest.js';
import { buildWilds } from './Wilds.js';
import { buildBorder } from './Border.js';
import { buildPaths } from './Paths.js';

export const ZONE_BUILDERS = [
  ['Ancient Grove', buildAncientGrove],
  ['Meadow', buildMeadow],
  ['Pond', buildPond],
  ['Dry Valley', buildDryValley],
  ['Autumn Hill', buildAutumnHill],
  ['Flower Valley', buildFlowerValley],
  ['Pine Forest', buildPineForest],
  ['Wilds', buildWilds],
  ['Border', buildBorder],
  ['Paths', buildPaths],
];

export function buildZones(ctx) {
  for (const [, build] of ZONE_BUILDERS) build(ctx);
}
