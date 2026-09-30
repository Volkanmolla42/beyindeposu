import { useEffect, type RefObject } from "react";

export function useMobileDialogViewport(
  formRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const viewport = window.visualViewport;
    const dialog = formRef.current?.closest<HTMLElement>("[role=dialog]");
    if (!viewport || !dialog) return;
    const resize = () => {
      if (window.innerWidth < 768 && viewport.scale === 1) {
        dialog.style.height = `${viewport.height}px`;
        dialog.style.top = `${viewport.offsetTop}px`;
      } else {
        dialog.style.removeProperty("height");
        dialog.style.removeProperty("top");
      }
    };
    resize();
    viewport.addEventListener("resize", resize);
    viewport.addEventListener("scroll", resize);
    window.addEventListener("resize", resize);
    return () => {
      viewport.removeEventListener("resize", resize);
      viewport.removeEventListener("scroll", resize);
      window.removeEventListener("resize", resize);
      dialog.style.removeProperty("height");
      dialog.style.removeProperty("top");
    };
  }, [formRef]);
}
