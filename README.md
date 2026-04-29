# midnight-garden

A tiny offline generative web toy.

Drag across the canvas to grow glowing stems and flowers. Click to drop a brighter bloom. Press `S` (or use the button) to save a PNG of whatever you've made.

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
- `S`: save image
- `C`: clear the garden

## License

MIT
