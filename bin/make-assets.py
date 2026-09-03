#!/usr/bin/env python3
"""
Generates Spacery's WordPress.org directory assets.

These are the icon and banner shown in the plugin directory. They are generated
rather than drawn by hand so that changing the wordmark, the palette or a size
is an edit to this file, not a round trip through an image editor -- and so the
1x and 2x variants cannot drift apart, because both come from one code path.

Requires Pillow. Run with `python3 bin/make-assets.py`, which writes into
`assets/`. Those files are uploaded to the SVN `assets/` directory by the
release workflow and are deliberately absent from the plugin zip.

The mark is three bars: narrowing left to right as content reflows, with the gap
between them widening as it goes. That is the whole idea of the plugin in the
one shape that still reads at 128 pixels.
"""

import os
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:  # pragma: no cover - a tooling script, not shipped code.
    sys.exit("Pillow is required: pip install pillow")

BACKGROUND = (20, 19, 39)
BACKGROUND_LIFT = (32, 30, 62)
BAR = (255, 255, 255)
ACCENT = (139, 124, 255)
MUTED = (168, 163, 200)

FONT_DIR = "/usr/share/fonts/truetype/google-fonts"
BOLD = os.path.join(FONT_DIR, "Poppins-Bold.ttf")
LIGHT = os.path.join(FONT_DIR, "Poppins-Light.ttf")

# Bar widths and the gaps that follow them, as fractions of the mark's box.
# Widths shrink and gaps grow: the two things that change together when a
# layout gets narrower.
BARS = ((1.00, 0.68), (0.74, 1.00), (0.50, 0.00))


def gradient(size):
    """A background that is not flat, without being a distraction."""
    width, height = size
    image = Image.new("RGB", size, BACKGROUND)
    draw = ImageDraw.Draw(image)

    for y in range(height):
        blend = y / max(height - 1, 1)
        draw.line(
            [(0, y), (width, y)],
            fill=tuple(
                round(a + (b - a) * blend)
                for a, b in zip(BACKGROUND_LIFT, BACKGROUND)
            ),
        )

    return image


def draw_mark(draw, left, top, box, accent_first=True):
    """The three-bar mark, inside a square of side `box`."""
    thickness = box * 0.155
    radius = thickness / 2

    units = sum(width_gap[1] for width_gap in BARS) + len(BARS)
    unit = box / units

    y = top + (box - (unit * units)) / 2

    for index, (width, gap) in enumerate(BARS):
        colour = ACCENT if (accent_first and index == 0) else BAR

        draw.rounded_rectangle(
            [left, y, left + box * width, y + thickness],
            radius=radius,
            fill=colour,
        )

        y += thickness + unit * gap


def optical_offset(box):
    """How far right to nudge the mark so it looks centred.

    The bars narrow left to right, so the shape's visual mass sits left of its
    bounding box. Centring the box leaves the icon looking off; centring the
    mass fixes it. Averaging the widths is a coarse model of that mass, and at
    128 pixels a coarse model is enough.
    """
    average = sum(width for width, _ in BARS) / len(BARS)

    return box * (0.5 - average / 2)


def make_icon(size, path):
    image = gradient((size, size))
    draw = ImageDraw.Draw(image)

    # A rounded mask so the icon reads as a tile rather than a screenshot.
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size - 1, size - 1], radius=size * 0.22, fill=255
    )

    box = size * 0.60

    draw_mark(draw, (size - box) / 2 + optical_offset(box), (size - box) / 2, box)

    output = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    output.paste(image, (0, 0), mask)
    output.save(path)
    print(f"wrote {path}")


def make_banner(width, height, path):
    image = gradient((width, height))
    draw = ImageDraw.Draw(image)

    box = height * 0.44
    margin = height * 0.24
    draw_mark(draw, margin, (height - box) / 2, box)

    text_left = margin + box + height * 0.20
    title = ImageFont.truetype(BOLD, int(height * 0.20))
    tagline = ImageFont.truetype(LIGHT, int(height * 0.082))

    # Measured rather than guessed, so the block stays centred at both sizes.
    title_box = draw.textbbox((0, 0), "Spacery", font=title)
    tagline_text = "Responsive spacing for every block"
    tagline_box = draw.textbbox((0, 0), tagline_text, font=tagline)

    spacing = height * 0.055
    total = (title_box[3] - title_box[1]) + spacing + (
        tagline_box[3] - tagline_box[1]
    )
    y = (height - total) / 2

    draw.text((text_left, y - title_box[1]), "Spacery", font=title, fill=BAR)
    draw.text(
        (
            text_left,
            y + (title_box[3] - title_box[1]) + spacing - tagline_box[1],
        ),
        tagline_text,
        font=tagline,
        fill=MUTED,
    )

    image.save(path)
    print(f"wrote {path}")


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    assets = os.path.join(os.path.dirname(here), "assets")
    os.makedirs(assets, exist_ok=True)

    make_icon(128, os.path.join(assets, "icon-128x128.png"))
    make_icon(256, os.path.join(assets, "icon-256x256.png"))
    make_banner(772, 250, os.path.join(assets, "banner-772x250.png"))
    make_banner(1544, 500, os.path.join(assets, "banner-1544x500.png"))


if __name__ == "__main__":
    main()
