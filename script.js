const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let exercise = "squat";
let reps = 0;
let stage = "up";

let downFrames = 0;
let upFrames = 0;
let lastRepTime = 0;

let squatBaseHipY = null;
let pushupBaseShoulderY = null;

const STABLE_FRAMES = 12;     // stricter
const MIN_REP_TIME = 900;    // ms (prevents bounce reps)

// ---------------- UI ----------------
function setExercise(type) {
  exercise = type;
  reps = 0;
  stage = "up";
  downFrames = 0;
  upFrames = 0;
  squatBaseHipY = null;
  pushupBaseShoulderY = null;

  document.getElementById("counter").innerText = "Reps: 0";
  document.getElementById("exercise").innerText =
    `Exercise: ${type === "squat" ? "Squat" : "Push-up"}`;
  document.getElementById("feedback").innerText = "Get Ready";
}

// ---------------- Math Helpers ----------------
function angle(a, b, c) {
  const ab = Math.hypot(b.x - a.x, b.y - a.y);
  const bc = Math.hypot(c.x - b.x, c.y - b.y);
  const ac = Math.hypot(c.x - a.x, c.y - a.y);
  return Math.acos((ab * ab + bc * bc - ac * ac) / (2 * ab * bc)) * 180 / Math.PI;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// ---------------- MediaPipe Pose ----------------
const pose = new Pose({
  locateFile: file =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true
});

pose.onResults(results => {
  if (!results.poseLandmarks) return;

  const lm = results.poseLandmarks;
  const now = Date.now();

  /* ===================== SQUATS ===================== */
  if (exercise === "squat") {
    const hip = lm[24];
    const knee = lm[26];
    const ankle = lm[28];

    const kneeAngle = angle(hip, knee, ankle);
    const hipBelowKnee = hip.y > knee.y;

    if (squatBaseHipY === null) squatBaseHipY = hip.y;
    const hipDrop = hip.y - squatBaseHipY;

    // DOWN: deep squat only
    if (kneeAngle < 90 && hipBelowKnee && hipDrop > 0.05) {
      downFrames++;
      upFrames = 0;

      if (downFrames >= STABLE_FRAMES && stage === "up") {
        stage = "down";
        document.getElementById("feedback").innerText = "⬇ Hold deep squat";
      }
    }

    // UP: full extension
    if (kneeAngle > 170 && hipDrop < 0.02) {
      upFrames++;
      downFrames = 0;

      if (
        upFrames >= STABLE_FRAMES &&
        stage === "down" &&
        now - lastRepTime > MIN_REP_TIME
      ) {
        stage = "up";
        lastRepTime = now;
        reps++;

        const depthScore = clamp((0.12 - hipDrop) * 800, 60, 100);
        const stabilityScore = clamp(downFrames * 8, 60, 100);
        const speedScore = clamp((now - lastRepTime) / 10, 60, 100);
        const quality = Math.round(depthScore * 0.4 + stabilityScore * 0.3 + speedScore * 0.3);

        document.getElementById("counter").innerText = `Reps: ${reps}`;
        document.getElementById("feedback").innerText = `✅ Squat (${quality}%)`;

        squatBaseHipY = hip.y;
      }
    }
  }

  /* ===================== PUSH-UPS (STRICT) ===================== */
  if (exercise === "pushup") {
    const shoulder = lm[12];
    const elbow = lm[14];
    const wrist = lm[16];
    const hip = lm[24];
    const ankle = lm[28];

    const elbowAngle = angle(shoulder, elbow, wrist);

    // BODY STRAIGHTNESS (very strict)
    const bodyDeviation =
      Math.abs(shoulder.y - hip.y) +
      Math.abs(hip.y - ankle.y);

    const bodyStraight = bodyDeviation < 0.10;

    // CHEST MOVEMENT (most important)
    if (pushupBaseShoulderY === null) {
      pushupBaseShoulderY = shoulder.y;
    }

    const chestDrop = shoulder.y - pushupBaseShoulderY;

    // DOWN: chest must go down significantly
    if (
      elbowAngle < 80 &&
      chestDrop > 0.06 &&
      bodyStraight
    ) {
      downFrames++;
      upFrames = 0;

      if (downFrames >= STABLE_FRAMES && stage === "up") {
        stage = "down";
        document.getElementById("feedback").innerText = "⬇ Chest down & hold";
      }
    }

    // UP: full lockout
    if (
      elbowAngle > 170 &&
      chestDrop < 0.02 &&
      bodyStraight
    ) {
      upFrames++;
      downFrames = 0;

      if (
        upFrames >= STABLE_FRAMES &&
        stage === "down" &&
        now - lastRepTime > MIN_REP_TIME
      ) {
        stage = "up";
        lastRepTime = now;
        reps++;

        const depthScore = clamp((0.10 - chestDrop) * 900, 60, 100);
        const straightScore = bodyStraight ? 100 : 60;
        const speedScore = clamp((now - lastRepTime) / 10, 60, 100);
        const quality = Math.round(depthScore * 0.4 + straightScore * 0.4 + speedScore * 0.2);

        document.getElementById("counter").innerText = `Reps: ${reps}`;
        document.getElementById("feedback").innerText = `🔥 Push-up (${quality}%)`;

        pushupBaseShoulderY = shoulder.y;
      }
    }

    // reset baseline only when fully up & stable
    if (elbowAngle > 175 && chestDrop < 0.01) {
      pushupBaseShoulderY = shoulder.y;
    }
  }
});

// ---------------- Camera ----------------
const camera = new Camera(video, {
  onFrame: async () => {
    await pose.send({ image: video });
  },
  width: 480,
  height: 480
});

camera.start();


