export function formatArs(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `$${Math.round(value).toLocaleString("es-AR")}`;
}

export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const rounded = Math.round(value * 100) / 100;
  return `${rounded} USD`;
}

export function formatDualPrice(
  priceArs: number | null | undefined,
  priceUsd: number | null | undefined
): string {
  const ars = formatArs(priceArs);
  const usd = formatUsd(priceUsd);
  if (ars === "—" && usd === "—") return "Sin precio";
  if (usd === "—") return ars;
  return `${ars} / ${usd}`;
}

/**
 * Compresses an image file client-side before uploading to Neon Object Storage.
 * Videos are returned untouched.
 */
export async function prepareMediaFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/heic") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const maxDim = 1600;
    let { width, height } = bitmap;
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.82)
    );
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.webp`, { type: "image/webp" });
  } catch {
    return file;
  }
}
