import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Topbar } from "@/components/layout/topbar";
import { KeyForm } from "@/components/keys/key-form";

export const dynamic = "force-dynamic";

export default async function EditKeyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const key = await db.apiKey.findUnique({
    where: { id },
    include: { monitorConfig: true },
  });
  if (!key) notFound();

  return (
    <div className="flex flex-col flex-1">
      <Topbar title={`Edit: ${key.name}`} description="Update key details or rotate the value" />
      <div className="flex-1 p-6">
        <KeyForm
          initialData={{
            id: key.id,
            name: key.name,
            provider: key.provider,
            expiresAt: key.expiresAt,
            tags: key.tags,
            notes: key.notes,
            monitorConfig: key.monitorConfig,
          }}
        />
      </div>
    </div>
  );
}
