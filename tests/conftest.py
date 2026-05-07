"""Configure env before importing the FastAPI app so SQLite and job backend are test-safe."""

from __future__ import annotations

import os
import tempfile

import pytest

_fd, _TEST_SQLITE_PATH = tempfile.mkstemp(suffix=".sqlite")
os.close(_fd)

os.environ["BRIDGE_SQLITE_URL"] = f"sqlite:///{os.path.abspath(_TEST_SQLITE_PATH)}"
os.environ["USE_JSON_JOBS"] = "true"
os.environ.pop("MONGO_URI", None)

from starlette.testclient import TestClient

from main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
