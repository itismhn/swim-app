"use client";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/action";

/**
 * Form wrapper for server actions: shows pending state, the action's message,
 * and per-field errors (rendered by <FieldError name=…/> via data attributes).
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  submitLabel,
  submitClassName = "btn-primary",
}: {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  submitLabel?: string;
  submitClassName?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok && state.redirectTo) router.push(state.redirectTo);
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess, router]);

  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    form.querySelectorAll<HTMLElement>("[data-error-for]").forEach((el) => {
      const msg = state?.fieldErrors?.[el.dataset.errorFor!];
      el.textContent = msg ?? "";
      el.hidden = !msg;
    });
  }, [state]);

  return (
    <form ref={ref} action={formAction} className={className} noValidate aria-busy={pending}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state?.message && (
        <p role="status" className={`mt-3 rounded-xl px-3 py-2 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {state.message}
        </p>
      )}
      {submitLabel && (
        <button type="submit" className={`${submitClassName} mt-3`} disabled={pending}>
          {pending ? "در حال ذخیره…" : submitLabel}
        </button>
      )}
    </form>
  );
}

export function FieldError({ name }: { name: string }) {
  return <p data-error-for={name} hidden className="mt-1 text-xs text-rose-600" />;
}
