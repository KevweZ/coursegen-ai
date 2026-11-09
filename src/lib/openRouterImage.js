/** Pull a data URL or http(s) image URL out of OpenRouter / OpenAI image JSON. */

function asDataUrl(b64, mime = 'image/png') {
  if (!b64 || typeof b64 !== 'string') return null;
  if (b64.startsWith('data:')) return b64;
  return `data:${mime};base64,${b64}`;
}

function fromItem(item) {
  if (!item || typeof item !== 'object') return null;
  if (item.b64_json) {
    return asDataUrl(item.b64_json, item.media_type || item.mime_type || 'image/png');
  }
  const url = item.image_url?.url || (typeof item.image_url === 'string' ? item.image_url : null) || item.url;
  if (typeof url === 'string' && (url.startsWith('data:') || /^https?:\/\//i.test(url))) return url;
  return null;
}

export function extractGeneratedImage(data) {
  if (!data || typeof data !== 'object') return null;
  const direct = fromItem(data.data?.[0]) || fromItem(data.images?.[0]);
  if (direct) return direct;
  if (typeof data.b64_json === 'string') return asDataUrl(data.b64_json, data.media_type || 'image/png');

  const message = data.choices?.[0]?.message;
  if (message?.images?.[0]) {
    const fromMsg = fromItem(message.images[0]);
    if (fromMsg) return fromMsg;
  }
  if (Array.isArray(message?.content)) {
    for (const part of message.content) {
      const fromPart = fromItem(part);
      if (fromPart) return fromPart;
    }
  }
  if (typeof message?.content === 'string' && message.content.startsWith('data:image')) {
    return message.content;
  }
  return null;
}
