import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Topbar } from "@/components/layout/topbar";
import { KeyForm } from "@/components/keys/key-form";

export const dynamic = "force-dynamic";

export default async function EditKeyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const currentUserId = session?.user?.id ?? "";
  const currentUserRole = session?.user?.role ?? "MEMBER";
  const isPrivileged = currentUserRole === "ADMIN" || currentUserRole === "SUB_ADMIN";

  const key = await db.apiKey.findUnique({
    where: { id },
    include: { monitorConfig: true },
  });
  if (!key) notFound();

  if (!isPrivileged && key.createdById !== currentUserId) {
    redirect(`/keys/${id}`);
  }

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
