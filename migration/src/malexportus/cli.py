from __future__ import annotations

import argparse
import csv
import json
import os
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET


def _prepare_runtime_dirs(project_root: Path) -> None:
    runtime_root = project_root / "runtime"
    data_root = runtime_root / "xdg-data"
    config_root = runtime_root / "xdg-config"
    cache_root = runtime_root / "xdg-cache"
    zip_root = runtime_root / "malexport-zips"
    mal_id_cache = runtime_root / "mal-id-cache"
    for path in (data_root, config_root, cache_root, zip_root, mal_id_cache):
        path.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("XDG_DATA_HOME", str(data_root))
    os.environ.setdefault("XDG_CONFIG_HOME", str(config_root))
    os.environ.setdefault("XDG_CACHE_DIR", str(cache_root))
    os.environ.setdefault("MALEXPORT_ZIP_BACKUPS", str(zip_root))
    os.environ.setdefault("MAL_ID_CACHE_DIR", str(mal_id_cache))


PROJECT_ROOT = Path(__file__).resolve().parents[2]
_prepare_runtime_dirs(PROJECT_ROOT)

from malexport.parse.history import iter_history_from_dir
from malexport.parse.xml import parse_xml


@dataclass(slots=True)
class AnimeRow:
    mal_id: int
    title: str
    status: str
    score: int
    watched_episodes: int
    total_episodes: int
    xml_start_date: str | None
    xml_finish_date: str | None
    history_entries: int
    first_history_at: str | None
    last_history_at: str | None
    inferred_completed_at: str | None
    completed_at_source: str
    url: str


@dataclass(slots=True)
class AniListUpdateRow:
    anilist_media_id: int
    mal_id: int
    title: str
    completed_at: dict[str, int]
    source_date: str
    source_kind: str


