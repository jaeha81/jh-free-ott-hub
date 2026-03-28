import { Suspense } from "react";
import BrowseClient from "./BrowseClient";
import { Loader2 } from "lucide-react";

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen bg-[#141414]">
          <Loader2 size={32} className="animate-spin text-[#e50914]" />
        </div>
      }
    >
      <BrowseClient />
    </Suspense>
  );
}
