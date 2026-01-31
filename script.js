const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let reps = 0;
let stage = "up";
let exercise = "squat";

function setExercise(type) {
  exercise = type;
  reps = 0;
  stage = "up";
  document.getElementById("exercise").innerText =
    `Exercise: ${type === "squat" ? "Squat" : "Push-up"}`;
  document.getElementById("counter").innerText = "Reps: 0";
}

function angle(a, b, c) {
  const ab = Math.hypot(b.x - a.x, b.y - a.y);
  const bc = Math.hypot(c.x - b.x, c.y - b.y);
  const ac = Math.hypot(c.x - a.x, c.y - a.y);
  return Math.acos((ab*ab + bc*bc - ac*ac) / (2*ab*bc)) * 180/Math.PI;
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

  let ang;

  if (exercise === "squat") {
    const hip = results.poseLandmarks[24];
    const knee = results.poseLandmarks[26];
    const ankle = results.poseLandmarks[28];
    ang = angle(hip, knee, ankle);

    if (ang < 90 && stage === "up") {
      stage = "down";
      document.getElementById("feedback").innerText = "⬇ Go Down";
    }

    if (ang > 160 && stage === "down") {
      stage = "up";
      reps++;
      document.getElementById("counter").innerText = `Reps: ${reps}`;
      document.getElementById("feedback").innerText = "✅ Good Squat";
    }
  }

  if (exercise === "pushup") {
    const shoulder = results.poseLandmarks[12];
    const elbow = results.poseLandmarks[14];
    const wrist = results.poseLandmarks[16];
    ang = angle(shoulder, elbow, wrist);

    if (ang < 90 && stage === "up") {
      stage = "down";
      document.getElementById("feedback").innerText = "⬇ Lower Body";
    }

    if (ang > 160 && stage === "down") {
      stage = "up";
      reps++;
      document.getElementById("counter").innerText = `Reps: ${reps}`;
      document.getElementById("feedback").innerText = "🔥 Strong Push-up";
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
