# Readability checklist

A short checklist for page work. It is the baseline for the request inbox and the staff shell, and a good
starting point for any new page. The shared classes live in `components/admin/requests/ui.ts`;
`lib/request-readability.audit.test.ts` enforces the mechanical rules for the request inbox files.

Contrast numbers are WCAG 2.x ratios against the surfaces we use: page `#121113`, card `#1a1a1a`,
sheet `#1a1819`.

## Text

- [ ] Body text is **16px or larger** on mobile (`text-base leading-6`, line height about 1.5).
- [ ] Secondary text is **14px or larger** (`text-sm leading-5`). Nothing is under 12px; in the request
      inbox nothing is under 14px.
- [ ] Text contrast is **4.5:1** (3:1 for large text, 24px or 19px bold). Safe pairs on our surfaces:
      white, `#7DD8E8` (secondary), `#1AC8ED`, mint `#59FFA0`, red-400 on its tinted banner, black on mint.
- [ ] Long free text (notes, reasons, timeline) is limited to **`max-w-prose`** (about 65 characters).
- [ ] Text wraps (`break-words`). **Never truncate** information; if space is tight, wrap it.

## Structure

- [ ] One **`h1`** per page, then `h2` sections in order. Don't use a heading just for its size.
- [ ] Generous space between sections (`space-y-6`) and rows (`py-2` or more).
- [ ] Page titles in a shell are not headings if the page has its own `h1`.

## Controls

- [ ] Every tap target is at least **44px** tall (`min-h-[44px]`): buttons, tabs, selects, links in a row.
- [ ] Control boundaries (inputs, selects, outline buttons) use **`CONTROL_BORDER`** (`border-white/40`,
      about 3.8:1; the rule is 3:1). Card and banner borders use `CARD_BORDER` (decorative).
- [ ] Every custom button, link and select has a visible focus ring: add **`FOCUS_RING`**
      (a solid mint ring, about 14:1). Don't use `outline-none` without a replacement.
- [ ] Form fields are 16px (`text-base`) so phones don't zoom in.

## Meaning is never color alone

- [ ] Status badges carry a **text label**.
- [ ] An unread or selected state has text, weight or an underline as well as color (for example the
      visible "Unread" label next to the dot, and the underlined selected tab).
- [ ] Errors say what happened in words, not only in red.

## Before you merge

- [ ] Check the page at 360px wide: no horizontal scrolling, nothing hidden behind a fixed bar.
- [ ] Tab through the page: the focus ring is always visible and the order makes sense.
- [ ] Run the tests: `npm test` (includes the readability and admin-guard audits).
- [ ] If you change a color or token, list every place it is used before changing it globally. The
      request inbox files use constants so a fix is made once.

## Known gaps outside the request inbox

The rest of the admin area still has 12px text, borders under 3:1 and short tap targets. They are not fixed
here on purpose; fix them page by page against this list.
