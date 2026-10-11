# Birthday campaign art (optional)

The birthday offer wizard works without any of these files: every image has an
inline SVG fallback in `components/custom/offers/themed/fallbacks.tsx`. Drop a
file here with the exact name below and the wizard uses it automatically. It fades
in over the fallback, and a missing file is a harmless 404.

| File | Used on | Display size (CSS px) | Export at |
| --- | --- | --- | --- |
| `welcome.webp` | Welcome step illustration | 144 × 144 | 288 × 288 |
| `success.webp` | Success / submitted screen illustration | 128 × 128 | 256 × 256 |
| `hat.webp` | Party hat on the review preview frame | 36 × 36 | 72 × 72 |
| `divider.webp` | Reserved: streamer divider | 400 × 20 | 800 × 40 |
| `confetti.webp` | Reserved: confetti accent | 160 × 160 | 320 × 320 |
| `balloons.webp` | Reserved: balloons accent | 160 × 160 | 320 × 320 |
| `header-backdrop.webp` | Reserved: header backdrop | 430 × 120 | 860 × 240 |

"Reserved" files are listed in the theme config (`themes/birthday.ts`) but not
shown anywhere yet.

## Requirements

- **Format:** WebP, about **50 KB or less** each (quality 75–80 is usually enough).
- **Background:** solid **pure black (#000000)**, edge to edge. The wizard draws
  these with `mix-blend-mode: screen`, so pure black disappears into the dark page.
  Any grey or gradient in the background will show as a box.
- **No text** in any image. All words on screen are real HTML text.
- **Square canvas** for the square files, with the subject centered and about 10%
  padding so nothing touches the edge.
- **Palette:** pink `#FF6FB5`, baby blue `#A8DCFF`, mint `#59FFA0`, off-white
  `#F9FDFF`. Avoid large areas of very dark color (they'll vanish on screen blend).

## Generation recipe

Prompt template (adjust the subject per file):

> Flat vector illustration of {subject}, playful birthday party style, bold simple
> shapes, colors pink #FF6FB5, baby blue #A8DCFF, mint green #59FFA0 and white,
> centered on a solid pure black background, no text, no letters, no watermark,
> no gradient background, no shadow on the background.

Subjects:
- `welcome`: a cluster of three balloons with a small party hat and a few sprinkles
- `success`: a party hat with bursting confetti and sprinkles
- `hat`: a single party hat, front view
- `divider`: a wavy streamer ribbon, very wide and thin
- `confetti`: scattered confetti pieces and rounded sprinkles
- `balloons`: two or three balloons with strings
- `header-backdrop`: soft scattered sprinkles and confetti, sparse, wide format

Then convert and size, for example with `cwebp -q 78 -resize 288 288 in.png -o welcome.webp`.
