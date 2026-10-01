import { useEffect, useRef, useState } from 'react';

// Keeps a closing overlay mounted for `ms` so CSS exit animations can
// play: render when `visible`, use `closing` to swap enter/exit animation.
export function useExitTransition(open: boolean, ms: number = 240): {
  visible: boolean;
  closing: boolean;
} {
  const [visible, setVisible] = useState(open);
  const [closing, setClosing] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      setClosing(false);
      setVisible(true);
    } else {
      setClosing(true);
      timer.current = window.setTimeout(() => {
        setVisible(false);
        setClosing(false);
        timer.current = null;
      }, ms);
    }
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  return { visible, closing };
}
