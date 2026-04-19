# AniList User Analytics

Local AniList visualization app for `kneestronk`.

## Run

```bash
cd /Users/guzelgun/CrawlProjects/malexportus/anilist-user-analytics
npm install
npm run dev
```

Open the local URL Vite prints, usually:

```text
http://localhost:4173
```

## Current Shape

- Public AniList GraphQL reads via `graphql-request`
- React + TypeScript app scaffolded with Vite
- Apache ECharts visualizations for:
  - release year vs completed year heatmap
  - high-score count by release year
  - high-score count by completion year
  - completion lag histogram

## Notes

- The app refetches on manual refresh and when the browser regains focus.
- It currently uses public AniList profile data, so no token is required for localhost.
