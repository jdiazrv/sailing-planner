import { throwIfError } from "@/lib/server-action-helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = { storage: any };

/** Returns the file extension to use for an uploaded image based on its MIME type. */
export const getImageExtension = (file: File) => {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  if (file.type === "image/svg+xml") return "svg";
  return "jpg";
};

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validates an uploaded image file.
 * Throws if the MIME type is not allowed or the file exceeds the size limit.
 */
export const validateImageUpload = (file: File) => {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    throw new Error(
      `File type "${file.type}" is not allowed. Use JPEG, PNG, WebP, GIF or SVG.`,
    );
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 10 MB.`,
    );
  }
};

/** Removes a list of paths from a Supabase Storage bucket, ignoring nulls and empty strings. */
export const removeStoragePaths = async (
  supabase: SupabaseClient,
  bucket: string,
  paths: Array<string | null | undefined>,
) => {
  const existingPaths = paths.filter(
    (path): path is string => typeof path === "string" && path.length > 0,
  );

  if (!existingPaths.length) {
    return;
  }

  const { error } = await supabase.storage.from(bucket).remove(existingPaths);
  throwIfError(error);
};
