// World placement is separate from the approved, full-size asset preview.
// Two successive 20% horizontal area increases; preserve cave clearance and model heights.
export const CENTRAL_AREA_FACTOR=1.2*1.2;
export const CENTRAL_HORIZONTAL_FACTOR=Math.sqrt(CENTRAL_AREA_FACTOR);
export const CENTRAL_JUNGLE_SCALE=.6*CENTRAL_HORIZONTAL_FACTOR;
export const CENTRAL_JUNGLE_HEIGHT=.6;
export const CENTRAL_HABITAT_RADIUS=34*CENTRAL_HORIZONTAL_FACTOR;
