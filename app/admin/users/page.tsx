import { listDashboardUsers } from "@/lib/queries";
import { setUserRoleAction } from "@/lib/actions";
import { CreateUserForm } from "@/components/CreateUserForm";

const ROLES = [
  { value: "leader", label: "Leader" },
  { value: "section_head", label: "Section Head" },
  { value: "admin", label: "Admin" },
];

export default async function UsersPage() {
  const users = await listDashboardUsers();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold text-foreground">User Dashboard &amp; Admin</h1>
        <p className="text-sm text-slate-500">
          Akun untuk login ke dashboard/admin (bukan member produksi — mereka absen via kiosk, FR-7.1).
        </p>
      </header>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Buat Akun Baru</h2>
        <CreateUserForm />
      </section>

      <section className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-2">Nama</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/60">
                <td className="px-4 py-2 text-slate-800">{u.name}</td>
                <td className="px-4 py-2 text-slate-500">{u.email}</td>
                <td className="px-4 py-2">
                  <form action={setUserRoleAction} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <select
                      name="role"
                      defaultValue={u.role ?? ""}
                      className="rounded-md border border-border px-2 py-1 text-sm"
                    >
                      <option value="" disabled>
                        Belum ada role
                      </option>
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs font-medium text-slate-600 hover:bg-muted"
                    >
                      Simpan
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
