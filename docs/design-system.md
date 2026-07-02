# Dashboard design direction

The dashboard should borrow the reference's calm Guardian character without copying its decorative density: deep green for trust, warm off-white surfaces, high-signal risk colours, and generous whitespace.

## Accessibility defaults

- Base body text: 16px minimum; dashboard settings include large-text mode.
- All body copy uses plain English with short sentences and direct verbs.
- Use a semantic 8px spacing scale and only 2–3 font weights.
- Meet WCAG AA contrast; risk must use both colour and a visible text label/icon.
- Controls need visible keyboard focus and at least a 48px touch target where practical.

## Initial tokens

```css
:root {
  --color-brand-700: #064e3b;
  --color-brand-600: #047857;
  --color-brand-100: #d1fae5;
  --color-surface: #fffcf5;
  --color-text: #102a22;
  --color-risk-high: #b42318;
  --color-risk-medium: #b54708;
  --color-risk-low: #027a48;
  --space-1: 4px;
  --space-2: 8px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
}
```

Use one highly legible sans-serif family (Inter or system UI) initially. The best typography here is the kind that refuses to become a second problem for someone already worried about a scam.

