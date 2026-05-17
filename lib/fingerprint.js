// Client-side fingerprint. Returns a hex SHA-256 of canvas2d + WebGL renderer +
// UA + screen size + timezone + locale. Not used to block — only to power the
// "sharing detected" signal in the admin dashboard.

export async function computeFingerprint() {
  if (typeof window === "undefined") return null;

  try {
    const parts = [];
    parts.push(navigator.userAgent || "");
    parts.push(`${screen.width}x${screen.height}x${screen.colorDepth || 0}`);
    parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    parts.push(navigator.language || "");
    parts.push(canvasSignature());
    parts.push(webglSignature());

    const buf = new TextEncoder().encode(parts.join("|"));
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return toHex(hash);
  } catch (err) {
    console.warn("[fingerprint] failed:", err?.message);
    return null;
  }
}

function canvasSignature() {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-canvas";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(120, 1, 60, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("PFA-deck-fingerprint-📐", 2, 2);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("PFA-deck-fingerprint-📐", 4, 17);
    return canvas.toDataURL();
  } catch {
    return "canvas-error";
  }
}

function webglSignature() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return "no-webgl";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    return `${vendor}|${renderer}`;
  } catch {
    return "webgl-error";
  }
}

function toHex(buffer) {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}
