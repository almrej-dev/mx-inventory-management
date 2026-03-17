import { getZReadings } from "@/actions/z-reading";
import { getAuth } from "@/lib/auth";
import { ZReadingClient } from "@/components/z-reading/z-reading-client";

export default async function ZReadingPage() {
  const [{ readings, error }, { userRole }] = await Promise.all([
    getZReadings(),
    getAuth(),
  ]);

  return (
    <div>
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive-muted px-4 py-3 text-sm text-destructive-muted-foreground">
          {error}
        </div>
      )}

      <ZReadingClient initialData={readings} userRole={userRole} />
    </div>
  );
}
