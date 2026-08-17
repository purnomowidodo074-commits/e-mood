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
      <label className="text-sm text-slate-600">
        Nama
        <input name="name" required className="mt-1 block w-40 rounded-md border border-border px-2 py-1.5 text-sm" />
      </label>
      <label className="text-sm text-slate-600">
        Email
        <input
          type="email"
          name="email"
          required
          className="mt-1 block w-56 rounded-md border border-border px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-sm text-slate-600">
        Password
        <input
          type="password"
          name="password"
          required
          minLength={8}
          className="mt-1 block w-40 rounded-md border border-border px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-sm text-slate-600">
        Role
        <select name="role" required className="mt-1 block rounded-md border border-border px-2 py-1.5 text-sm">
          <option value="leader">Leader</option>
          <option value="section_head">Section Head</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? "Membuat..." : "Buat Akun"}
      </button>
      {state.error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
