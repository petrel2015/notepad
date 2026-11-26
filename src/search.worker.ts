import { findMatches } from "./search-core";
self.onmessage = (e) => {
  try {
    self.postMessage({
      id: e.data.id,
      ...findMatches(e.data.text, e.data.options),
    });
  } catch (err) {
    self.postMessage({ id: e.data.id, error: String(err) });
  }
};
