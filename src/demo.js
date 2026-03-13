const channel = 'pandoc-convert';
const iframe = document.getElementById('pandoc');
const statusEl = document.getElementById('status');
const sourceEl = document.getElementById('source');
const outputEl = document.getElementById('output');
const buttonEl = document.getElementById('convert');
const pending = new Map();

window.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || msg.channel !== channel) return;

  if (msg.type === 'pandoc:ready') {
    statusEl.textContent = msg.payload.initialized
      ? `Service is ready (${msg.payload.moduleSource}).`
      : `Service failed to initialize: ${msg.payload.error}`;
    return;
  }

  const resolver = pending.get(msg.id);
  if (!resolver) return;
  pending.delete(msg.id);

  if (msg.type === 'pandoc:result') {
    resolver.resolve(msg.payload.output);
  } else {
    resolver.reject(new Error(msg.payload?.message || 'Unknown error'));
  }
});

function requestConversion(payload, transfer = []) {
  const id = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    iframe.contentWindow.postMessage(
      {
        channel,
        type: 'pandoc:convert',
        id,
        payload,
      },
      window.location.origin,
      transfer,
    );
  });
}

buttonEl.addEventListener('click', async () => {
  outputEl.textContent = 'Converting...';

  const includeFileText = 'This is an extra file sent as an ArrayBuffer.';
  const includeFileBuffer = new TextEncoder().encode(includeFileText).buffer;

  try {
    const output = await requestConversion(
      {
        source: sourceEl.value,
        from: 'markdown',
        to: 'html',
        files: [
          {
            path: 'include.txt',
            data: includeFileBuffer,
          },
        ],
      },
      [includeFileBuffer],
    );
    outputEl.textContent = output;
  } catch (error) {
    outputEl.textContent = `Error: ${error.message}`;
  }
});
