import "server-only";
import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

export const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

let _files: Files | null = null;

export function getMediaStorage(): Files {
  if (!_files) {
    const bucket = process.env.SPELL_MEDIA_BUCKET || "spell-media";
    _files = new Files({
      adapter: neon({ bucket }),
    });
  }
  return _files;
}

export function validateMediaUpload(mimeType: string, sizeBytes: number) {
  if (ALLOWED_IMAGE_TYPES.has(mimeType)) {
    if (sizeBytes > MAX_IMAGE_BYTES) {
      return { ok: false as const, error: "La imagen supera el límite de 10 MB." };
    }
    return { ok: true as const, mediaType: "image" as const };
  }

  if (ALLOWED_VIDEO_TYPES.has(mimeType)) {
    if (sizeBytes > MAX_VIDEO_BYTES) {
      return { ok: false as const, error: "El video supera el límite de 50 MB." };
    }
    return { ok: true as const, mediaType: "video" as const };
  }

  return {
    ok: false as const,
    error: "Formato no permitido. Usá JPG, PNG, WebP, MP4, WebM o MOV.",
  };
}

export async function createPresignedUpload(key: string, mimeType: string) {
  const files = getMediaStorage();
  return files.signedUploadUrl(key, {
    contentType: mimeType,
    expiresIn: 600,
  });
}

export async function createPresignedReadUrl(key: string): Promise<string | null> {
  try {
    const files = getMediaStorage();
    return await files.url(key, { expiresIn: 900 });
  } catch {
    return null;
  }
}

export async function deleteStoredMedia(key: string): Promise<void> {
  try {
    const files = getMediaStorage();
    await files.delete(key);
  } catch {
    // Ignore missing object on cleanup
  }
}
