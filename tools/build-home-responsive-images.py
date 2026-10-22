#!/usr/bin/env python3
"""Generate responsive WebP variants using only approved Pronto Air imagery.

Do not overwrite originals: srcset always retains the source file for large DPR displays.
Runs on demand: python tools/build-home-responsive-images.py
Requires: Pillow>=10,<13
"""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
images = root / "images"
targets = {
    "home-hero-mobile.webp": (640, 820),
    "pronto-home-family-team.webp": (840, 1100),
    "home-maintenance-tuneup.webp": (700, 1000),
}
for filename, widths in targets.items():
    source = images / filename
    if not source.is_file():
        raise SystemExit(f"Source image missing: {source}")
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
        for width in widths:
            if width >= image.width:
                raise SystemExit(f"Target {width} must be less than natural width of {filename}")
            height = round(image.height * width / image.width)
            target = images / filename.replace(".webp", f"-{width}.webp")
            result = image.resize((width, height), Image.Resampling.LANCZOS)
            result.save(target, "WEBP", quality=80, method=6, exact=True)
            print(f"{target.name}: {width}x{height}, {target.stat().st_size} bytes "
                  f"(source {source.stat().st_size} bytes)")
