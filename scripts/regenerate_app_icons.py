#!/usr/bin/env python3
"""Regenerate app icons: remove purple underline, add inset purple frame."""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "icons" / "app-icon-source-512.png"

PURPLE = (172, 30, 254, 255)
PURPLE_GLOW = (174, 34, 255, 255)


def is_purple(r: int, g: int, b: int, a: int) -> bool:
    if a < 80:
        return False
    return r > 110 and g < 110 and b > 140 and (r - g) > 60


def remove_purple_underline(im: Image.Image) -> Image.Image:
    px = im.load()
    w, h = im.size
    out = im.copy()
    opx = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not is_purple(r, g, b, a):
                continue
            # Fill from nearest non-purple above (underline sits on green)
            sy = y - 1
            while sy >= 0:
                sr, sg, sb, sa = px[x, sy]
                if not is_purple(sr, sg, sb, sa) and sa > 0:
                    opx[x, y] = (sr, sg, sb, sa)
                    break
                sy -= 1
            else:
                opx[x, y] = (2, 116, 65, 255)
    return out


def draw_purple_frame(im: Image.Image, size: int) -> Image.Image:
    """Inset rounded purple stroke; scales with icon size."""
    scale = size / 512.0
    inset = max(3, int(round(56 * scale)))
    stroke = max(2, int(round(12 * scale)))
    radius = max(4, int(round(44 * scale)))

    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    x0, y0 = inset, inset
    x1, y1 = size - inset - 1, size - inset - 1

    for i in range(stroke):
        draw.rounded_rectangle(
            [x0 + i, y0 + i, x1 - i, y1 - i],
            radius=max(2, radius - i),
            outline=PURPLE,
            width=1,
        )

    # Soft outer glow (matches underline feel)
    glow = layer.filter(ImageFilter.GaussianBlur(radius=max(1, int(round(2 * scale)))))
    glow = Image.blend(Image.new("RGBA", im.size, (0, 0, 0, 0)), glow, alpha=0.45)

    base = im.convert("RGBA")
    base = Image.alpha_composite(base, glow)
    base = Image.alpha_composite(base, layer)
    return base


def build_master() -> Image.Image:
    im = Image.open(MASTER).convert("RGBA")
    im = remove_purple_underline(im)
    im = draw_purple_frame(im, 512)
    return im


def save_png(path: Path, im: Image.Image) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, format="PNG", optimize=True)


def save_ico(path: Path, master: Image.Image, sizes: list[int]) -> None:
    images = []
    for s in sizes:
        images.append(master.resize((s, s), Image.Resampling.LANCZOS))
    images[0].save(
        path,
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=images[1:],
    )


def main() -> None:
    master = build_master()

    outputs = {
        ROOT / "icons" / "android-chrome-512x512.png": 512,
        ROOT / "icons" / "android-chrome-192x192.png": 192,
        ROOT / "icons" / "maskable-512x512.png": 512,
        ROOT / "apple-touch-icon.png": 180,
        ROOT / "icons" / "favicon-32x32.png": 32,
        ROOT / "icons" / "favicon-16x16.png": 16,
    }

    for path, size in outputs.items():
        resized = master.resize((size, size), Image.Resampling.LANCZOS)
        save_png(path, resized)
        print("wrote", path, resized.size)

    save_ico(ROOT / "favicon.ico", master, [16, 32, 48])
    print("wrote", ROOT / "favicon.ico")


if __name__ == "__main__":
    main()
