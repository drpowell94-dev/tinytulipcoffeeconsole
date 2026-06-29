const WIX_API_KEY = process.env.WIX_API_KEY ?? "";
const WIX_SITE_ID = process.env.WIX_SITE_ID ?? "";

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

  // Step 1: Get a signed upload URL from Wix Site Media
  const uploadUrlRes = await fetch("https://www.wixapis.com/site-media/v1/files/upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: WIX_API_KEY,
      "wix-site-id": WIX_SITE_ID,
    },
    body: JSON.stringify({ mimeType, fileName }),
  });

  if (!uploadUrlRes.ok) {
    const raw = await uploadUrlRes.text();
    return Response.json(
      { error: `Wix upload-url failed (${uploadUrlRes.status})`, raw },
      { status: 502 }
    );
  }

  const { uploadToken, uploadUrl } = (await uploadUrlRes.json()) as {
    uploadToken: string;
    uploadUrl: string;
  };

  if (!uploadUrl) {
    return Response.json({ error: "Wix did not return an uploadUrl" }, { status: 502 });
  }

  // Step 2: PUT the file bytes to the signed URL
  const bytes = await file.arrayBuffer();
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: bytes,
  });

  if (!putRes.ok) {
    return Response.json(
      { error: `File PUT to Wix failed (${putRes.status})` },
      { status: 502 }
    );
  }

  // Step 3: Register the uploaded file to get its permanent ID + URL
  const fileRes = await fetch("https://www.wixapis.com/site-media/v1/files", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: WIX_API_KEY,
      "wix-site-id": WIX_SITE_ID,
    },
    body: JSON.stringify({ token: uploadToken }),
  });

  if (!fileRes.ok) {
    const raw = await fileRes.text();
    return Response.json(
      { error: `Wix file registration failed (${fileRes.status})`, raw, uploadToken },
      { status: 502 }
    );
  }

  const fileData = (await fileRes.json()) as {
    file?: { id: string; url: string; displayName?: string };
  };

  const mediaId = fileData.file?.id ?? uploadToken;
  const logoUrl =
    fileData.file?.url ?? `https://static.wixstatic.com/media/${uploadToken}`;

  return Response.json({ logoMediaId: mediaId, logoUrl, logoW: 1200, logoH: 630 }, { status: 200 });
}
