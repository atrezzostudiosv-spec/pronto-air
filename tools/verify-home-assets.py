#!/usr/bin/env python3
"""Static checks for image variants. Does not replace browser QA."""
from pathlib import Path
from PIL import Image, ImageOps, ImageChops, ImageStat
import re

root=Path(__file__).resolve().parents[1]
html=(root/"index.html").read_text(encoding="utf8")
assert '<meta name="robots" content="noindex, nofollow">' in html
assert html.count("<h1") == 1
assert 'cdn.tailwindcss.com' not in html
assert 'assets/css/index.min.css' in html
data={
 "home-hero-mobile.webp":[640,820],
 "pronto-home-family-team.webp":[840,1100],
 "home-maintenance-tuneup.webp":[700]
}
for name,widths in data.items():
    origin=root/"images"/name
    orig=ImageOps.exif_transpose(Image.open(origin)).convert("RGB")
    assert f'src="images/{name}"' in html
    for width in widths:
        variant=root/"images"/name.replace(".webp",f"-{width}.webp")
        assert variant.is_file(), f"Missing {variant}"
        assert f"{variant.name} {width}w" in html
        with Image.open(variant) as file:
            optimized=file.convert("RGB")
            assert optimized.width==width
            assert abs(optimized.height-round(orig.height*width/orig.width))<=1
            assert variant.stat().st_size<origin.stat().st_size
            expected=orig.resize(optimized.size,Image.Resampling.LANCZOS)
            d=ImageChops.difference(expected,optimized)
            mae=sum(ImageStat.Stat(d).mean)/3
            assert mae<9.0, f"Excess image fidelity loss: {variant.name} {mae}"
            print(f"PASS {variant.name}: {variant.stat().st_size} bytes ({100*variant.stat().st_size/origin.stat().st_size:.0f}% of source) MAE {mae:.2f}/255")
assert html.count('style="color: #4B5563;"')==5
assert html.count('style="color: #B00020;"')==1
print("PASS: responsive sources, alt-preserving markup, image quality, contrast corrections and noindex protection.")
