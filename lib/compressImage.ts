"use client";

// Client-side downscale + re-encode so uploaded phone photos (often 5-15MB)
// fit comfortably in the interim Postgres photo column (~3MB cap) instead of
// shipping the original file to the server.
export async function compressImageToDataUrl(
  file: File,
  { maxDimension = 1280, quality = 0.75 }: { maxDimension?: number; quality?: number } = {}
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error("Could not encode image.")); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      quality
    );
  });
}
