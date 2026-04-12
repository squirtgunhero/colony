// ============================================================================
// Server-side upload utility
// Uses UploadThing's UTApi for programmatic file uploads from buffers.
// ============================================================================

import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

/**
 * Upload a buffer to UploadThing and return a permanent URL.
 * Used for composited ad images, generated PDFs, etc.
 */
export async function uploadFromBuffer(
  buffer: Buffer,
  filename: string,
  contentType: string,
  _userId?: string
): Promise<{ url: string; key: string }> {
  // Convert Buffer to a File-like object that UTApi accepts
  // Use ArrayBuffer copy to avoid SharedArrayBuffer type incompatibility
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  const blob = new Blob([ab], { type: contentType });
  const file = new File([blob], filename, { type: contentType });

  const response = await utapi.uploadFiles(file);

  if (response.error) {
    throw new Error(`Upload failed: ${response.error.message}`);
  }

  return {
    url: response.data.ufsUrl || response.data.url,
    key: response.data.key,
  };
}
