"use server";

import { searchProfilesByUsername } from "@/lib/friends/queries";

export async function searchProfiles(query: string) {
  return searchProfilesByUsername(query);
}
