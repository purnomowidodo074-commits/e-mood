"use client";

import { useActionState } from "react";
import { createDashboardUserAction } from "@/lib/actions";

const initialState: { error?: string } = {};

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => createDashboardUserAction(formData),
    initialState
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="text-xs font-medium text-muted-foreground">
        <span className="mb-1 block">Nama</span>
        <input
          name="name"
          required
          className="block w-40 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        <span className="mb-1 block">Username</span>
        <input
          type="text"
          name="username"
          required
          autoCapitalize="none"
          spellCheck={false}
          className="block w-56 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        <span className="mb-1 block">Password</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          className="block w-40 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        <span className="mb-1 block">Role</span>
        <select
          name="role"
          required
          className="block rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        >
          <option value="leader">Leader</option>
          <option value="section_head">Section Head</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform duration-[var(--dur-fast)] hover:brightness-110 active:scale-95 disabled:opacity-50"
      >
        {pending ? "Membuat..." : "Buat Akun"}
      </button>
      {state.error && (
        <p role="alert" className="anim-fade w-full text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
