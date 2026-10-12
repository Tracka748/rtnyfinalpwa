# Birthday campaign art (optional)

The birthday offer wizard works without any of these files: every image has an
inline SVG fallback in `components/custom/offers/themed/fallbacks.tsx`. Drop a
file here with the exact name below and the wizard uses it automatically. It fades
in over the fallback, and a missing file is a harmless 404.

| File | Used on | Display size (CSS px) | Export at |
| --- | --- | --- | --- |
| `welcome.webp` | Welcome step illustration | 144 × 144 | 288 × 288 |
| `success.webp` | Success / submitted screen illustration | 128 × 128 | 256 × 256 |
| `title-welcome.webp` | Welcome hero title art ("BIRTHDAY PARTNER") | up to 480 × 160 | 1200 × 400 |
| `title-success.webp` | Success hero title art ("YOU’RE IN") | up to 480 × 160 | 1200 × 400 |
| `cake.webp` | Reserved: two-tier birthday cake (the graffiti title draws an SVG cake) | 44 × 44 | 88 × 88 |
| `divider.webp` | Reserved: streamer divider | 400 × 20 | 800 × 40 |
| `confetti.webp` | Reserved: confetti accent | 160 × 160 | 320 × 320 |
| `balloons.webp` | Reserved: balloons accent | 160 × 160 | 320 × 320 |
| `header-backdrop.webp` | Reserved: header backdrop | 430 × 120 | 860 × 240 |

"Reserved" files are listed in the theme config (`themes/birthday.ts`) but not
shown anywhere yet.

## Requirements

- **Format:** WebP, about **50 KB or less** each (quality 75–80 is usually enough).
  The two title files may be up to **60 KB**.
- **Background:** solid **pure black (#000000)**, edge to edge. The wizard draws
  these with `mix-blend-mode: screen`, so pure black disappears into the dark page.
  Any grey or gradient in the background will show as a box.
- **No text** in any image, except the two title files. All other words on screen
  are real HTML text. The heading text stays in the page (visually hidden) when
  title art is shown, so screen readers and search still get it.
- **Square canvas** for the square files, with the subject centered and about 10%
  padding so nothing touches the edge.
- **Palette:** pink `#FF6FB5`, baby blue `#A8DCFF`, mint `#59FFA0`, off-white
  `#F9FDFF`. Avoid large areas of very dark color (they'll vanish on screen blend).

## Title art (`title-welcome.webp`, `title-success.webp`)

Optional. Without them, `GraffitiHeader` draws the title with the Rubik Spray Paint
font (Caveat Brush), an SVG birthday cake, drips and a pink underline, so add art only if it's clearly
better than the font version.

- **Size:** 1200 × 400 (3:1), WebP, **60 KB or less**.
- **Background:** solid pure black, edge to edge.
- **Lettering:** neon mint `#59FFA0` graffiti caps with black paint drips, a pink
  `#FF6FB5` hand-drawn underline, a small two-tier birthday cake, and a soft baby-blue
  `#A8DCFF` splatter behind. **No other text.**
- **Words:** `BIRTHDAY PARTNER` (welcome) and `YOU’RE IN` (success).
- **Check the spelling letter by letter before adding a file.** Image generators
  often misspell words, and a typo here can't be fixed with a copy edit.
- Keep about 8% padding so the lettering doesn't touch the edges (the wizard shows
  the art inside a 3:1 box, centered).

Prompt template:

> Graffiti spray-paint lettering that reads exactly "{WORDS}", neon mint green
> #59FFA0 bold capital letters with black paint drips, a hand-drawn pink #FF6FB5
> underline, a small two-tier birthday cake above the letters, soft baby blue #A8DCFF paint
> splatter behind, centered on a solid pure black background, wide 3:1 banner,
> no other text, no watermark.

## Generation recipe

Prompt template (adjust the subject per file):

> Flat vector illustration of {subject}, playful birthday party style, bold simple
> shapes, colors pink #FF6FB5, baby blue #A8DCFF, mint green #59FFA0 and white,
> centered on a solid pure black background, no text, no letters, no watermark,
> no gradient background, no shadow on the background.

Subjects:
- `welcome`: a cluster of three balloons with a few sprinkles
- `success`: a two-tier birthday cake with bursting confetti and sprinkles
- `cake`: a small two-tier birthday cake with four lit candles, front view
- `divider`: a wavy streamer ribbon, very wide and thin
- `confetti`: scattered confetti pieces and rounded sprinkles
- `balloons`: two or three balloons with strings
- `header-backdrop`: soft scattered sprinkles and confetti, sparse, wide format

Then convert and size, for example with `cwebp -q 78 -resize 288 288 in.png -o welcome.webp`.
