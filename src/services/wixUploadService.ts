export interface UploadedLogo {
  logoMediaId: string;
  logoUrl: string;
  logoW: number;
  logoH: number;
}

/**
 * Upload an image file to the Wix Media Manager via our serverless route.
 * The browser never sees the WIX_API_KEY — the file is streamed to
 * /api/wix-upload, which holds the credential and talks to Wix.
 */
export async function uploadLogoToWix(file: File): Promise<UploadedLogo> {
  const body = new FormData();
  body.append("file", file);

  const res = await fetch("/api/wix-upload", { method: "POST", body });
  const data = (await res.json()) as Partial<UploadedLogo> & { error?: string };

  if (!res.ok) {
    throw new Error(data.error ?? `Upload failed (HTTP ${res.status})`);
  }
  if (!data.logoUrl || !data.logoMediaId) {
    throw new Error("Wix did not return a logo URL");
  }

  return {
    logoMediaId: data.logoMediaId,
    logoUrl: data.logoUrl,
    logoW: data.logoW ?? 1200,
    logoH: data.logoH ?? 630,
  };
}
