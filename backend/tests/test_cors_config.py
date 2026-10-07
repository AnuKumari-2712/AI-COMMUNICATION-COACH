"""
The deployed site could not talk to the deployed backend because the browser
refuses cross-origin calls unless the backend lists the site's origin. These
tests read the CORS values from the repo's real render.yaml and check which
origins the backend would accept: this project's Vercel URLs yes, anyone
else's no.
Run with:  cd backend && pytest tests/test_cors_config.py -v
"""
import asyncio
import json
from pathlib import Path

import pytest
import yaml
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings
from app.main import app as real_app

RENDER_YAML = Path(__file__).resolve().parents[2] / "render.yaml"


def _render_env() -> dict:
    service = yaml.safe_load(RENDER_YAML.read_text(encoding="utf-8"))["services"][0]
    return {item["key"]: item.get("value") for item in service["envVars"]}


def _settings_from_render_yaml() -> Settings:
    env = _render_env()
    return Settings(
        cors_origins=json.loads(env["CORS_ORIGINS"]),
        cors_origin_regex=env["CORS_ORIGIN_REGEX"],
    )


def _preflight(origin: str) -> dict:
    settings = _settings_from_render_yaml()
    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    async def call():
        scope = {
            "type": "http",
            "method": "OPTIONS",
            "path": "/x",
            "raw_path": b"/x",
            "query_string": b"",
            "headers": [
                (b"origin", origin.encode()),
                (b"access-control-request-method", b"POST"),
                (b"access-control-request-headers", b"content-type"),
            ],
            "server": ("test", 443),
            "client": ("test", 1),
            "scheme": "https",
            "http_version": "1.1",
        }
        sent = []

        async def receive():
            return {"type": "http.request", "body": b"", "more_body": False}

        async def send(message):
            sent.append(message)

        await app(scope, receive, send)
        start = next(m for m in sent if m["type"] == "http.response.start")
        return {k.decode().lower(): v.decode() for k, v in start["headers"]}

    return asyncio.run(call())


@pytest.mark.parametrize(
    "origin",
    [
        "http://localhost:5173",
        "https://ai-communication-coach-nova-0a34.vercel.app",  # stable project URL
        "https://ai-communication-coach-rinysegpj-nova-0a34.vercel.app",  # one specific deployment
        "https://ai-communication-coach-git-main-nova-0a34.vercel.app",  # branch URL
    ],
)
def test_this_projects_origins_are_allowed(origin):
    assert _preflight(origin).get("access-control-allow-origin") == origin


@pytest.mark.parametrize(
    "origin",
    [
        "https://ai-communication-coach.vercel.app",  # a different owner's project
        "https://evil.example.com",
        "https://ai-communication-coach-nova-0a34.vercel.app.evil.com",  # suffix trick
        "https://other-project-nova-0a34.vercel.app",  # same team, different project
        "http://ai-communication-coach-nova-0a34.vercel.app",  # plain http
    ],
)
def test_other_origins_are_refused(origin):
    assert "access-control-allow-origin" not in _preflight(origin)


def test_main_app_passes_the_regex_setting_to_the_middleware():
    cors = next(m for m in real_app.user_middleware if m.cls is CORSMiddleware)
    assert "allow_origin_regex" in cors.kwargs


def test_regex_setting_is_optional_and_off_by_default():
    assert Settings().cors_origin_regex is None
