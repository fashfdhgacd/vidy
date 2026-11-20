import { AlertTriangle, Film } from "lucide-react";
import { useTr } from "@/lib/ui-lang";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  const tr = useTr();
  title ??= tr("Tidak ada film", "No videos found");
  description ??= tr("Coba kata kunci atau kategori lain.", "Try another keyword or category.");
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <Film className="size-8 text-muted" />
      <h2 className="font-display text-2xl text-foreground">{title}</h2>
      <p className="max-w-sm text-sm text-muted">{description}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const tr = useTr();
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <div>
        <h2 className="font-display text-2xl text-foreground">{tr("Katalog sedang bermasalah", "The catalog is having trouble")}</h2>
        <p className="mt-2 max-w-sm text-sm text-muted">{message}</p>
      </div>
      <Button onClick={onRetry}>{tr("Coba lagi", "Try again")}</Button>
    </div>
  );
}
