"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateReactHelpers } from "@uploadthing/react";
import { ImagePlus, Loader2, RefreshCw, Upload, X } from "lucide-react";
import type { OurFileRouter } from "@/lib/uploadthing";

const { useUploadThing } = generateReactHelpers<OurFileRouter>();

export type PendingImage = {
  /** Stable client id for list keys */
  clientId: string;
  url: string;
};

type UploadItem = {
  clientId: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
  url?: string;
};

type Props = {
  /** Max total images allowed (existing + pending) */
  maxFiles?: number;
  /** Already-saved images shown with delete */
  existing?: { id: string; url: string }[];
  onDeleteExisting?: (imageId: string) => Promise<void>;
  /** Called when a new file finishes uploading to UploadThing */
  onUploaded: (urls: string[]) => void | Promise<void>;
  /** Optional: remove a pending (not-yet-persisted) URL and delete from UT */
  onRemovePending?: (url: string) => void | Promise<void>;
  pendingUrls?: string[];
  disabled?: boolean;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 4 * 1024 * 1024;

function newClientId() {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function ProductImageUploader({
  maxFiles = 5,
  existing = [],
  onDeleteExisting,
  onUploaded,
  onRemovePending,
  pendingUrls = [],
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState("");

  const usedSlots = existing.length + pendingUrls.length + items.filter((i) => i.status !== "done" && i.status !== "error").length;
  const slotsLeft = Math.max(0, maxFiles - existing.length - pendingUrls.length);

  const { startUpload, isUploading } = useUploadThing("productImage", {
    uploadProgressGranularity: "fine",
    onUploadProgress: (p) => {
      setItems((prev) =>
        prev.map((item) =>
          item.status === "uploading" ? { ...item, progress: Math.min(99, Math.round(p)) } : item
        )
      );
    },
  });

  const revokePreviews = useCallback((list: UploadItem[]) => {
    list.forEach((i) => {
      if (i.previewUrl.startsWith("blob:")) URL.revokeObjectURL(i.previewUrl);
    });
  }, []);

  useEffect(() => {
    return () => {
      setItems((prev) => {
        revokePreviews(prev);
        return prev;
      });
    };
  }, [revokePreviews]);

  const updateItem = (clientId: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((i) => (i.clientId === clientId ? { ...i, ...patch } : i)));
  };

  const runUpload = async (files: File[]) => {
    if (disabled || files.length === 0) return;
    setBannerError("");

    const room = Math.max(0, maxFiles - existing.length - pendingUrls.length);
    if (room <= 0) {
      setBannerError(`Maximum of ${maxFiles} images allowed.`);
      return;
    }

    const accepted: File[] = [];
    for (const file of files.slice(0, room)) {
      if (!file.type.startsWith("image/")) {
        setBannerError("Only image files are allowed.");
        continue;
      }
      if (file.size > MAX_BYTES) {
        setBannerError("Each image must be 4MB or smaller.");
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length === 0) return;

    const queued: UploadItem[] = accepted.map((file) => ({
      clientId: newClientId(),
      file,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      status: "queued" as const,
    }));

    setItems((prev) => [...prev, ...queued]);

    for (const item of queued) {
      updateItem(item.clientId, { status: "uploading", progress: 5, error: undefined });
      try {
        const res = await startUpload([item.file]);
        const url = res?.[0]?.url;
        if (!url) throw new Error("No URL returned from upload");
        updateItem(item.clientId, { status: "done", progress: 100, url });
        await onUploaded([url]);
        // Drop from local queue once parent owns the URL
        setItems((prev) => {
          const gone = prev.find((i) => i.clientId === item.clientId);
          if (gone?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(gone.previewUrl);
          return prev.filter((i) => i.clientId !== item.clientId);
        });
      } catch (err: any) {
        updateItem(item.clientId, {
          status: "error",
          error: err?.message || "Upload failed. Check your connection.",
          progress: 0,
        });
      }
    }
  };

  const retryItem = async (clientId: string) => {
    const item = items.find((i) => i.clientId === clientId);
    if (!item) return;
    setItems((prev) => prev.filter((i) => i.clientId !== clientId));
    if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
    await runUpload([item.file]);
  };

  const dismissItem = (clientId: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.clientId === clientId);
      if (target?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.clientId !== clientId);
    });
  };

  const onFilesPicked = (list: FileList | File[] | null) => {
    if (!list) return;
    void runUpload(Array.from(list));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    onFilesPicked(e.dataTransfer.files);
  };

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (disabled) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        void runUpload(files);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, existing.length, pendingUrls.length]
  );

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const handleDeleteExisting = async (imageId: string) => {
    if (!onDeleteExisting) return;
    if (!confirm("Delete this image permanently from storage? This cannot be undone.")) return;
    setDeletingId(imageId);
    try {
      await onDeleteExisting(imageId);
    } catch {
      setBannerError("Failed to delete image.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRemovePending = async (url: string) => {
    try {
      await onRemovePending?.(url);
    } catch {
      setBannerError("Failed to remove image from storage.");
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && slotsLeft > 0) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed p-6 text-center transition ${
          dragOver
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40"
        } ${disabled || slotsLeft <= 0 ? "opacity-60 pointer-events-none" : "cursor-pointer"}`}
        onClick={() => !disabled && slotsLeft > 0 && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          disabled={disabled || slotsLeft <= 0}
          onChange={(e) => {
            onFilesPicked(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-300">
          <div className="p-3 rounded-full bg-white dark:bg-gray-800 border dark:border-gray-700">
            {isUploading ? (
              <Loader2 className="animate-spin text-blue-600" size={22} />
            ) : (
              <Upload size={22} className="text-blue-600" />
            )}
          </div>
          <p className="text-sm font-medium">
            Drag & drop images here, click to browse, or paste (Ctrl+V)
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            JPG, PNG, WebP, GIF · max 4MB each · {slotsLeft} slot{slotsLeft === 1 ? "" : "s"} left
          </p>
        </div>
      </div>

      {bannerError && (
        <div className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2">
          {bannerError}
        </div>
      )}

      {(existing.length > 0 || pendingUrls.length > 0 || items.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {existing.map((image) => (
            <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border dark:border-gray-600 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className="w-full h-full object-cover" />
              {onDeleteExisting && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDeleteExisting(image.id);
                  }}
                  disabled={deletingId === image.id}
                  className="absolute top-1.5 right-1.5 p-1.5 bg-red-600 text-white rounded-full opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition disabled:opacity-50"
                  title="Delete from storage"
                >
                  {deletingId === image.id ? <Loader2 className="animate-spin" size={12} /> : <X size={12} />}
                </button>
              )}
            </div>
          ))}

          {pendingUrls.map((url) => (
            <div key={url} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border dark:border-gray-600 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              {onRemovePending && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleRemovePending(url);
                  }}
                  className="absolute top-1.5 right-1.5 p-1.5 bg-red-600 text-white rounded-full opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition"
                  title="Remove and delete from storage"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}

          {items.map((item) => (
            <div key={item.clientId} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border dark:border-gray-600">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
              {(item.status === "uploading" || item.status === "queued") && (
                <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-2 px-2">
                  <Loader2 className="animate-spin text-white" size={20} />
                  <div className="w-full max-w-[80%] h-1.5 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-white font-medium">{item.progress}%</span>
                </div>
              )}
              {item.status === "error" && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 p-2 text-center">
                  <p className="text-[11px] text-red-200 line-clamp-3">{item.error || "Upload failed"}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void retryItem(item.clientId)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded-md"
                    >
                      <RefreshCw size={12} />
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => dismissItem(item.clientId)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/20 text-white rounded-md"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {slotsLeft > 0 && items.length === 0 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-500 hover:border-blue-400 hover:text-blue-500 transition"
            >
              <ImagePlus size={22} />
              <span className="text-xs">Add</span>
            </button>
          )}
        </div>
      )}

      {usedSlots > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {existing.length + pendingUrls.length} / {maxFiles} images
        </p>
      )}
    </div>
  );
}
