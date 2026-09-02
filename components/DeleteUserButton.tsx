"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteDashboardUserAction } from "@/lib/actions";

// Inline two-step confirm (no window.confirm) for deleting a dashboard account
// from the /admin/users table.
export function DeleteUserButton({ userId, name }: { userId: string; name: string }) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    setError("");
    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      const res = await deleteDashboardUserAction(fd);
      if (res.error) {
        setError(res.error);
        setArmed(false);
        return;
      }
      router.refresh();
    });
  }

  if (!armed) {
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="cursor-pointer rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
        >
          Hapus
        </button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Hapus {name}?</span>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="cursor-pointer rounded-lg bg-destructive px-2.5 py-1.5 text-xs font-medium text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
      >
        {pending ? "..." : "Ya"}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        disabled={pending}
        className="cursor-pointer rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-2 disabled:opacity-50"
      >
        Batal
      </button>
    </div>
  );
}
