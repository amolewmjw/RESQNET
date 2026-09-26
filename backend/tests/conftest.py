import pytest
from fastapi.testclient import TestClient
from app.main import create_app

@pytest.fixture
def app(tmp_path):
    return create_app(f"sqlite:///{tmp_path / 'test.db'}")

@pytest.fixture
def client(app):
    with TestClient(app) as client:
        yield client
