const WIX_API_KEY = process.env.WIX_API_KEY ?? "";
const WIX_SITE_ID = process.env.WIX_SITE_ID ?? "";

/**
 * Derive the Media Manager identifier (e.g. "60a8ee_abc123~mv2.jpg") from a
 * Wix static URL. This is the form the Events API's mainImage.id expects, and
 * it matches how the seeded venues store logo_media_id.
 */
function mediaIdFromUrl(url: string): string {
  const marker = "/media/";
  const idx = url.indexOf(marker);
  if (idx === -1) return "";
  return url.slice(idx + marker.length).split("?")[0];
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  if (!WIX_API_KEY || !WIX_SITE_ID) {
    return Response.json({ error: "Wix credentials not configured" }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return Response.json({ error: "No file field in form data" }, { status: 400 });
  }

  const mimeType = file.type || "image/jpeg";
  const fileName = file.name || "venue-logo.jpg";
  const bytes = await file.arrayBuffer();

  // Step 1: Ask Wix for a signed upload URL.
  const genRes = await fetch(
    "https://www.wixapis.com/site-media/v1/files/generate-upload-url",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: WIX_API_KEY,
        "wix-site-id": WIX_SITE_ID,
      },
      body: JSON.stringify({
        mimeType,
        fileName,
        sizeInBytes: String(bytes.byteLength),
        private: false,
      }),
    }
  );

  if (!genRes.ok) {
    const raw = await genRes.text();
    return Response.json(
      { error: `Wix generate-upload-url failed (${genRes.status})`, raw },
      { status: 502 }
    );
  }

  const { uploadUrl } = (await genRes.json()) as { uploadUrl?: string };
  if (!uploadUrl) {
    return Response.json({ error: "Wix did not return an uploadUrl" }, { status: 502 });
  }

  // Step 2: PUT the bytes to the signed URL. The file descriptor comes back in
  // this response — there is no separate register step.
  const putUrl = `${uploadUrl}${uploadUrl.includes("?") ? "&" : "?"}filename=${encodeURIComponent(fileName)}`;
  const putRes = await fetch(putUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: bytes,
  });

  if (!putRes.ok) {
    const raw = await putRes.text();
    return Response.json(
      { error: `File upload PUT failed (${putRes.status})`, raw },
      { status: 502 }
    );
  }

  // The descriptor may arrive as { file: {...} } or { files: [{...}] }.
  const putJson = (await putRes.json()) as Record<string, unknown>;
  const descriptor =
    (putJson.file as Record<string, unknown> | undefined) ??
    (Array.isArray(putJson.files) ? (putJson.files[0] as Record<string, unknown>) : undefined) ??
    putJson;

  const logoUrl = (descriptor.url as string) ?? "";
  if (!logoUrl) {
    return Response.json(
      { error: "Upload succeeded but no file URL was returned", raw: putJson },
      { status: 502 }
    );
  }

  // Prefer the media identifier embedded in the URL (matches the Events API's
  // mainImage.id format); fall back to the descriptor id.
  const logoMediaId = mediaIdFromUrl(logoUrl) || (descriptor.id as string) || "";

  // Image dimensions, when Wix reports them, live under media.image.image.
  const media = descriptor.media as Record<string, unknown> | undefined;
  const image = media?.image as Record<string, unknown> | undefined;
  const inner = (image?.image as Record<string, unknown> | undefined) ?? image;
  const logoW = Number(inner?.width) || 1200;
  const logoH = Number(inner?.height) || 630;

  return Response.json({ logoMediaId, logoUrl, logoW, logoH }, { status: 200 });
}
