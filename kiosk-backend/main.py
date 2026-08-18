"""e-Mood kiosk backend — local DeepFace emotion analysis service.

Runs only on the kiosk PC itself. Receives a burst of camera frames from the
Next.js kiosk page (localhost), scores each with DeepFace, averages the
7-emotion scores, and returns them. Frames are decoded to memory and
discarded immediately after — never written to disk, never sent anywhere
else (D-3 / NFR-3.2 / NFR-3.3 in the PRD).
"""

import base64
import io
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel

EMOTIONS = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]
DETECTOR_BACKEND = "opencv"  # bundled with opencv-python, no extra download, fast on CPU (NFR-1.2)


def _warm_up() -> None:
    """Force-loads DeepFace's emotion model once at startup (NFR-1.3) instead
    of on the first real request, which would otherwise cost 5-10s."""
    from deepface import DeepFace

    dummy = np.zeros((224, 224, 3), dtype=np.uint8)
    DeepFace.analyze(
        dummy,
        actions=["emotion"],
        detector_backend=DETECTOR_BACKEND,
        enforce_detection=False,
        silent=True,
    )


@asynccontextmanager
async def lifespan(_app: FastAPI):
    print("[e-mood-kiosk] loading DeepFace model (warm start)...")
    _warm_up()
    print("[e-mood-kiosk] model ready.")
    yield


app = FastAPI(title="e-Mood Kiosk Backend", lifespan=lifespan)

# This service only ever listens on localhost, reachable solely from the kiosk PC
# itself — so any page can call it (allow_origins=["*"]), including the Next.js
# app once it's deployed to a public URL (mixed HTTPS-page -> http://localhost is
# allowed by browsers; localhost is exempt from mixed-content blocking). No
# allow_credentials, so this stays safe even wide open.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    frames: list[str]  # base64 JPEG data URLs from <canvas>.toDataURL()


class AnalyzeResponse(BaseModel):
    detected: bool
    frames_used: int
    raw_scores: dict[str, float]


def _decode_frame(data_url: str) -> np.ndarray:
    _, _, b64 = data_url.partition(",")
    img_bytes = base64.b64decode(b64 or data_url)
    image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return np.array(image)


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    from deepface import DeepFace

    sums = {e: 0.0 for e in EMOTIONS}
    hits = 0

    for data_url in req.frames:
        try:
            frame = _decode_frame(data_url)
        except Exception:
            continue

        try:
            result = DeepFace.analyze(
                frame,
                actions=["emotion"],
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=True,  # skip frames with no face instead of guessing (FR-3.8)
                silent=True,
            )
        except ValueError:
            continue  # no face in this frame

        row = result[0] if isinstance(result, list) else result
        for emotion in EMOTIONS:
            sums[emotion] += float(row["emotion"].get(emotion, 0.0))
        hits += 1
        # `frame` goes out of scope here — nothing is persisted (D-3).

    if hits == 0:
        return AnalyzeResponse(detected=False, frames_used=0, raw_scores={e: 0.0 for e in EMOTIONS})

    averaged = {e: round(sums[e] / hits, 2) for e in EMOTIONS}
    return AnalyzeResponse(detected=True, frames_used=hits, raw_scores=averaged)


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}
