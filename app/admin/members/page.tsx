import { listMembers } from "@/lib/queries";
import { createMemberAction, updateMemberAction, setMemberActiveAction } from "@/lib/actions";

export default async function MembersPage(props: PageProps<"/admin/members">) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const members = await listMembers(q);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Master Member</h1>
          <p className="text-sm text-slate-500">{members.length} member</p>
        </div>
        <form method="get" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Cari nama / noreg..."
            className="w-56 rounded-md border border-border bg-white px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-muted"
          >
            Cari
          </button>
        </form>
      </header>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Tambah Member</h2>
        <form action={createMemberAction} className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-slate-600">
            Noreg
            <input
              name="noreg"
              required
              className="mt-1 block w-40 rounded-md border border-border px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-sm text-slate-600">
            Nama
            <input
              name="nama"
              required
              className="mt-1 block w-64 rounded-md border border-border px-2 py-1.5 text-sm"
            />
          </label>
          <button
            type="submit"
            className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Tambah
          </button>
        </form>
      </section>

      <section className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-2">Noreg</th>
              <th className="px-4 py-2">Nama</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-border/60">
                <td className="px-4 py-2 font-mono text-slate-600">{m.noreg}</td>
                <td className="px-4 py-2 text-slate-800">{m.nama}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.is_active ? "bg-happy-bg text-happy" : "bg-muted text-slate-500"
                    }`}
                  >
                    {m.is_active ? "Aktif" : "Non-aktif"}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <details className="relative">
                      <summary className="cursor-pointer list-none rounded-md border border-border px-2 py-1 text-xs font-medium text-slate-600 hover:bg-muted">
                        Edit
                      </summary>
                      <form
                        action={updateMemberAction}
                        className="absolute right-0 z-10 mt-2 flex w-64 flex-col gap-2 rounded-md border border-border bg-surface p-3 shadow-md"
                      >
                        <input type="hidden" name="id" value={m.id} />
                        <label className="text-xs text-slate-600">
                          Noreg
                          <input
                            name="noreg"
                            defaultValue={m.noreg}
                            className="mt-1 block w-full rounded-md border border-border px-2 py-1 text-sm"
                          />
                        </label>
                        <label className="text-xs text-slate-600">
                          Nama
                          <input
                            name="nama"
                            defaultValue={m.nama}
                            className="mt-1 block w-full rounded-md border border-border px-2 py-1 text-sm"
                          />
                        </label>
                        <button
                          type="submit"
                          className="cursor-pointer rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                        >
                          Simpan
                        </button>
                      </form>
                    </details>
                    <form action={setMemberActiveAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="isActive" value={(!m.is_active).toString()} />
                      <button
                        type="submit"
                        className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs font-medium text-slate-600 hover:bg-muted"
                      >
                        {m.is_active ? "Non-aktifkan" : "Aktifkan"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
