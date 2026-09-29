import main


# Register a new account and sign in, leaving its HttpOnly cookie in the client.
def register_and_login(client, username="test-user", email="test@example.com", expected_samesite="strict"):
    # Create the account using the public registration endpoint.
    registration = client.post(
        "/auth/register",
        json={"username": username, "email": email, "password": "correct-horse-123"},
    )
    # Assert registration responds with the documented created status.
    assert registration.status_code == 201, registration.text
    # Sign in using the OAuth2-compatible form endpoint.
    login = client.post(
        "/auth/login",
        data={"username": email, "password": "correct-horse-123"},
    )
    # The JWT must not be returned to JavaScript; the browser receives an HttpOnly cookie.
    assert login.status_code == 200, login.text
    assert login.json() == {"authenticated": True}
    assert "httponly" in login.headers["set-cookie"].lower()
    assert f"samesite={expected_samesite}" in login.headers["set-cookie"].lower()
    return registration.json()


# Verify login cookies, authentication success, and invalid credential handling.
def test_login_sets_httponly_cookie_and_rejects_wrong_password(client):
    # Register an account before exercising the login endpoint.
    register_and_login(client)
    # Cookie authentication should restore the logged-in user.
    profile = client.get("/auth/me")
    assert profile.status_code == 200
    assert profile.json()["email"] == "test@example.com"
    # Wrong credentials use the same generic response.
    failed = client.post(
        "/auth/login",
        data={"username": "test@example.com", "password": "wrong-password"},
    )
    assert failed.status_code == 401
    assert failed.json()["detail"] == "電子郵件或密碼錯誤"


def test_github_pages_cookie_settings_support_cross_site_login(client, monkeypatch):
    monkeypatch.setattr(main, "SESSION_COOKIE_SAMESITE", "none")
    monkeypatch.setattr(main, "SESSION_COOKIE_SECURE", True)
    register_and_login(client, expected_samesite="none")
    login = client.post(
        "/auth/login",
        data={"username": "test@example.com", "password": "correct-horse-123"},
    )
    cookie = login.headers["set-cookie"].lower()
    assert login.status_code == 200
    assert "samesite=none" in cookie
    assert "secure" in cookie


# Protected routes must reject missing and tampered session cookies.
def test_missing_or_invalid_jwt_is_unauthorized(client):
    # No cookie or Authorization header is unauthenticated.
    assert client.get("/auth/me").status_code == 401
    # A forged cookie must fail signature validation.
    client.cookies.set("character_session", "not-a-valid-jwt")
    assert client.get("/auth/me").status_code == 401


# Verify a user can manage their own character but not another user's character.
def test_character_permissions_are_owner_scoped(client):
    # The first account owns the character.
    register_and_login(client, username="owner", email="owner@example.com")
    created = client.post("/characters", data={"character_name": "Owned Character"})
    assert created.status_code == 201, created.text
    character_id = created.json()["id"]

    # Replace the current session with a different valid account.
    assert client.post("/auth/logout").status_code == 200
    register_and_login(client, username="other", email="other@example.com")
    # The second account cannot update or delete the owner's character.
    update = client.patch(f"/characters/{character_id}", data={"character_name": "Hijacked"})
    delete = client.delete(f"/characters/{character_id}")
    assert update.status_code == 403
    assert delete.status_code == 403
    assert client.get(f"/characters/{character_id}").json()["character_name"] == "Owned Character"


# Cookie-authenticated writes reject requests from an untrusted browser origin.
def test_cookie_write_rejects_untrusted_origin(client):
    # Sign in so the client has an HttpOnly session cookie.
    register_and_login(client)
    # An attacker origin cannot create reusable global tags through the cookie.
    response = client.post(
        "/tags",
        json={"name": "forged-tag", "kind": "work"},
        headers={"Origin": "https://attacker.invalid"},
    )
    assert response.status_code == 403


def test_private_network_preflight_is_limited_to_configured_origin(client):
    response = client.options(
        "/characters/page",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Private-Network": "true",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-private-network"] == "true"

    untrusted = client.options(
        "/characters/page",
        headers={
            "Origin": "https://attacker.invalid",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Private-Network": "true",
        },
    )
    assert untrusted.status_code == 400
    assert "access-control-allow-origin" not in untrusted.headers


# A reference URL must not allow javascript: or other active URL schemes.
def test_reference_url_only_allows_http_and_https(client):
    # Authenticate as the character creator.
    register_and_login(client)
    # Dangerous active content is rejected by server-side validation.
    response = client.post(
        "/characters",
        data={"character_name": "Unsafe Link", "reference_url": "javascript:alert(1)"},
    )
    assert response.status_code == 422


# AI usage requires ownership and an explicitly configured provider key.
def test_ai_analysis_requires_owner_and_configured_key(client):
    # Create a character with the current user as owner.
    register_and_login(client)
    created = client.post("/characters", data={"character_name": "Analysis Target"})
    character_id = created.json()["id"]
    # With no OpenAI key the endpoint fails safely instead of attempting a network request.
    unavailable = client.post(f"/characters/{character_id}/analyze-relationships")
    assert unavailable.status_code == 503
    assert "ollama" in unavailable.json()["detail"]


# Check the operational health endpoint and public statistics status codes.
def test_health_and_public_stats(client):
    # Health includes a database ping and should report ready.
    assert client.get("/health").json() == {"status": "ok"}
    # Public aggregate statistics are available without signing in.
    statistics = client.get("/stats/site")
    assert statistics.status_code == 200
    assert statistics.json()["characters"] == 0


# Invalid ability values are rejected instead of entering the database.
def test_character_ability_values_are_range_checked(client):
    # Sign in to create a role with stats.
    register_and_login(client)
    response = client.post(
        "/characters",
        data={"character_name": "Invalid Stats", "power": "11"},
    )
    assert response.status_code == 422


def test_character_theme_song_fields_round_trip_and_validate_url(client):
    register_and_login(client)
    created = client.post(
        "/characters",
        data={
            "character_name": "Theme Song Character",
            "theme_song": "Maiden's Capriccio",
            "theme_song_url": "https://example.com/theme-song",
        },
    )
    assert created.status_code == 201, created.text
    character_id = created.json()["id"]
    assert created.json()["theme_song"] == "Maiden's Capriccio"
    assert created.json()["theme_song_url"] == "https://example.com/theme-song"

    updated = client.patch(
        f"/characters/{character_id}",
        data={"theme_song": "Love-Coloured Master Spark"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["theme_song"] == "Love-Coloured Master Spark"
    assert updated.json()["theme_song_url"] == "https://example.com/theme-song"

    unsafe_url = client.patch(
        f"/characters/{character_id}",
        data={"theme_song_url": "javascript:alert(1)"},
    )
    assert unsafe_url.status_code == 422
    unchanged = client.get(f"/characters/{character_id}")
    assert unchanged.json()["theme_song_url"] == "https://example.com/theme-song"
