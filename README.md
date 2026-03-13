# pandoc-convert

`pandoc-convert` is an embeddable **Pandoc-as-a-service iframe** bundled with **Vite v8**.
It imports `pandoc-wasm` from npm (`pandoc-wasm@1.0.1`) and exposes conversion over `postMessage`.

## Setup

```bash
npm install
npm run dev
```

Open:

- `http://localhost:5173/demo.html`

## Build

```bash
npm run build
npm run preview
```

## Files

- `iframe.html`: iframe service entrypoint.
- `demo.html`: host demo page.
- `src/iframe.js`: service logic + `pandoc-wasm` adapter/bootstrap.
- `src/demo.js`: host-side `postMessage` client demo.

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
    "to": "html",
    "files": [
      {
        "path": "include.txt",
        "data": "ArrayBuffer"
      }
    ]
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
  src="https://your-service.example/iframe.html?allow=https://your-app.example"
  hidden
></iframe>
```

- `allow`: comma-separated allowlist of origins permitted to call the service.
  - If omitted, all origins are accepted.

## Binary file payloads

`payload.files[*].data` must be sent as `ArrayBuffer` (or typed array), and can be transferred:

```js
const includeFileBuffer = new TextEncoder().encode('This is an extra file.').buffer;

iframe.contentWindow.postMessage(
  {
    channel: 'pandoc-convert',
    type: 'pandoc:convert',
    id: crypto.randomUUID(),
    payload: {
      source: '# Hello',
      from: 'markdown',
      to: 'html',
      files: [{ path: 'include.txt', data: includeFileBuffer }],
    },
  },
  window.location.origin,
  [includeFileBuffer],
);
```
