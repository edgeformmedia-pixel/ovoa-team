# Exact neumorphic button code

This is the self-contained button used in the Band / checkout UI. Drop the CSS into your project and use the HTML below.

## 1. CSS variables + button

```css
@import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400;500;600;700&display=swap');

:root {
  --radius: 0.875rem;
  --background: oklch(0.925 0.005 265);
  --foreground: oklch(0.28 0.012 265);
  --muted-foreground: oklch(0.56 0.012 265);

  /* neumorphic depth tokens (light) */
  --neu-tile: linear-gradient(155deg, #f2f4f9, #dfe3ec);
  --neu-well: #e2e5ec;
  --neu-dark: rgba(163, 177, 198, 0.55);
  --neu-light: rgba(255, 255, 255, 0.9);
  --neu-in-dark: rgba(163, 177, 198, 0.5);
  --neu-in-light: rgba(255, 255, 255, 0.85);
}

.dark {
  --background: oklch(0.215 0.008 262);
  --foreground: oklch(0.92 0.005 265);
  --muted-foreground: oklch(0.68 0.01 262);

  --neu-tile: linear-gradient(155deg, #1c1f26, #101216);
  --neu-well: #16181d;
  --neu-dark: rgba(0, 0, 0, 0.55);
  --neu-light: rgba(255, 255, 255, 0.03);
  --neu-in-dark: rgba(0, 0, 0, 0.6);
  --neu-in-light: rgba(255, 255, 255, 0.04);
}

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: var(--background);
  color: var(--foreground);
  font-family: "Comfortaa", ui-rounded, system-ui, sans-serif;
  font-weight: 300;
  letter-spacing: -0.005em;
  -webkit-font-smoothing: antialiased;
}

/* ---------- The button ---------- */
.neo-btn {
  border: none;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  padding: 0.85rem 1.6rem;
  font-family: inherit;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--foreground);
  background: var(--neu-tile);
  box-shadow:
    12px 12px 28px var(--neu-dark),
    -12px -12px 28px var(--neu-light),
    inset 5px 5px 5px var(--neu-in-light),
    inset -5px -5px 4px var(--neu-in-dark);
  text-shadow:
    0 -1px 0 var(--neu-in-dark),
    0 1px 0 var(--neu-in-light);
  transition:
    box-shadow 700ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 500ms cubic-bezier(0.22, 1, 0.36, 1),
    background 700ms cubic-bezier(0.22, 1, 0.36, 1);
}

/* Optional glossy highlight layer */
.neo-btn::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(circle at 30% 18%, rgba(255, 255, 255, 0.22), transparent 55%);
  transition: opacity 700ms cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 1;
}

.neo-btn > * {
  position: relative;
  z-index: 2;
}

.neo-btn:hover {
  transform: translateY(-1px);
  box-shadow:
    16px 16px 36px var(--neu-dark),
    -16px -16px 36px var(--neu-light),
    inset 5px 5px 5px var(--neu-in-light),
    inset -5px -5px 4px var(--neu-in-dark);
}

.neo-btn:active {
  transform: scale(0.985);
  background: var(--neu-well);
  box-shadow:
    inset 7px 7px 12px var(--neu-in-dark),
    inset -7px -7px 10px var(--neu-in-light);
}

.neo-btn:active::before {
  opacity: 0.3;
}

/* Ghost / secondary variant */
.neo-btn-ghost {
  color: color-mix(in oklab, var(--muted-foreground) 88%, var(--foreground));
}
```

## 2. HTML

```html
<button class="neo-btn">Primary action</button>
<button class="neo-btn neo-btn-ghost">Secondary</button>
```

## 3. What makes it look neumorphic

| Piece | Why it matters |
|-------|----------------|
| `background: var(--neu-tile)` | Slight gradient so the surface isn't flat. |
| Two outer shadows | Bottom/right dark shadow + top/right light shadow = raised from background. |
| Two inset shadows | Inner light top-left + inner dark bottom-right = surface has thickness. |
| `text-shadow` | Text sits slightly above the surface; inverse of engraved text. |
| `:hover` lift | Larger shadows + `translateY(-1px)` make it feel responsive. |
| `:active` press | Switches to `var(--neu-well)` and inset-only shadows = pressed in. |
| `::before` gloss | Subtle white radial gradient appears on press, like a soft highlight. |
| `cubic-bezier` | Slow, luxurious easing instead of a snappy linear transition. |

## 4. Dark mode toggle

Add this to test both modes:

```html
<button id="theme">Toggle dark</button>
<script>
  document.getElementById('theme').addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
  });
</script>
```
