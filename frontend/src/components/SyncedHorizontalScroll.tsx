import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

// Adds a top horizontal scrollbar synced with the main scroll container.
// This makes wide tables usable without scrolling to the bottom first.
export const SyncedHorizontalScroll: React.FC<Props> = ({ children, className, contentClassName }) => {
  const topRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    setScrollWidth(el.scrollWidth);
  }, [children]);

  useEffect(() => {
    const top = topRef.current;
    const content = contentRef.current;
    if (!top || !content) return;

    let syncing = false;
    const onTopScroll = () => {
      if (syncing) return;
      syncing = true;
      content.scrollLeft = top.scrollLeft;
      syncing = false;
    };
    const onContentScroll = () => {
      if (syncing) return;
      syncing = true;
      top.scrollLeft = content.scrollLeft;
      syncing = false;
    };

    top.addEventListener('scroll', onTopScroll, { passive: true });
    content.addEventListener('scroll', onContentScroll, { passive: true });

    const ro = new ResizeObserver(() => {
      setScrollWidth(content.scrollWidth);
    });
    ro.observe(content);

    return () => {
      top.removeEventListener('scroll', onTopScroll);
      content.removeEventListener('scroll', onContentScroll);
      ro.disconnect();
    };
  }, []);

  return (
    <div className={className}>
      <div ref={topRef} className="overflow-x-auto" aria-hidden="true">
        <div style={{ width: scrollWidth, height: 1 }} />
      </div>
      <div ref={contentRef} className={contentClassName || 'overflow-x-auto'}>
        {children}
      </div>
    </div>
  );
};

