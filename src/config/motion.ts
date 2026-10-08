export const particleMotion = {
  assembleDuration: 2.4,
  assembleDelay: 0.22,
  driftAmplitude: 0.014,
  driftSpeed: 0.40,
  mouseRadius: 0.76,
  mouseStrength: 0.235,
  mouseFalloff: 2.35,
  pointSize: 5.0,
  opacity: 0.92,

  // Keep the idle mark intact. Only a tiny fraction can breathe out and return.
  escapeThreshold: 0.966,
  escapeStrength: 0.18,
  escapeSpeed: 0.26,
  escapeTangential: 0.075,
  reabsorbTightness: 1.8,

  // Mouse interaction is intentionally gated. The logo never starts with a hole;
  // interaction begins only after a real pointer move and only near the mark.
  interactiveAfterAssemble: 0.93,
  pointerActivationRadius: 2.35,

  // First scroll phase: deconstruct toward flowing strands. This is a staging
  // target only; the final next-object target is intentionally not invented yet.
  scrollStart: 0.08,
  scrollDeconstructStrength: 0.72,
  scrollFlowStrength: 0.62,
} as const;

export const ambientMotion = {
  foreground: {
    count: 64,
    pointSize: 34,
    opacity: 0.115,
    speed: 0.21,
    flow: 0.15,
    parallax: 0.44,
    mouseRadius: 1.45,
    mouseStrength: 0.07,
    brightnessLow: 0.14,
    brightnessMid: 0.43,
    brightnessHigh: 0.92,
  },
  midground: {
    count: 690,
    pointSize: 7.2,
    opacity: 0.17,
    speed: 0.092,
    flow: 0.39,
    parallax: 0.14,
    mouseRadius: 1.65,
    mouseStrength: 0.17,
    brightnessLow: 0.11,
    brightnessMid: 0.44,
    brightnessHigh: 1.0,
  },
  background: {
    count: 820,
    pointSize: 2.25,
    opacity: 0.072,
    speed: 0.018,
    flow: 0.020,
    parallax: 0.016,
    mouseRadius: 1.9,
    mouseStrength: 0.010,
    brightnessLow: 0.075,
    brightnessMid: 0.23,
    brightnessHigh: 0.58,
  },
} as const;

export const atmosphereMotion = {
  opacity: 0.46,
  purpleFogStrength: 0.46,
  beamStrength: 0.26,
  mouseResponse: 0.065,
  speed: 0.048,
  pulseStrength: 0.06,
} as const;

export const energyFlowMotion = {
  streams: 6,
  pointsPerStream: 46,
  opacity: 0.105,
  pointSize: 3.0,
  speed: 0.050,
  mouseResponse: 0.09,
  trailStrength: 0.22,
} as const;

export const heroLayoutMotion = {
  // World-space quiet zone behind the HTML hero copy.
  textClearCenterY: -2.10,
  textClearHalfWidth: 2.65,
  textClearHalfHeight: 0.72,
  textClearStrength: 0.72,
} as const;

export const futureMorphConfig = {
  // Same particle indices will eventually receive a real next-object target array.
  // Current build intentionally stops at scroll deconstruction / flow staging.
  activeTarget: 'logo' as 'logo' | string,
  scrollProgress: 0,
  nextTargetReady: false,
};
