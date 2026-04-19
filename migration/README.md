# malexportus

`MyAnimeList`'s official XML export often does not preserve useful completion dates. Your file at `/Users/guzelgun/Downloads/animelist_1776457652_-_3797141.xml` is a good example: it has 366 completed anime entries, and 351 of those have `my_finish_date=0000-00-00`.

This project uses the `malexport` Python package to recover more history from your account and merge it into one report.

## What it does

- Reads the official MAL anime XML export.
- Uses `malexport.parse.xml` and `malexport.parse.history` to pull better dates from scraped MAL data.
- Produces:
  - a JSON report with summary stats and one row per anime
  - a CSV you can sort/filter in Excel, Numbers, or LibreOffice

For completed anime, the report uses this priority:

1. `xml_finish_date` from the XML, if present
2. `history_last_event` from `malexport` episode history, if XML is missing it
3. `missing` if neither source has enough data

## Setup

```bash
cd /Users/guzelgun/CrawlProjects/malexportus
python3 -m venv .venv
.venv/bin/python -m pip install malexport
```

You can run the project directly from source, so an editable install is not required:

```bash
PYTHONPATH=src .venv/bin/python -m malexportus summary
```

## Current summary for `kneestronk`

Run:

```bash
PYTHONPATH=src .venv/bin/python -m malexportus summary
```

With the official XML alone, the key gap is:

- `366` completed anime total
- `351` completed anime still missing a usable completion date

## Pull richer history with `malexport`

The `malexport` package needs your MAL login in order to scrape the private history pages. The repo here does not store your credentials.

Typical flow:

```bash
.venv/bin/malexport update export -u kneestronk
.venv/bin/malexport update history -u kneestronk
```

That usually writes account data under:

```text
~/.local/share/malexport/kneestronk
```

If you also want MAL's list JSON cache:

```bash
.venv/bin/malexport update lists -u kneestronk
```

## Build the merged report

If `malexport` wrote to its default location:

```bash
PYTHONPATH=src .venv/bin/python -m malexportus report
```

If your `malexport` data is somewhere else:

```bash
PYTHONPATH=src .venv/bin/python -m malexportus --malexport-data-dir /path/to/malexport/kneestronk report
```

Outputs:

- `reports/watch_history.json`
- `reports/watch_history.csv`

## Notes

- `history_last_event` is the latest episode history event for a title. For completed entries, that is a practical proxy for "when I completed this".
- This is still only as good as what MAL exposes through its history UI. If MAL never recorded an item, the report cannot invent the date.
- `malexport`'s history timestamps depend on the timezone configured in your MAL account settings.
