// Barramento de eventos mínimo: permite que models avisem controllers sem depender deles.
const listeners = new Map();

export function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
  return () => listeners.get(event)?.delete(handler);
}

export function emit(event, payload) {
  for (const handler of listeners.get(event) || []) {
    try { handler(payload); } catch (err) { console.error(`Evento "${event}":`, err); }
  }
}
