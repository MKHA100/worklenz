import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { requireUserProfile } from "@/lib/users/profile";

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? ""
  }
});

const r2Bucket = process.env.CLOUDFLARE_R2_BUCKET ?? "";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
  const profile = await requireUserProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const taskId = formData.get("taskId") as string | null;

  if (!file || !taskId) {
    return NextResponse.json({ error: "file and taskId are required" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 413 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileKey = `tasks/${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  await r2Client.send(new PutObjectCommand({
    Bucket: r2Bucket,
    Key: fileKey,
    Body: buffer,
    ContentType: file.type || "application/octet-stream",
    ContentLength: buffer.length
  }));

  return NextResponse.json({
    fileKey,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size
  }, { status: 201 });
}
