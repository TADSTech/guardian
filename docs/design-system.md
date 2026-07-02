# Dashboard design direction

The dashboard should borrow the reference's calm Guardian character without copying its decorative density: deep green for trust, warm off-white surfaces, high-signal risk colours, and generous whitespace.

## Accessibility defaults

- Base body text: 16px minimum; dashboard settings include large-text mode.
- All body copy uses plain English with short sentences and direct verbs.
- Use a semantic 8px spacing scale and only 2–3 font weights.
- Meet WCAG AA contrast; risk must use both colour and a visible text label/icon.
- Controls need visible keyboard focus and at least a 48px touch target where practical.

## Tokens (source of truth: `apps/web/app/globals.css`)

```css
:root {
  --ink: #17352b;      /* body text */
  --cream: #fcfaf3;    /* page background */
  --paper: #fffef9;    /* card surfaces */
  --mint: #dcefe3;     /* light accent fill */
  --leaf: #087449;     /* brand accent, hover states */
  --deep: #06452e;     /* primary brand, buttons */
  --line: #d7dfd6;     /* borders, dividers */
  --danger: #a42922;   /* critical warnings, error text */
  --sans: ui-sans-serif, system-ui, sans-serif;
  --serif: Georgia, serif; /* headings */
}
```

Risk colours aren't CSS custom properties — they're applied directly as Tailwind classes/inline hex values at each call site (see `apps/web/app/dashboard/page.tsx`): low/safe uses `#16a34a` (green-600), medium uses `#f59e0b` (amber-500), and high/critical uses `#dc2626` (red-600).

There is no dedicated spacing token scale; components use Tailwind's default spacing utilities (`p-4`, `gap-6`, etc.) directly rather than custom `--space-*` variables.

Typography is the system sans-serif stack for body copy and Georgia for headings — not Inter. The best typography here is the kind that refuses to become a second problem for someone already worried about a scam.

