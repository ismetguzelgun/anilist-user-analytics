# AniList User Analytics

AniList user analytics dashboard built as a client-side web app.

The app reads public AniList data by username and turns it into interactive charts for:
- release year vs completed year
- release year counts
- completion year counts
- studio overview
- genre overview
- completion lag

## Stack

- React 18
- TypeScript
- Vite
- Mantine
- Apache ECharts
- `graphql-request`
- AniList GraphQL API

## Current Features

- manual AniList refresh flow
- draft filters that apply only after refresh
- single-chart workspace with chart switching
- clickable charts that open matching anime in a result table
- sortable result table
- pagination with `25 / 50 / 100`
- genre and studio breakdowns

## Run Locally

```bash
cd anilist-user-analytics
npm install
npm run dev
```

Vite will print the local URL, usually:

```text
http://localhost:5173
```

## Build

```bash
cd anilist-user-analytics
npm run build
```

## Notes

- The app uses public AniList profile data, so normal read-only usage does not require a token.
- The source app lives under [`anilist-user-analytics/`](./anilist-user-analytics).
- This repo intentionally excludes local migration tooling and private helper files from GitHub.