def _date_to_str(value: date | datetime | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return value.isoformat()


def _build_history_index(data_dir: Path) -> dict[int, list[datetime]]:
    history_index: dict[int, list[datetime]] = {}
    for item in iter_history_from_dir(data_dir):
        if item.list_type != "anime":
            continue
        history_index[item.mal_id] = sorted(entry.at for entry in item.entries)
    return history_index


def build_rows(xml_path: Path, malexport_data_dir: Path | None) -> list[AnimeRow]:
    parsed = parse_xml(xml_path)
    if parsed.list_type != "anime":
        raise ValueError(f"Expected anime XML export, got {parsed.list_type!r}")

    history_index: dict[int, list[datetime]] = {}
    if malexport_data_dir is not None:
        history_index = _build_history_index(malexport_data_dir)

    rows: list[AnimeRow] = []
    for entry in parsed.entries:
        history = history_index.get(entry.id, [])
        first_history_at = history[0] if history else None
        last_history_at = history[-1] if history else None

        inferred_completed_at: date | datetime | None = None
        completed_at_source = "missing"
        if entry.finish_date is not None:
            inferred_completed_at = entry.finish_date
            completed_at_source = "xml_finish_date"
        elif entry.status == "Completed" and last_history_at is not None:
            inferred_completed_at = last_history_at
            completed_at_source = "history_last_event"

        rows.append(
            AnimeRow(
                mal_id=entry.id,
                title=entry.title,
                status=entry.status,
                score=entry.score,
                watched_episodes=entry.watched_episodes,
                total_episodes=entry.episodes,
                xml_start_date=_date_to_str(entry.start_date),
                xml_finish_date=_date_to_str(entry.finish_date),
                history_entries=len(history),
                first_history_at=_date_to_str(first_history_at),
                last_history_at=_date_to_str(last_history_at),
                inferred_completed_at=_date_to_str(inferred_completed_at),
                completed_at_source=completed_at_source,
                url=f"https://myanimelist.net/anime/{entry.id}",
            )
        )
    rows.sort(
        key=lambda row: (
            row.inferred_completed_at is None,
            row.inferred_completed_at or "",
            row.title.lower(),
        )
    )
    return rows


def _summarize(rows: list[AnimeRow]) -> dict[str, Any]:
    status_counts = Counter(row.status for row in rows)
    completed = [row for row in rows if row.status == "Completed"]
    return {
        "entries": len(rows),
        "status_counts": dict(status_counts),
        "completed_entries": len(completed),
        "completed_with_xml_finish_date": sum(
            1 for row in completed if row.completed_at_source == "xml_finish_date"
        ),
        "completed_inferred_from_history": sum(
            1 for row in completed if row.completed_at_source == "history_last_event"
        ),
        "completed_still_missing_date": sum(
            1 for row in completed if row.completed_at_source == "missing"
        ),
        "entries_with_any_history": sum(1 for row in rows if row.history_entries > 0),
    }


def _write_csv(rows: list[AnimeRow], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(asdict(rows[0]).keys()))
        writer.writeheader()
        for row in rows:
            writer.writerow(asdict(row))


def _write_json(payload: dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _resolve_data_dir(username: str, explicit_dir: Path | None) -> Path | None:
    if explicit_dir is not None:
        return explicit_dir.expanduser().resolve()
    default_dir = Path.home() / ".local" / "share" / "malexport" / username
    if default_dir.exists():
        return default_dir
    return None


def _normalize_xml_date(value: str | None) -> str | None:
    if not value:
        return None
    return value.split("T", 1)[0]


def _parse_fuzzy_date(value: str | None) -> dict[str, int] | None:
    normalized = _normalize_xml_date(value)
    if normalized is None:
        return None
    year_s, month_s, day_s = normalized.split("-")
    return {
        "year": int(year_s),
        "month": int(month_s),
        "day": int(day_s),
    }


def patch_xml(xml_path: Path, rows: list[AnimeRow], output_path: Path) -> dict[str, int]:
    tree = ET.parse(xml_path)
    root = tree.getroot()
    rows_by_id = {row.mal_id: row for row in rows}
    patched = 0
    already_had_date = 0
    skipped_missing = 0

    for anime in root.findall("anime"):
        mal_id_text = anime.findtext("series_animedb_id")
        status = anime.findtext("my_status") or ""
        finish_el = anime.find("my_finish_date")
        if mal_id_text is None or finish_el is None:
            continue

        row = rows_by_id.get(int(mal_id_text))
        if row is None or status != "Completed":
            continue

        current_finish = (finish_el.text or "").strip()
        if current_finish not in {"", "0000-00-00"}:
            already_had_date += 1
            continue

        patched_date = _normalize_xml_date(row.inferred_completed_at)
        if patched_date is None:
            skipped_missing += 1
            continue

        finish_el.text = patched_date
        patched += 1

    output_path.parent.mkdir(parents=True, exist_ok=True)
    tree.write(output_path, encoding="utf-8", xml_declaration=True)
    return {
        "patched_from_history": patched,
        "already_had_finish_date": already_had_date,
        "still_missing_finish_date": skipped_missing,
    }


def load_anilist_entries(response_path: Path) -> list[dict[str, Any]]:
    payload = json.loads(response_path.read_text(encoding="utf-8"))
    lists = payload["data"]["MediaListCollection"]["lists"]
    entries: list[dict[str, Any]] = []
    for group in lists:
        entries.extend(group.get("entries", []))
    return entries


def _is_missing_completed_at(completed_at: dict[str, Any] | None) -> bool:
    if completed_at is None:
        return True
    return any(completed_at.get(part) is None for part in ("year", "month", "day"))


def build_anilist_updates(
    rows: list[AnimeRow], anilist_entries: list[dict[str, Any]]
) -> list[AniListUpdateRow]:
    by_mal_id = {row.mal_id: row for row in rows}
    updates: list[AniListUpdateRow] = []
    for entry in anilist_entries:
        media = entry.get("media") or {}
        mal_id = media.get("idMal")
        anilist_media_id = media.get("id")
        if mal_id is None or anilist_media_id is None:
            continue
        if not _is_missing_completed_at(entry.get("completedAt")):
            continue
        row = by_mal_id.get(int(mal_id))
        if row is None:
            continue
        if row.status != "Completed":
            continue
        fuzzy_date = _parse_fuzzy_date(row.inferred_completed_at)
        if fuzzy_date is None:
            continue
        updates.append(
            AniListUpdateRow(
                anilist_media_id=int(anilist_media_id),
                mal_id=int(mal_id),
                title=str(media.get("title", {}).get("userPreferred") or row.title),
                completed_at=fuzzy_date,
                source_date=str(row.inferred_completed_at),
                source_kind=row.completed_at_source,
            )
        )
    updates.sort(key=lambda item: (item.completed_at["year"], item.completed_at["month"], item.completed_at["day"], item.title.lower()))
    return updates


def _write_graphql_batches(
    updates: list[AniListUpdateRow], output_dir: Path, batch_size: int
) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for start in range(0, len(updates), batch_size):
        chunk = updates[start : start + batch_size]
        lines = ["mutation ApplyCompletedDates {"]
        for offset, item in enumerate(chunk, start=1):
            alias = f"u{start + offset}"
            lines.append(
                "  "
                + f'{alias}: SaveMediaListEntry(mediaId: {item.anilist_media_id}, status: COMPLETED, completedAt: {{year: {item.completed_at["year"]}, month: {item.completed_at["month"]}, day: {item.completed_at["day"]}}}) '
                + "{ mediaId status completedAt { year month day } }"
            )
        lines.append("}")
        path = output_dir / f"anilist_update_batch_{(start // batch_size) + 1:03d}.graphql"
        path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        written.append(path)
    return written


def cmd_prepare_anilist_updates(args: argparse.Namespace) -> int:
    data_dir = _resolve_data_dir(args.username, args.malexport_data_dir)
    rows = build_rows(args.xml, data_dir)
    anilist_entries = load_anilist_entries(args.anilist_response)
    updates = build_anilist_updates(rows, anilist_entries)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    json_output = args.output_dir / "anilist_completed_date_updates.json"
    json_output.write_text(
        json.dumps([asdict(item) for item in updates], indent=2),
        encoding="utf-8",
    )
    batch_paths = _write_graphql_batches(updates, args.output_dir, args.batch_size)
    summary = {
        "anilist_entries_seen": len(anilist_entries),
        "updates_needed": len(updates),
        "graphql_batches_written": len(batch_paths),
        "json_output": str(json_output),
    }
    print(json.dumps(summary, indent=2))
    for path in batch_paths:
        print(path)
    return 0


def cmd_summary(args: argparse.Namespace) -> int:
    data_dir = _resolve_data_dir(args.username, args.malexport_data_dir)
    rows = build_rows(args.xml, data_dir)
    print(json.dumps(_summarize(rows), indent=2))
    return 0


def cmd_report(args: argparse.Namespace) -> int:
    data_dir = _resolve_data_dir(args.username, args.malexport_data_dir)
    rows = build_rows(args.xml, data_dir)
    payload = {"summary": _summarize(rows), "rows": [asdict(row) for row in rows]}
    _write_json(payload, args.json_output)
    _write_csv(rows, args.csv_output)
    print(f"Wrote {args.json_output}")
    print(f"Wrote {args.csv_output}")
    return 0


def cmd_patch_xml(args: argparse.Namespace) -> int:
    data_dir = _resolve_data_dir(args.username, args.malexport_data_dir)
    rows = build_rows(args.xml, data_dir)
    patch_summary = patch_xml(args.xml, rows, args.output)
    print(f"Wrote {args.output}")
    print(json.dumps(patch_summary, indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="malexportus",
        description="Turn MAL exports and malexport history into a usable completion report.",
    )
    parser.add_argument(
        "--username",
        default="kneestronk",
        help="MyAnimeList username used to locate the default malexport data directory.",
    )
    parser.add_argument(
        "--xml",
        type=Path,
        default=Path("/Users/guzelgun/Downloads/animelist_1776457652_-_3797141.xml"),
        help="Path to the anime XML export.",
    )
    parser.add_argument(
        "--malexport-data-dir",
        type=Path,
        help="Optional path to the malexport account data directory.",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    summary = subparsers.add_parser("summary", help="Print a quick JSON summary.")
    summary.set_defaults(func=cmd_summary)

    report = subparsers.add_parser(
        "report", help="Write JSON and CSV reports for all anime entries."
    )
    report.add_argument(
        "--json-output",
        type=Path,
        default=PROJECT_ROOT / "reports" / "watch_history.json",
    )
    report.add_argument(
        "--csv-output",
        type=Path,
        default=PROJECT_ROOT / "reports" / "watch_history.csv",
    )
    report.set_defaults(func=cmd_report)

    patch = subparsers.add_parser(
        "patch-xml",
        help="Write a MAL-style XML file with missing completed finish dates filled from history.",
    )
    patch.add_argument(
        "--output",
        type=Path,
        default=PROJECT_ROOT / "reports" / "animelist_patched_for_anilist.xml",
    )
    patch.set_defaults(func=cmd_patch_xml)

    prepare = subparsers.add_parser(
        "prepare-anilist-updates",
        help="Generate AniList SaveMediaListEntry mutations for completed entries missing completedAt.",
    )
    prepare.add_argument(
        "--anilist-response",
        type=Path,
        default=PROJECT_ROOT / "reports" / "anilist_completed_response.json",
        help="Path to a saved AniList MediaListCollection JSON response.",
    )
    prepare.add_argument(
        "--output-dir",
        type=Path,
        default=PROJECT_ROOT / "reports" / "anilist_updates",
    )
    prepare.add_argument(
        "--batch-size",
        type=int,
        default=25,
        help="How many SaveMediaListEntry aliases to put in each GraphQL mutation file.",
    )
    prepare.set_defaults(func=cmd_prepare_anilist_updates)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
