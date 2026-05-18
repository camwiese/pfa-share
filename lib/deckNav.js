// Tiny pub/sub the deck client emits to and the tracker hook subscribes to.

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(slideIdx) {
  listeners.forEach((fn) => {
    try {
      fn(slideIdx);
    } catch (err) {
      console.error("[deckNav] listener error:", err);
    }
  });
}
