import { prepareMediaFile } from "./format";

export async function uploadEntityCover(
  entityType: "spell" | "ingredient",
  entityId: string,
  file: File
): Promise<{ imageUrl: string | null }> {
  const prepared = await prepareMediaFile(file);

  const presignRes = await fetch("/api/media/cover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entityType,
      entityId,
      fileName: prepared.name,
      mimeType: prepared.type || "image/jpeg",
      sizeBytes: prepared.size,
    }),
  });

  const presignData = await presignRes.json();
  if (!presignRes.ok) {
    throw new Error(presignData.error || "Error preparando la subida");
  }

  const uploadUrl =
    typeof presignData.upload === "string"
      ? presignData.upload
      : presignData.upload?.url;

  if (!uploadUrl) {
    throw new Error("URL de subida no disponible");
  }

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": prepared.type || "image/jpeg" },
    body: prepared,
  });

  if (!putRes.ok) {
    throw new Error("Falló la subida de la imagen al almacenamiento");
  }

  return { imageUrl: presignData.imageUrl ?? null };
}

export async function removeEntityCover(
  entityType: "spell" | "ingredient",
  entityId: string
): Promise<void> {
  const res = await fetch(
    `/api/media/cover?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "No se pudo quitar la imagen");
  }
}
