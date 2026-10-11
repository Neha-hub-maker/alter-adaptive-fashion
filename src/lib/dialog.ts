import type { KeyboardEvent } from "react";

/** Native modal semantics plus explicit focus wrapping inside the document. */
export function trapDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const elements = [...event.currentTarget.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex='0']")]
    .filter((element) => element.tabIndex >= 0 && !element.hasAttribute("disabled") && element.getClientRects().length > 0 && (!(element instanceof HTMLInputElement) || element.type !== "radio" || element.checked));
  const first = elements[0];
  const last = elements.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}

export function openDialog(dialog: HTMLDialogElement, trigger: HTMLElement | null) {
  const previousOverflow = document.body.style.overflow;
  dialog.showModal();
  document.body.style.overflow = "hidden";
  return () => {
    dialog.close();
    document.body.style.overflow = previousOverflow;
    if (trigger?.isConnected) {
      if (trigger.getClientRects().length) trigger.focus();
      else document.querySelector<HTMLAnchorElement>(".site-header a[href='/']")?.focus();
    }
  };
}
