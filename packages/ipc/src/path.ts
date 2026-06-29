import { homeDir } from "@tauri-apps/api/path";

export async function getJellyDir(): Promise<string> {
  const home = await homeDir();
  return `${home}/.jelly`;
}
