import { Topbar } from "@/components/layout/topbar";
import { KeyForm } from "@/components/keys/key-form";

export default function NewKeyPage() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Add API Key" description="Store a new API key securely" />
      <div className="flex-1 p-6">
        <KeyForm />
      </div>
    </div>
  );
}
