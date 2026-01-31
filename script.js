const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let exercise = "squat";
let reps = 0;
let stage = "up";

let downFrames = 0;
let upFrames = 0;
let lastRepTime = 0;

const STABLE_FRAMES = 10;
const MIN_REP_TIME = 800; // ms

function setExercise(type) {
  exercise = type;
  reps = 0;
  stage = "up";
  downFrames = 0;
  upFrames = 0;
  document.getElementById("counter").innerText = "Reps: 0";
  document.getElementById("exercise").innerText =
    `Exercise: ${type === "squat" ? "Squat" : "Push-up"}`;
  document.getElementById("feedback").innerText = "Get Ready!";
}

function angle(a, b, c) {
  const ab = Math.hypot(b.x - a.x, b.y - a.y);
  const bc = Math.hypot(c.x - b.x, c.y - b.y);
  const ac = Math.hypot(c.x - a.x, c.y - a.y);
  return Math.acos((ab*ab + bc*bc - ac*ac) / (2*ab*bc)) * 180 / Math.PI;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function repQuality(depthScore, stabilityScore, speedScore) {
  return Math.round((depthScore * 0.4 + stabilityScore * 0.3 + speedScore * 0.3));
}

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

    // DOWN (deep squat)
    if (kneeAngle < 90 && hipBelowKnee) {
      downFrames++;
      upFrames = 0;

      if (downFrames >= STABLE_FRAMES && stage === "up") {
        stage = "down";
        document.getElementById("feedback").innerText = "⬇ Deep Squat Hold";
      }
    }

    // UP (fully standing)
    if (kneeAngle > 170) {
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

        // QUALITY
        const depthScore = Math.min(100, (90 - kneeAngle) * 2 + 60);
        const stabilityScore = Math.min(100, STABLE_FRAMES * 10);
        const speedScore = Math.min(100, (now - lastRepTime + 800) / 16);

        const quality = repQuality(depthScore, stabilityScore, speedScore);

        document.getElementById("counter").innerText = `Reps: ${reps}`;
        document.getElementById("feedback").innerText =
          `✅ Squat (${quality}% quality)`;
      }
    }
  }

  /* ===================== PUSH-UPS ===================== */
  if (exercise === "pushup") {
    const shoulder = lm[12];
    const elbow = lm[14];
    const wrist = lm[16];
    const hip = lm[24];
    const ankle = lm[28];

    const elbowAngle = angle(shoulder, elbow, wrist);

    // Body straightness
    const bodyDeviation =
      Math.abs(shoulder.y - hip.y) + Math.abs(hip.y - ankle.y);

    const bodyStraight = bodyDeviation < 0.15;

    // DOWN
    if (elbowAngle < 85 && bodyStraight) {
      downFrames++;
      upFrames = 0;

      if (downFrames >= STABLE_FRAMES && stage === "up") {
        stage = "down";
        document.getElementById("feedback").innerText = "⬇ Chest Down";
      }
    }

    // UP
    if (elbowAngle > 170 && bodyStraight) {
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

        const depthScore = Math.min(100, (85 - elbowAngle) * 3 + 60);
        const stabilityScore = bodyStraight ? 100 : 60;
        const speedScore = Math.min(100, (now - lastRepTime + 800) / 16);

        const quality = repQuality(depthScore, stabilityScore, speedScore);

        document.getElementById("counter").innerText = `Reps: ${reps}`;
        document.getElementById("feedback").innerText =
          `🔥 Push-up (${quality}% quality)`;
      }
    }
  }
});

const camera = new Camera(video, {
  onFrame: async () => {
    await pose.send({ image: video });
  },
  width: 480,
  height: 480
});

camera.start();


