"""Regenerate particle target positions from the original PIKHUO logo source image.

The PNG is used only as a source mask during data generation. It is never rendered as the website background.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/assets/pikhuo-logo-source.png'
OUTPUT = ROOT / 'src/data/logo-targets.json'
COUNT = 14_000
SEED = 240821

im = np.array(Image.open(SOURCE).convert('RGB'))
mask = (im[:, :, 0] > 45) & (im[:, :, 0] > im[:, :, 1] * 1.5 + 10)
ys, xs = np.nonzero(mask)
rng = np.random.default_rng(SEED)
idx = rng.integers(0, len(xs), size=COUNT)
x = xs[idx].astype(float) + rng.uniform(-0.45, 0.45, size=COUNT)
y = ys[idx].astype(float) + rng.uniform(-0.45, 0.45, size=COUNT)

minx, maxx, miny, maxy = xs.min(), xs.max(), ys.min(), ys.max()
cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
scale = 3.0 / (maxy - miny)
xn = (x - cx) * scale
yn = -(y - cy) * scale
z = rng.normal(0, 0.055, size=COUNT)
seed = rng.random(COUNT)

payload = {
    'count': COUNT,
    'sourceSize': [int(im.shape[1]), int(im.shape[0])],
    'bbox': [int(minx), int(miny), int(maxx), int(maxy)],
    'points': np.column_stack([xn, yn, z, seed]).round(5).tolist(),
}
OUTPUT.write_text(json.dumps(payload, separators=(',', ':')), encoding='utf-8')
print(f'Wrote {COUNT} particles to {OUTPUT}')
