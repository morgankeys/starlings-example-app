import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Task and file detail panels live in the URL (?task=… / ?file=…) so they can be linked,
 * survive a reload and work on top of any page.
 */
export function usePanels() {
  const [params, setParams] = useSearchParams();
  const update = useCallback(
    (fn: (p: URLSearchParams) => void) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        fn(next);
        return next;
      }),
    [setParams],
  );
  return {
    taskId: params.get('task'),
    fileId: params.get('file'),
    openTask: useCallback(
      (id: string) => update((p) => (p.delete('file'), p.set('task', id))),
      [update],
    ),
    openFile: useCallback(
      (id: string) => update((p) => (p.delete('task'), p.set('file', id))),
      [update],
    ),
    close: useCallback(() => update((p) => (p.delete('task'), p.delete('file'))), [update]),
  };
}
