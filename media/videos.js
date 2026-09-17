// media/videos.js — EDIT THIS FILE TO ADD OR CHANGE EXERCISE DEMOS.
//
// HOW TO USE (30-second version):
//   1. Add a line like:  "Exercise Name": "url",
//   2. Save. Done.
//
// The name is matched to your exercise name — case, spaces, punctuation
// and dashes are all ignored, so "Incline DB Press", "incline-db-press"
// and "Incline   DB   Press" all hit the same entry.
//
// Supported URL types (detected automatically):
//   • YouTube — any of: youtu.be/ID, youtube.com/watch?v=ID,
//               youtube.com/shorts/ID, youtube.com/embed/ID
//   • Direct video  → .mp4 .webm .ogg .mov .m4v
//   • Animated image → .gif
//   • Still image   → .png .jpg .jpeg .webp .avif
//
// If you don't add a line for an exercise, the app falls back to the
// automatic picture library (media/index.json), then to the YouTube
// search button. Nothing here is required — it's an override layer.

export const VIDEOS = {
  // ─── Your daily split ────────────────────────────────────────────
  "Reverse EZ Bar Curl":     "https://www.youtube.com/shorts/yXnhFGBSnxM",
  "Cable Side Lateral Raise":"https://www.youtube.com/shorts/KVauca12MF4",
  "Seated Cable Row":        "https://www.youtube.com/shorts/9YwQVY4Nb3E",
  "Lat Pulldown":            "https://www.youtube.com/shorts/91vWjU1tuCc",
  "Incline DB Press":        "https://www.youtube.com/shorts/AUJtWOQRHPI",
  "Incline Smith Press":     "https://www.youtube.com/shorts/OMlWrmnvUnY",
  "Bayesian Curl":           "https://www.youtube.com/shorts/_Z8Afknw_Fc",
  "Hack Squat":              "https://www.youtube.com/shorts/vaU2FSmUhNc",

  // ─── Extras (image fallbacks for the remaining seed lifts) ──────
  "Hammer Curl":             "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hammer_Curls/0.jpg",
  "Overhead Extension":      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Dumbbell_Triceps_Extension/0.jpg",
  "Incline DB Curl":         "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Curl/0.jpg"
};