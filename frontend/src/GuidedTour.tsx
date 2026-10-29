import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  TOUR_METHODS, clipTourRect, placeTourPanel, resolveTourTargets, targetSelector,
  tourBlackoutRects, tourNextDisabled, tourTargets,
  type GuidedTourStep, type TourInteraction, type TourMethod, type TourRect,
  type TourTarget, type TourUnavailableReason,
} from './guidedTourCore';
import { getGuidedTourCopy } from './guidedTourMessages';
import './guided-tour.css';

export type GuidedTourProps = {
  /** Controlled by the host. null closes the tour. No step/progress state is persisted. */
  step: GuidedTourStep | null;
  language?: string;
  direction?: 'ltr' | 'rtl';
  onNext: () => void;
  onPrevious: () => void;
  onClose: (reason: 'close' | 'escape') => void;
  canGoBack?: boolean;
  isLastStep?: boolean;
  /** Only confirm a visit after the actual method view has mounted. Never infer transactions. */
  visitedMethods?: readonly TourMethod[];
  onTargetInteraction?: (interaction: TourInteraction) => void;
  onTargetUnavailable?: (detail: { stepId: string; reason: TourUnavailableReason }) => void;
  /** Optional host inside a native modal. Otherwise the active modal/body is selected safely. */
  portalRoot?: HTMLElement | null;
  /** Default 3500ms, bounded to 250–10000ms, including async onEnter navigation. */
  targetWaitMs?: number;
  /** Caller must authorize using hydrated, authenticated owner identity; false for everyone else. */
  showCounter?: boolean;
  counter?: { current: number; total: number };
  returnFocusTo?: HTMLElement | null;
};

type Snapshot = {
  phase: 'loading' | 'ready' | 'unavailable';
  width: number; height: number; holes: TourRect[]; panel: TourRect;
};
const FOCUSABLE = 'a[href],area[href],button,input,select,textarea,summary,[tabindex],[contenteditable="true"],audio[controls],video[controls]';

function activeModal(doc: Document): Element | null {
  try { const dialogs = doc.querySelectorAll('dialog:modal'); return dialogs[dialogs.length - 1] ?? null; }
  catch { return doc.querySelector('dialog[open]'); }
}
function safeHost(doc: Document, requested?: HTMLElement | null): HTMLElement {
  const modal = activeModal(doc);
  // A portal outside the modal would become inert and strand its close controls.
  if (modal && (!requested?.isConnected || !modal.contains(requested))) return modal as HTMLElement;
  return requested?.isConnected && requested.ownerDocument === doc ? requested : (modal as HTMLElement | null) ?? doc.body;
}
function canFocus(element: Element): element is HTMLElement {
  return element instanceof HTMLElement && element.tabIndex >= 0 && !element.matches(':disabled') &&
    !element.closest('[inert], [hidden], [aria-hidden="true"]') && element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== 'hidden';
}
function liveRect(element: Element, viewport: TourRect): { layout: TourRect; visible: TourRect | null } | null {
  if (!element.isConnected || element.closest('[inert], [hidden], [aria-hidden="true"]')) return null;
  const style = getComputedStyle(element); const box = element.getBoundingClientRect();
  if (style.visibility === 'hidden' || style.display === 'none' || !box.width || !box.height) return null;
  let visible = clipTourRect(box, viewport);
  // A scrollable section must not illuminate the part clipped by an overflow ancestor.
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const parentStyle = getComputedStyle(parent);
    if (Number(parentStyle.opacity) === 0 || parentStyle.visibility === 'hidden') return null;
    // The document scrolling root clips to the VIEWPORT, not its translated
    // document box. Its box top becomes negative after a long page scroll while
    // clientHeight stays one viewport; combining those erased valid targets.
    if (parent === element.ownerDocument.documentElement || parent === element.ownerDocument.scrollingElement) continue;
    if (visible && /(hidden|clip|auto|scroll)/.test(`${parentStyle.overflowX} ${parentStyle.overflowY}`)) {
      const parentBox = parent.getBoundingClientRect();
      const xClipped = /(hidden|clip|auto|scroll)/.test(parentStyle.overflowX);
      const yClipped = /(hidden|clip|auto|scroll)/.test(parentStyle.overflowY);
      visible = clipTourRect(visible, {
        left: xClipped ? parentBox.left + parent.clientLeft : viewport.left,
        top: yClipped ? parentBox.top + parent.clientTop : viewport.top,
        width: xClipped ? parent.clientWidth : viewport.width,
        height: yClipped ? parent.clientHeight : viewport.height,
      });
    }
    // A native modal lives in the top layer and escapes its DOM ancestors'
    // overflow/opacity. Its own scrolling bounds still apply to descendants.
    if (parent.matches('dialog:modal')) break;
  }
  return Number(style.opacity) === 0 ? null : { layout: box, visible };
}

