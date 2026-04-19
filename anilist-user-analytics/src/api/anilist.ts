import { GraphQLClient } from "graphql-request";
import { ANILIST_COLLECTION_QUERY } from "./queries";
import type { AniListCollectionResponse, AnimeListEntry } from "../lib/types";

const client = new GraphQLClient("https://graphql.anilist.co");

export async function fetchAnimeCollection(userName: string): Promise<AnimeListEntry[]> {
  const data = await client.request<AniListCollectionResponse>(
    ANILIST_COLLECTION_QUERY,
    { userName },
  );

  const lists = data.MediaListCollection?.lists ?? [];
  return lists.flatMap((list) => list.entries ?? []);
}
