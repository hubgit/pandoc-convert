# pandoc-convert

`pandoc-convert` is a tiny, embeddable **Pandoc-as-a-service iframe**.
Any domain can load `iframe.html` and request document conversions over `postMessage`.

## Why

This project is designed for scenarios where:

- you do not want to ship Pandoc integration code in every app,
- you want a consistent cross-origin conversion API,
- you want browser-only execution via `pandoc-wasm`.

## Files

- `iframe.html`: the conversion service endpoint loaded in an iframe.
- `demo.html`: example host page that talks to `iframe.html`.

## Message protocol

Host -> iframe request:

```json
{
  "channel": "pandoc-convert",
  "type": "pandoc:convert",
  "id": "req_123",
  "payload": {
    "source": "# Hello",
    "from": "markdown",
    "to": "html"
  }
}
```

Iframe -> host success:

```json
{
  "channel": "pandoc-convert",
  "type": "pandoc:result",
  "id": "req_123",
  "payload": {
    "output": "<h1>Hello</h1>"
  }
}
```

Iframe -> host error:

```json
{
  "channel": "pandoc-convert",
  "type": "pandoc:error",
  "id": "req_123",
  "payload": {
    "message": "...",
    "stack": "..."
  }
}
```

## Embedding

```html
<iframe
  id="pandoc-service"
  src="https://your-service.example/iframe.html?allow=https://your-app.example&version=1.0.1"
  hidden
></iframe>
```

Parameters supported by `iframe.html`:

- `allow`: comma-separated allowlist of origins allowed to call the service.
  - If omitted, all origins are accepted.
- `version`: `pandoc-wasm` version to load from jsDelivr.
  - Default: `1.0.1`
  - Resolved URL: `https://cdn.jsdelivr.net/npm/pandoc-wasm@<version>/src/index.browser.min.js`
- `module`: optional override URL for the `pandoc-wasm` browser module.
  - If `module` is provided, it takes precedence over `version`.

## Local demo

```bash
python3 -m http.server 4173
```

Then open:

- `http://localhost:4173/demo.html`

The demo embeds `iframe.html?version=1.0.1` by default and uses same-origin messaging.
