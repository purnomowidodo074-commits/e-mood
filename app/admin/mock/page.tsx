import { requireUser } from "@/lib/auth";
import { getConfidenceThreshold, countMockMoodRecords } from "@/lib/queries";
import { todayISO, isoDaysAgo } from "@/lib/date";
import { MockDataForm } from "@/components/MockDataForm";
import { IconDatabase } from "@/components/icons";

export default async function MockPage() {
  await requireUser(["admin"]);
  const [threshold, mockCount] = await Promise.all([getConfidenceThreshold(), countMockMoodRecords()]);

  return (
    <div className="anim-stagger flex flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <IconDatabase className="h-5 w-5 text-primary" />
          Mock Data
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Isi dashboard dengan data absen palsu untuk kebutuhan presentasi/demo — bukan hasil kamera.
          Semua record ditandai <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">device_id=mock</code> dan
          bisa dihapus sekaligus tanpa menyentuh data absen asli. Record hanya dibuat untuk member yang
          belum absen di hari + shift itu, jadi aman dijalankan berkali-kali.
        </p>
      </header>

      <MockDataForm
        defaultStart={isoDaysAgo(13)}
        defaultEnd={todayISO()}
        threshold={threshold}
        mockCount={mockCount}
      />
    </div>
  );
}
