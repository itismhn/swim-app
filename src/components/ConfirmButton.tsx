"use client";

/** Submit button for destructive actions: asks before submitting and has a finger-sized tap area. */
export function ConfirmButton({
  children = "حذف",
  message = "آیا از حذف این مورد مطمئن هستید؟",
  className = "",
}: { children?: React.ReactNode; message?: string; className?: string }) {
  return (
    <button
      type="submit"
      className={`-my-2 inline-flex min-h-10 items-center px-2 text-xs text-rose-600 ${className}`}
      onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}
    >
      {children}
    </button>
  );
}
