type Listener = () => void;

const listeners = new Set<Listener>();

/** Notify screens that a mutation landed. Services call this instead of the mock store. */
export function invalidateQueries() {
  listeners.forEach((listener) => listener());
}

export function subscribeToInvalidation(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
