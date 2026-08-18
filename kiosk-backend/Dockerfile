FROM python:3.11-slim

WORKDIR /app

# opencv-python (non-headless) needs these system libs on a slim/debian image.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# Warms the DeepFace model at image build time (not first request) — same intent
# as the in-process warm-up in main.py's lifespan, just done once here too so a
# fresh container's first real request isn't the one paying the 5-10s load cost.
RUN python -c "from main import _warm_up; _warm_up()"

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
