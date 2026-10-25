type HistoryPort = {
  readonly state: unknown;
  pushState(state: unknown, title: string): void;
  replaceState(state: unknown, title: string): void;
  go(delta: number): void;
};

// Only UI navigation lives here. User data stays in the existing persistence flow.
export function createNavigationHistory<T>(history: HistoryPort, initial: T, depth: (snapshot: T) => number, restore: (snapshot: T) => void, sameLocation: (left: T, right: T) => boolean = (left, right) => JSON.stringify(left) === JSON.stringify(right)) {
  const session = Math.random().toString(36).slice(2);
  let frames = [{ snapshot: initial, depth: depth(initial) }];
  let index = 0;
  let pendingBack = false;
  const stateFor = (frameIndex: number) => {
    const state = { ...(history.state as Record<string, unknown> | null), modoCultivaNavigation: { session, index: frameIndex } };
    delete (state as Record<string, unknown>).modoCultivaBackGuard;
    return state;
  };
  history.replaceState(stateFor(0), '');

  return {
    back() {
      if (index === 0 || pendingBack) return;
      pendingBack = true;
      history.go(-1);
    },
    sync(snapshot: T) {
      if (pendingBack || JSON.stringify(frames[index].snapshot) === JSON.stringify(snapshot)) return;
      const nextDepth = depth(snapshot);
      if (nextDepth < frames[index].depth && index > 0) {
        let target = index - 1;
        while (target > 0 && frames[target].depth > nextDepth) target -= 1;
        if (frames[target].depth === nextDepth && sameLocation(frames[target].snapshot, snapshot)) {
          pendingBack = true;
          history.go(target - index);
          return;
        }
        // Closing a menu can also open a different screen (e.g. Sign in).
        // That is a new destination, not a request to restore its old parent.
      }
      if (nextDepth > frames[index].depth) {
        frames = frames.slice(0, index + 1);
        frames.push({ snapshot, depth: nextDepth });
        index += 1;
        history.pushState(stateFor(index), '');
      } else {
        frames[index] = { snapshot, depth: nextDepth };
        history.replaceState(stateFor(index), '');
      }
    },
    onPopState(state: unknown) {
      const marker = (state as { modoCultivaNavigation?: { session: string; index: number } } | null)?.modoCultivaNavigation;
      pendingBack = false;
      if (marker?.session === session && Number.isInteger(marker.index) && frames[marker.index]) {
        index = marker.index;
        restore(frames[index].snapshot);
      } else {
        // An older in-document entry may remain after a reload. Show the map
        // without adding a new guard entry that Android could skip on Back.
        index = 0;
        restore(initial);
        history.replaceState(stateFor(0), '');
      }
    },
  };
}
