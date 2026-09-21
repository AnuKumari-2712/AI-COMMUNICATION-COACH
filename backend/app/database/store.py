"""
Lightweight JSON-file persistence.

This stands in for a real database (Postgres/Mongo) so the project runs with
zero external services. Every read/write goes through this module, so
swapping in a real database later means rewriting this file only — nothing
in services/ or api/ needs to change.
"""
import json
import threading
from pathlib import Path
from typing import Any

from app.core.config import get_settings

_lock = threading.Lock()


def _data_dir() -> Path:
    path = Path(get_settings().data_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _file(collection: str) -> Path:
    return _data_dir() / f"{collection}.json"


def read_collection(collection: str) -> dict[str, Any]:
    file = _file(collection)
    if not file.exists():
        return {}
    with _lock:
        with file.open("r", encoding="utf-8") as f:
            return json.load(f)


def write_collection(collection: str, data: dict[str, Any]) -> None:
    file = _file(collection)
    with _lock:
        with file.open("w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)


def get_document(collection: str, doc_id: str) -> dict[str, Any] | None:
    return read_collection(collection).get(doc_id)


def upsert_document(collection: str, doc_id: str, document: dict[str, Any]) -> dict[str, Any]:
    data = read_collection(collection)
    data[doc_id] = document
    write_collection(collection, data)
    return document


def delete_document(collection: str, doc_id: str) -> None:
    data = read_collection(collection)
    if doc_id in data:
        del data[doc_id]
        write_collection(collection, data)
