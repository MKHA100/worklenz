import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { createSignedDownloadUrl, createSignedUploadUrl } from "@/lib/storage/r2";

const MAX_EXPIRES_SECONDS = 15 * 60;

type SignBody = {
  key: string;
  mode: "upload" | "download";
  expiresInSeconds?: number;
};

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SignBody;
  try {
    body = (await request.json()) as SignBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.key || (body.mode !== "upload" && body.mode !== "download")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Allowed namespaces:
  //   users/{userId}/...  → personal files
  //   tasks/{taskId}/...  → task attachments (any authenticated user; task-level ACL enforced in app layer)
  const userPrefix = `users/${userId}/`;
  const taskPrefix = "tasks/";
  if (!body.key.startsWith(userPrefix) && !body.key.startsWith(taskPrefix)) {
    return NextResponse.json({ error: "Forbidden: key outside authorized namespace" }, { status: 403 });
  }

  const expiresInSeconds = Math.min(body.expiresInSeconds ?? 300, MAX_EXPIRES_SECONDS);
  const url =
    body.mode === "upload"
      ? await createSignedUploadUrl(body.key, expiresInSeconds)
      : await createSignedDownloadUrl(body.key, expiresInSeconds);

  return NextResponse.json({ url, expiresInSeconds });
}
