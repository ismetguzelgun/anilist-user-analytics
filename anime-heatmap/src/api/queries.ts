export const ANILIST_COLLECTION_QUERY = /* GraphQL */ `
  query AnimeCollection($userName: String!) {
    MediaListCollection(
      userName: $userName
      type: ANIME
      forceSingleCompletedList: false
    ) {
      lists {
        name
        isCustomList
        entries {
          status
          score
          progress
          startedAt {
            year
            month
            day
          }
          completedAt {
            year
            month
            day
          }
          media {
            id
            idMal
            episodes
            format
            seasonYear
            studios(isMain: true) {
              nodes {
                name
              }
            }
            startDate {
              year
              month
              day
            }
            title {
              userPreferred
              romaji
            }
          }
        }
      }
    }
  }
`;
