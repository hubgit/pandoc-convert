import { convert as pandocConvert } from 'pandoc-wasm';

const CHANNEL = 'pandoc-convert';
const params = new URLSearchParams(window.location.search);
const allowedOrigins = (params.get('allow') || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

let adapter;
let initError;

function isOriginAllowed(origin) {
  if (allowedOrigins.length === 0) return true;
  return allowedOrigins.includes(origin);
}

function toUint8Array(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new Error('File payload data must be an ArrayBuffer or typed array.');
}

function parseArgs(args = []) {
  const options = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg.startsWith('--')) {
      if (next && !next.startsWith('-')) {
        options[arg.slice(2)] = next;
        i += 1;
      } else {
        options[arg.slice(2)] = true;
      }
    }
  }

  return options;
}

function normalizePayload(payload = {}) {
  const files = Array.isArray(payload.files)
    ? payload.files.map((file, index) => {
        if (!file || typeof file.path !== 'string' || file.path.length === 0) {
          throw new Error(`files[${index}] must include a non-empty string path.`);
        }

        return {
          path: file.path,
          data: toUint8Array(file.data),
        };
      })
    : [];

  return {
    source: payload.source ?? '',
    from: payload.from,
    to: payload.to,
    args: payload.args || [],
    files,
  };
}

function toPandocFiles(files) {
  return Object.fromEntries(files.map((file) => [file.path, new Blob([file.data])]));
}

function reply(targetWindow, targetOrigin, type, id, payload) {
  if (!targetWindow || typeof targetWindow.postMessage !== 'function') return;

  targetWindow.postMessage(
    {
      channel: CHANNEL,
      type,
      id,
      payload,
    },
    targetOrigin,
  );
}

async function initPandoc() {
  if (typeof pandocConvert !== 'function') {
    throw new Error('Unable to resolve convert() from bundled pandoc-wasm dependency.');
  }

  return {
    convert: async (payload) => {
      const normalized = normalizePayload(payload);
      const options = {
        ...parseArgs(normalized.args),
        from: normalized.from,
        to: normalized.to,
      };

      const result = await pandocConvert(options, normalized.source, toPandocFiles(normalized.files));

      if (typeof result?.stdout === 'string') return result.stdout;
      if (typeof result === 'string') return result;
      return '';
    },
  };
}

try {
  adapter = await initPandoc();
} catch (err) {
  initError = err;
}

window.addEventListener('message', async (event) => {
  const message = event.data;

  if (!message || message.channel !== CHANNEL || message.type !== 'pandoc:convert') {
    return;
  }

  if (!isOriginAllowed(event.origin)) {
    reply(event.source, event.origin, 'pandoc:error', message.id, {
      message: `Origin not allowed: ${event.origin}`,
    });
    return;
  }

  if (initError) {
    reply(event.source, event.origin, 'pandoc:error', message.id, {
      message: initError.message,
      stack: initError.stack,
    });
    return;
  }

  try {
    const output = await adapter.convert(message.payload || {});
    reply(event.source, event.origin, 'pandoc:result', message.id, { output });
  } catch (err) {
    reply(event.source, event.origin, 'pandoc:error', message.id, {
      message: err.message,
      stack: err.stack,
    });
  }
});

window.parent?.postMessage(
  {
    channel: CHANNEL,
    type: 'pandoc:ready',
    payload: {
      allowedOrigins,
      initialized: !initError,
      error: initError?.message,
      moduleSource: 'npm: pandoc-wasm@1.0.1 (bundled by Vite v8)',
    },
  },
  '*',
);