/** Non-modal on purpose: live highlighted controls remain keyboard- and pointer-operable. */
export function GuidedTour(props: GuidedTourProps) {
  const open = Boolean(props.step);
  const restore = useRef(props.returnFocusTo);
  restore.current = props.returnFocusTo;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    return () => {
      const target = restore.current ?? previous;
      if (target instanceof HTMLElement && target.isConnected && !target.closest('[inert], [hidden]')) target.focus({ preventScroll: true });
    };
  }, [open]);
  return props.step ? <ActiveTour key={props.step.id} {...props} step={props.step} /> : null;
}

function ActiveTour(props: GuidedTourProps & { step: GuidedTourStep }) {
  const latest = useRef(props); latest.current = props;
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const layer = useRef<HTMLDivElement>(null); const card = useRef<HTMLElement>(null);
  const live = useRef<{ element: Element; target: TourTarget }[]>([]);
  const entry = useRef({ pending: true, failed: false });
  const status = useRef<Snapshot | null>(null);
  const titleId = useId(); const bodyId = useId(); const instructionsId = useId();
  const checklistId = useId(); const blockedId = useId();
  const copy = getGuidedTourCopy(props.language ?? 'es');
  const rtl = props.direction === 'rtl' || (!props.direction && (props.language ?? '').split(/[-_]/)[0].toLowerCase() === 'ar');
  const targets = tourTargets(props.step);
  const targetKey = JSON.stringify(targets);

  useEffect(() => {
    const doc = props.portalRoot?.ownerDocument ?? document;
    const update = () => setHost(safeHost(doc, latest.current.portalRoot));
    update();
    const observer = new MutationObserver(update);
    observer.observe(doc.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
    return () => observer.disconnect();
  }, [props.portalRoot]);

  useEffect(() => {
    const controller = new AbortController();
    entry.current = { pending: true, failed: false }; live.current = []; status.current = null;
    setSnapshot(null);
    // Do not call onEnter on every render or when the portal moves into a new dialog.
    Promise.resolve().then(() => {
      if (!controller.signal.aborted) return latest.current.step.onEnter?.({ stepId: props.step.id, signal: controller.signal });
    }).then(() => {
      if (!controller.signal.aborted) entry.current.pending = false;
    }).catch(() => {
      if (!controller.signal.aborted) entry.current = { pending: false, failed: true };
    });
    return () => controller.abort();
  }, [props.step.id, attempt]);

  useEffect(() => {
    const root = layer.current;
    if (!host || !root) return;
    // A manual popover joins the top layer WITHOUT making real targets inert.
    // Its DOM host stays inside the active modal to satisfy that modal's focus rules.
    try { if (root.showPopover && !root.matches(':popover-open')) root.showPopover(); } catch { /* Fixed-position fallback. */ }
    return () => { try { if (root.hidePopover && root.matches(':popover-open')) root.hidePopover(); } catch { /* Already removed. */ } };
  }, [host]);

  useEffect(() => {
    const root = layer.current;
    if (!host || !root) return;
    const doc = host.ownerDocument; const win = doc.defaultView!;
    const viewport = win.visualViewport;
    let unavailableSince: number | null = win.performance.now(); let frame = 0; let lastSignature = '';
    let scrolled = false; let notified = false;
    const wait = Math.max(250, Math.min(10000, Number.isFinite(props.targetWaitMs) ? props.targetWaitMs! : 3500));
    const update = () => {
      const width = viewport?.width ?? win.innerWidth; const height = viewport?.height ?? win.innerHeight;
      const left = viewport?.offsetLeft ?? 0; const top = viewport?.offsetTop ?? 0;
      // Set coordinates before reading the origin, including visualViewport keyboard/pinch offsets.
      Object.assign(root.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
      const origin = root.getBoundingClientRect();
      const sx = width / (origin.width || width); const sy = height / (origin.height || height);
      const bounds = { left: origin.left, top: origin.top, width: origin.width, height: origin.height };
      const resolved = resolveTourTargets(tourTargets(latest.current.step), doc);
      let reason = resolved.reason;
      const modal = activeModal(doc);
      const measured = resolved.matches.map(match => ({ ...match, rect: liveRect(match.element, bounds) }));
      if (!reason && measured.some(match => !match.rect || (modal && !modal.contains(match.element)))) reason = 'missing';
      if (measured.some(match => root.contains(match.element))) reason = 'unsafe-target';
      let holes = measured.flatMap(match => match.rect?.visible ? [{
        left: (match.rect.visible.left - origin.left) * sx, top: (match.rect.visible.top - origin.top) * sy,
        width: match.rect.visible.width * sx, height: match.rect.visible.height * sy,
      }] : []);
      if (!reason && holes.some(rect => rect.width >= width - 1 && rect.height >= height - 1)) reason = 'unsafe-target';
      if (!reason && !holes.length && !scrolled && resolved.elements[0]) {
        scrolled = true;
        resolved.elements[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      }
      if (!holes.length && !reason) reason = 'missing';
      let panel = !reason ? placeTourPanel(width, height, holes, rtl) : null;
      if (!reason && !panel) reason = 'no-room';
      if (entry.current.failed) reason = 'navigation-error';
      // Give a newly unmounted target its own grace period even after a long-ready step.
      if (reason || entry.current.pending) unavailableSince ??= win.performance.now();
      else unavailableSince = null;
      const expired = unavailableSince !== null && win.performance.now() - unavailableSince >= wait;
      const phase = entry.current.failed || (reason && expired) || (entry.current.pending && expired)
        ? 'unavailable' : reason || entry.current.pending ? 'loading' : 'ready';
      if (phase !== 'ready') {
        holes = [];
        panel = { left: 8, top: Math.max(8, height - Math.min(360, height - 16) - 8), width: Math.max(1, Math.min(384, width - 16)), height: Math.max(56, Math.min(360, height - 16)) };
      }
      const next: Snapshot = { phase, holes, panel: panel!, width, height };
      status.current = next;
      live.current = phase === 'ready' ? measured.filter(match => match.rect?.visible).map(({ element, target }) => ({ element, target })) : [];
      const signature = JSON.stringify(next);
      if (lastSignature !== signature) { lastSignature = signature; setSnapshot(next); }
      if (phase === 'unavailable' && !notified) {
        notified = true;
        latest.current.onTargetUnavailable?.({ stepId: latest.current.step.id, reason: reason ?? 'navigation-error' });
      }
    };
    // Continuous measurement follows CSS transforms/animation and unmounts as well as scroll/resize.
    const tick = () => { if (!doc.hidden) update(); frame = win.requestAnimationFrame(tick); };
    update(); frame = win.requestAnimationFrame(tick);
    win.addEventListener('resize', update); doc.addEventListener('scroll', update, true);
    viewport?.addEventListener('resize', update); viewport?.addEventListener('scroll', update);
    return () => {
      win.cancelAnimationFrame(frame); win.removeEventListener('resize', update); doc.removeEventListener('scroll', update, true);
      viewport?.removeEventListener('resize', update); viewport?.removeEventListener('scroll', update);
      live.current = [];
    };
  }, [host, props.step.id, targetKey, attempt, props.targetWaitMs, rtl]);

  useEffect(() => {
    if (!host) return;
    const doc = host.ownerDocument;
    const inTarget = (node: Node | null) => Boolean(node && live.current.some(match => match.element.contains(node)));
    const allowed = (node: Node | null) => Boolean(node && (card.current?.contains(node) || inTarget(node)));
    const focusCard = () => card.current?.focus({ preventScroll: true });
    const focus = (event: FocusEvent) => { if (!allowed(event.target as Node)) focusCard(); };
    const interact = (event: Event) => {
      if (!event.isTrusted || status.current?.phase !== 'ready') return;
      const path = event.composedPath();
      if (layer.current && path.includes(layer.current)) return;
      const match = live.current.find(item => path.some(node => node instanceof Node && item.element.contains(node)));
      if (match) latest.current.onTargetInteraction?.({ stepId: latest.current.step.id, selector: targetSelector(match.target), element: match.element, method: typeof match.target === 'string' ? undefined : match.target.method, event });
      // Never preventDefault/stopPropagation: the REAL target's own handler must run.
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); latest.current.onClose('escape'); return;
      }
      if (event.key === 'Tab') {
        const bounds = layer.current?.getBoundingClientRect();
        const nodes = Array.from(doc.querySelectorAll(FOCUSABLE)).filter(element => allowed(element) && canFocus(element) && (!bounds || liveRect(element, bounds)?.visible)) as HTMLElement[];
        if (!nodes.length) { event.preventDefault(); focusCard(); return; }
        const current = nodes.indexOf(doc.activeElement as HTMLElement);
        const index = current < 0 ? (event.shiftKey ? nodes.length - 1 : 0) : (current + (event.shiftKey ? -1 : 1) + nodes.length) % nodes.length;
        event.preventDefault(); nodes[index].focus({ preventScroll: true }); return;
      }
      // Leave native input, slider, tablist and other highlighted keyboard interactions intact.
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || (inTarget(doc.activeElement) && !card.current?.contains(doc.activeElement))) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault(); event.stopPropagation();
      const next = rtl ? event.key === 'ArrowLeft' : event.key === 'ArrowRight';
      const currentProps = latest.current;
      if (next && !tourNextDisabled(currentProps.step, currentProps.visitedMethods ?? [], status.current?.phase === 'ready')) currentProps.onNext();
      if (!next && currentProps.canGoBack !== false) currentProps.onPrevious();
    };
    doc.addEventListener('focusin', focus, true); doc.addEventListener('keydown', keydown, true);
    doc.addEventListener('click', interact, true); doc.addEventListener('change', interact, true);
    return () => {
      doc.removeEventListener('focusin', focus, true); doc.removeEventListener('keydown', keydown, true);
      doc.removeEventListener('click', interact, true); doc.removeEventListener('change', interact, true);
    };
  }, [host, rtl]);

  useEffect(() => {
    const doc = host?.ownerDocument; const current = doc?.activeElement;
    if (card.current && !card.current.contains(current ?? null) && !live.current.some(match => match.element.contains(current ?? null))) card.current.focus({ preventScroll: true });
  }, [host, snapshot?.phase]);

  if (!host) return null;
  const ready = snapshot?.phase === 'ready';
  const unavailable = snapshot?.phase === 'unavailable';
  const width = snapshot?.width ?? 0; const height = snapshot?.height ?? 0;
  const dark = tourBlackoutRects(width, height, snapshot?.holes ?? []);
  const blocked = tourNextDisabled(props.step, props.visitedMethods ?? [], ready);
  const methodBlocked = props.step.methodChecklist && !TOUR_METHODS.every(method => props.visitedMethods?.includes(method));
  const counter = props.showCounter && props.counter && Number.isInteger(props.counter.current) && Number.isInteger(props.counter.total) && props.counter.current > 0 && props.counter.current <= props.counter.total
    ? copy.controls.counter.replace('{current}', String(props.counter.current)).replace('{total}', String(props.counter.total)) : null;
  return createPortal(<div ref={layer} popover="manual" className="guided-tour-layer" data-guided-tour-layer="" data-tour-step={props.step.id} data-tour-phase={snapshot?.phase ?? 'loading'} dir={rtl ? 'rtl' : 'ltr'} lang={props.language ?? 'es'}>
    <svg className="guided-tour-shade" width={width} height={height} viewBox={`0 0 ${width || 1} ${height || 1}`} aria-hidden="true" focusable="false">
      <path d={snapshot ? dark.map(rect => `M${rect.left},${rect.top}h${rect.width}v${rect.height}h${-rect.width}Z`).join('') : 'M0,0h1v1h-1Z'} />
    </svg>
    {snapshot?.holes.map((rect, index) => <span key={index} className="guided-tour-outline" style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} aria-hidden="true" />)}
    <section ref={card} className="guided-tour-card" role="dialog" aria-modal="false" aria-label={copy.controls.tour} aria-labelledby={titleId} aria-describedby={`${bodyId}${props.step.instructions ? ` ${instructionsId}` : ''}`} tabIndex={-1} style={snapshot ? { left: snapshot.panel.left, top: snapshot.panel.top, width: snapshot.panel.width, maxHeight: snapshot.panel.height } : undefined}>
      <div className="guided-tour-content">
        {counter && <small className="guided-tour-counter">{counter}</small>}
        <h2 id={titleId}>{props.step.title}</h2>
        <p id={bodyId} aria-live="polite" aria-atomic="true">{ready ? props.step.body : unavailable ? copy.controls.unavailable : copy.controls.loading}</p>
        {ready && props.step.clarityTarget && <blockquote className="guided-tour-clarity"><small>{copy.controls.nextClarity} · {copy.controls.level} {props.step.clarityTarget.level}</small><p>{props.step.clarityTarget.description}</p></blockquote>}
        {ready && props.step.instructions && <p className="guided-tour-instructions" id={instructionsId}>{props.step.instructions}</p>}
        {ready && props.step.methodChecklist && <div className="guided-tour-methods">
          <h3 id={checklistId}>{copy.controls.methods}</h3>
          <ul aria-labelledby={checklistId}>{TOUR_METHODS.map(method => {
            const visited = props.visitedMethods?.includes(method) ?? false;
            return <li key={method} data-visited={visited}><span aria-hidden="true">{visited ? '✓' : '○'}</span><span>{copy.methods[method]}<small>{visited ? copy.controls.visited : copy.controls.notVisited}</small></span></li>;
          })}</ul>
        </div>}
        {ready && (methodBlocked || props.step.nextDisabledReason) && <p id={blockedId} className="guided-tour-instructions">{methodBlocked ? copy.controls.visitAll : props.step.nextDisabledReason}</p>}
        {unavailable && <button type="button" className="guided-tour-retry" onClick={() => setAttempt(value => value + 1)}>{copy.controls.retry}</button>}
      </div>
      <nav className="guided-tour-rail" aria-label={copy.controls.tour}>
        <button type="button" onClick={props.onPrevious} disabled={props.canGoBack === false} aria-label={copy.controls.back} title={copy.controls.back}><span aria-hidden="true">{rtl ? '→' : '←'}</span></button>
        <button type="button" className="guided-tour-close" onClick={() => props.onClose('close')} aria-label={copy.controls.close} title={copy.controls.close}><span aria-hidden="true">×</span></button>
        <button type="button" onClick={props.onNext} disabled={blocked} aria-describedby={ready && (methodBlocked || props.step.nextDisabledReason) ? blockedId : undefined} aria-label={props.isLastStep ? copy.controls.finish : copy.controls.next} title={props.isLastStep ? copy.controls.finish : copy.controls.next}><span aria-hidden="true">{rtl ? '←' : '→'}</span></button>
      </nav>
    </section>
  </div>, host);
}
