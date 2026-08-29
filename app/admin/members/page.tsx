import { listMembers } from "@/lib/queries";
import { createMemberAction, updateMemberAction, setMemberActiveAction } from "@/lib/actions";
import { IconSearch, IconPlus } from "@/components/icons";

export default async function MembersPage(props: PageProps<"/admin/members">) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const members = await listMembers(q);

  return (
    <div className="anim-stagger flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Master Member</h1>
          <p className="mt-1 text-sm text-muted-foreground">{members.length} member</p>
        </div>
        <form method="get" className="flex gap-2">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Cari nama / noreg..."
              className="w-56 rounded-lg border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="cursor-pointer rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            Cari
          </button>
        </form>
      </header>

      <section className="anim-fade-up rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <IconPlus className="h-4 w-4 text-primary" />
          Tambah Member
        </h2>
        <form action={createMemberAction} className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-muted-foreground">
            <span className="mb-1 block">Noreg</span>
            <input
              name="noreg"
              required
              className="block w-40 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            <span className="mb-1 block">Nama</span>
            <input
              name="nama"
              required
              className="block w-64 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            <span className="mb-1 block">Line</span>
            <input
              name="line"
              className="block w-40 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm uppercase text-foreground outline-none transition-colors focus:border-primary"
            />
          </label>
          <button
            type="submit"
            className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform duration-[var(--dur-fast)] hover:brightness-110 active:scale-95"
          >
            Tambah
          </button>
        </form>
      </section>

      <section className="anim-fade-up scrollbar-theme overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Noreg</th>
              <th className="px-5 py-3 font-medium">Nama</th>
              <th className="px-5 py-3 font-medium">Line</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr
                key={m.id}
                className="border-b border-border/60 transition-colors duration-[var(--dur-fast)] hover:bg-surface-2/60"
              >
                <td className="px-5 py-3 font-mono text-muted-foreground">{m.noreg}</td>
                <td className="px-5 py-3 text-foreground/90">{m.nama}</td>
                <td className="px-5 py-3 text-foreground/90">{m.line ?? "—"}</td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      m.is_active ? "bg-happy-bg text-happy" : "bg-surface-2 text-muted-foreground"
                    }`}
                  >
                    {m.is_active ? "Aktif" : "Non-aktif"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <details className="relative">
                      <summary className="cursor-pointer list-none rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
                        Edit
                      </summary>
                      <form
                        action={updateMemberAction}
                        className="anim-scale-in absolute right-0 z-10 mt-2 flex w-64 flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3 shadow-xl"
                      >
                        <input type="hidden" name="id" value={m.id} />
                        <label className="text-xs text-muted-foreground">
                          Noreg
                          <input
                            name="noreg"
                            defaultValue={m.noreg}
                            className="mt-1 block w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                          />
                        </label>
                        <label className="text-xs text-muted-foreground">
                          Nama
                          <input
                            name="nama"
                            defaultValue={m.nama}
                            className="mt-1 block w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                          />
                        </label>
                        <label className="text-xs text-muted-foreground">
                          Line
                          <input
                            name="line"
                            defaultValue={m.line ?? ""}
                            className="mt-1 block w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm uppercase text-foreground outline-none focus:border-primary"
                          />
                        </label>
                        <button
                          type="submit"
                          className="cursor-pointer rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-110"
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
                        className="cursor-pointer rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
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
