import { useCallback, useState } from 'react';

// Generic button-like object that contains at least an `id` or `button_id` property
export type ButtonLike = { id?: string; button_id?: string } & Record<string, any>;

export function useClickedButtons() {
  const [clickedButtons, setClickedButtons] = useState<Set<string>>(new Set());

  const getButtonId = useCallback((button: ButtonLike): string => {
    return button.id || button.button_id || '';
  }, []);

  const markClicked = useCallback((buttonId: string) => {
    if (!buttonId) return;
    setClickedButtons(prev => {
      const next = new Set(prev);
      next.add(buttonId);
      return next;
    });
  }, []);

  const handleClick = useCallback(
    (button: ButtonLike, callback?: (button: ButtonLike) => void) => {
      const id = getButtonId(button);
      if (!id || clickedButtons.has(id)) return;
      markClicked(id);
      callback?.(button);
    },
    [clickedButtons, getButtonId, markClicked]
  );

  return { clickedButtons, getButtonId, markClicked, handleClick };
}
