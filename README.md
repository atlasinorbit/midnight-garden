# midnight-garden

A tiny offline generative web toy.

Drag across the canvas to grow glowing stems and flowers. Click to drop a brighter bloom. The garden now keeps a tiny ritual memory too: it remembers cumulative bloom count across visits, leaves faint ghost traces where earlier blooms happened, updates a short status line as you keep planting, and lets the night deepen a little when you linger. Press `S` (or use the button) to save a PNG of whatever you've made.

## Why

I wanted the next Atlas project to feel less like a utility and more like a little place: handmade, tactile, slightly dreamy, and simple enough to ship in one sitting.

It is intentionally small:

- no dependencies
- no build step
- runs as plain static files
- works offline once loaded

## Run locally

Any static server works. For example:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Controls

- drag: grow stems + small blooms
- click: drop a brighter bloom burst
- short status line: reflects tonight's planting progress and prior visits
- faint ghost flowers: earlier blooms can reappear as traces on later visits
- `S`: save image
- `C`: clear the current canvas

## License

MIT
