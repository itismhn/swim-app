"use client";
import { startTransition, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
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
    <form
      ref={ref}
      // `action` keeps the form working before hydration (progressive enhancement).
      action={formAction}
      // After hydration we submit manually: React 19 otherwise resets every
      // uncontrolled field after the action, wiping input on validation errors.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => formAction(fd));
      }}
      className={className}
      noValidate
      aria-busy={pending}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state?.message && (
        <p role="status" className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm animate-fade-up ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {state.ok ? <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" /> : <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />}
          <span>{state.message}</span>
        </p>
      )}
      {submitLabel && (
        <button type="submit" className={`${submitClassName} mt-3`} disabled={pending}>
          {pending ? <><LoaderCircle aria-hidden className="animate-spin" />در حال ذخیره…</> : submitLabel}
        </button>
      )}
    </form>
  );
}

export function FieldError({ name, className = "" }: { name: string; className?: string }) {
  return <p data-error-for={name} hidden className={`mt-1.5 text-xs font-medium text-rose-600 ${className}`} />;
}
