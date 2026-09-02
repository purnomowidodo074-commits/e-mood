import { requireUser } from "@/lib/auth";
import { listDashboardUsers } from "@/lib/queries";
import { setUserRoleAction } from "@/lib/actions";
import { emailToUsername } from "@/lib/username";
import { CreateUserForm } from "@/components/CreateUserForm";
import { DeleteUserButton } from "@/components/DeleteUserButton";
import { IconUserCog } from "@/components/icons";

const ROLES = [
  { value: "leader", label: "Leader" },
  { value: "section_head", label: "Section Head" },
  { value: "admin", label: "Admin" },
];

export default async function UsersPage() {
  const [me, users] = await Promise.all([requireUser(["admin"]), listDashboardUsers()]);

  return (
    <div className="anim-stagger flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">User Dashboard &amp; Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Akun untuk login ke dashboard/admin (bukan member produksi — mereka absen via kiosk, FR-7.1).
        </p>
      </header>

      <section className="anim-fade-up rounded-2xl border border-border bg-surface p-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <IconUserCog className="h-4 w-4 text-primary" />
          Buat Akun Baru
        </h2>
        <CreateUserForm />
      </section>

      <section className="anim-fade-up scrollbar-theme overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Nama</th>
              <th className="px-5 py-3 font-medium">Username</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-border/60 transition-colors duration-[var(--dur-fast)] hover:bg-surface-2/60"
              >
                <td className="px-5 py-3 text-foreground/90">{u.name}</td>
                <td className="px-5 py-3 text-muted-foreground">{emailToUsername(u.email)}</td>
                <td className="px-5 py-3">
                  <form action={setUserRoleAction} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <select
                      name="role"
                      defaultValue={u.role ?? ""}
                      className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary"
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
                      className="cursor-pointer rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      Simpan
                    </button>
                  </form>
                </td>
                <td className="px-5 py-3">
                  {u.id !== me.id && <DeleteUserButton userId={u.id} name={u.name} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
