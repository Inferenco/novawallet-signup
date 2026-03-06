import { supabase } from "@/lib/supabase";

const BUCKET_NAME = "NovaWalletAvatars";

function getFileExtension(fileName: string): string {
  const rawExtension = fileName.split(".").pop() || "jpg";
  return rawExtension.split("?")[0].toLowerCase();
}

export function canUploadProfileImages(): boolean {
  return Boolean(supabase);
}

export async function uploadProfileImage(file: File, walletAddress: string): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }

  const extension = getFileExtension(file.name);
  const path = `${walletAddress}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
