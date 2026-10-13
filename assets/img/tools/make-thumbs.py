"""Writes the homepage tile thumbnails: thumbs/<name>.webp, 800x500, from each
1600x1000 screenshot in this folder. Run after adding or replacing a screenshot:

    python assets/img/tools/make-thumbs.py

A tile with no thumbnail falls back to the full PNG, so a missing one is slow,
not broken.
"""
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE / "thumbs"
OUT.mkdir(exist_ok=True)

for png in sorted(HERE.glob("*.png")):
    im = Image.open(png).convert("RGB")
    # Crop to 16:10 first so an odd-sized screenshot isn't squashed.
    w, h = im.size
    if w * 10 > h * 16:
        nw = h * 16 // 10
        im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    elif w * 10 < h * 16:
        im = im.crop((0, 0, w, w * 10 // 16))
    im = im.resize((800, 500), Image.LANCZOS)
    out = OUT / (png.stem + ".webp")
    im.save(out, "WEBP", quality=82, method=6)
    print(f"{out.name}: {out.stat().st_size // 1024} KB")
