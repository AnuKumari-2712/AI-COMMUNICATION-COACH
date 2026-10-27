"""
Persistent Database Storage (SQLite for local development, PostgreSQL for deployment).

Stores documents in a relational schema (collection, doc_id, data, timestamps).
- Local default: SQLite database file at {data_dir}/coach.db (zero setup required).
- Production deployment: PostgreSQL via DATABASE_URL env var (Render Postgres, Neon, Supabase).
- Automatic migration: Any legacy JSON files in DATA_DIR are automatically imported on startup.
- PBKDF2 hashed passwords are preserved and never logged.
- Keeps exact same store interface for full backward compatibility:
    read_collection(collection: str) -> dict[str, Any]
    write_collection(collection: str, data: dict[str, Any]) -> None
    get_document(collection: str, doc_id: str) -> dict[str, Any] | None
    upsert_document(collection: str, doc_id: str, document: dict[str, Any]) -> dict[str, Any]
    delete_document(collection: str, doc_id: str) -> None
"""
import json
import logging
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Generator

from app.core.config import get_settings

logger = logging.getLogger(__name__)
_lock = threading.Lock()
_initialized_targets: set[str] = set()


def _get_database_url() -> str | None:
    settings = get_settings()
    return settings.database_url


def _is_postgres() -> bool:
    url = _get_database_url()
    return bool(url and (url.startswith("postgres://") or url.startswith("postgresql://")))


def _placeholder() -> str:
    return "%s" if _is_postgres() else "?"


def _get_sqlite_path() -> Path:
    settings = get_settings()
    url = settings.database_url
    if url and url.startswith("sqlite:///"):
        path_str = url.replace("sqlite:///", "")
        p = Path(path_str)
        p.parent.mkdir(parents=True, exist_ok=True)
        return p
    data_dir = Path(settings.data_dir)
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "coach.db"


@contextmanager
def get_connection() -> Generator[Any, None, None]:
    """Provides a database connection with auto-commit/rollback."""
    if _is_postgres():
        url = _get_database_url() or ""
        # Render/Heroku standard: postgres:// -> postgresql://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        try:
            import psycopg2  # type: ignore[import-untyped]
            conn = psycopg2.connect(url)
        except ImportError:
            try:
                import psycopg  # type: ignore[import-untyped]
                conn = psycopg.connect(url)
            except ImportError as exc:
                raise RuntimeError(
                    "PostgreSQL DATABASE_URL provided but neither psycopg2 nor psycopg is installed. "
                    "Install with: pip install psycopg2-binary"
                ) from exc
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    else:
        # SQLite
        url = _get_database_url()
        if url in (":memory:", "sqlite:///:memory:"):
            # For in-memory testing if explicitly requested
            conn = sqlite3.connect(":memory:", check_same_thread=False)
        else:
            db_path = _get_sqlite_path()
            conn = sqlite3.connect(str(db_path), check_same_thread=False, timeout=30.0)
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


def init_db() -> None:
    """Creates the storage table and runs migrations for legacy JSON files."""
    target = _get_database_url() or str(_get_sqlite_path())
    with _lock:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS store_documents (
                    collection TEXT NOT NULL,
                    doc_id TEXT NOT NULL,
                    data TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (collection, doc_id)
                )
                """
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_store_collection ON store_documents(collection)"
            )
            _migrate_legacy_json(conn)
        _initialized_targets.add(target)


def _ensure_initialized() -> None:
    target = _get_database_url() or str(_get_sqlite_path())
    if target not in _initialized_targets:
        init_db()


def _migrate_legacy_json(conn: Any) -> None:
    settings = get_settings()
    data_dir = Path(settings.data_dir)
    if not data_dir.exists():
        return
    ph = _placeholder()
    for json_file in data_dir.glob("*.json"):
        collection = json_file.stem
        try:
            with open(json_file, "r", encoding="utf-8") as f:
                content = json.load(f)
            if isinstance(content, dict):
                cursor = conn.cursor()
                migrated_count = 0
                for doc_id, doc in content.items():
                    cursor.execute(
                        f"SELECT 1 FROM store_documents WHERE collection = {ph} AND doc_id = {ph}",
                        (collection, str(doc_id)),
                    )
                    if not cursor.fetchone():
                        doc_json = json.dumps(doc, default=str)
                        cursor.execute(
                            f"""
                            INSERT INTO store_documents (collection, doc_id, data, updated_at)
                            VALUES ({ph}, {ph}, {ph}, CURRENT_TIMESTAMP)
                            ON CONFLICT (collection, doc_id) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
                            """,
                            (collection, str(doc_id), doc_json),
                        )
                        migrated_count += 1
                if migrated_count > 0:
                    logger.info("Migrated %d records from %s into database.", migrated_count, json_file.name)
        except Exception as e:
            logger.warning("Could not migrate legacy JSON file %s: %s", json_file.name, e)


def read_collection(collection: str) -> dict[str, Any]:
    _ensure_initialized()
    ph = _placeholder()
    with _lock:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"SELECT doc_id, data FROM store_documents WHERE collection = {ph}",
                (collection,),
            )
            rows = cursor.fetchall()
            result: dict[str, Any] = {}
            for doc_id, data_str in rows:
                try:
                    result[doc_id] = json.loads(data_str)
                except Exception:
                    result[doc_id] = data_str
            return result


def write_collection(collection: str, data: dict[str, Any]) -> None:
    _ensure_initialized()
    ph = _placeholder()
    with _lock:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"DELETE FROM store_documents WHERE collection = {ph}",
                (collection,),
            )
            for doc_id, doc in data.items():
                doc_json = json.dumps(doc, default=str)
                cursor.execute(
                    f"""
                    INSERT INTO store_documents (collection, doc_id, data, updated_at)
                    VALUES ({ph}, {ph}, {ph}, CURRENT_TIMESTAMP)
                    ON CONFLICT (collection, doc_id) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
                    """,
                    (collection, str(doc_id), doc_json),
                )


def get_document(collection: str, doc_id: str) -> dict[str, Any] | None:
    _ensure_initialized()
    ph = _placeholder()
    with _lock:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"SELECT data FROM store_documents WHERE collection = {ph} AND doc_id = {ph}",
                (collection, str(doc_id)),
            )
            row = cursor.fetchone()
            if row is None:
                return None
            try:
                return json.loads(row[0])
            except Exception:
                return row[0]


def upsert_document(collection: str, doc_id: str, document: dict[str, Any]) -> dict[str, Any]:
    _ensure_initialized()
    ph = _placeholder()
    doc_json = json.dumps(document, default=str)
    with _lock:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"""
                INSERT INTO store_documents (collection, doc_id, data, updated_at)
                VALUES ({ph}, {ph}, {ph}, CURRENT_TIMESTAMP)
                ON CONFLICT (collection, doc_id) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
                """,
                (collection, str(doc_id), doc_json),
            )
    return document


def delete_document(collection: str, doc_id: str) -> None:
    _ensure_initialized()
    ph = _placeholder()
    with _lock:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                f"DELETE FROM store_documents WHERE collection = {ph} AND doc_id = {ph}",
                (collection, str(doc_id)),
            )
