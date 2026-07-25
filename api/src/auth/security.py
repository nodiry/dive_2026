"""
Password hashing (stdlib PBKDF2, no new dependency) and opaque session
tokens. Deliberately not JWT — a DB-backed token is simpler to reason about
and trivially revocable (logout = delete the row), which matters more than
statelessness for a single local-DB service.
"""

import base64
import hashlib
import hmac
import os
import secrets

_PBKDF2_ITERATIONS = 200_000
_SALT_BYTES = 16


def hash_password(password: str) -> str:
    salt = os.urandom(_SALT_BYTES)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ITERATIONS)
    return base64.b64encode(salt + derived).decode()


def verify_password(password: str, stored: str) -> bool:
    raw = base64.b64decode(stored)
    salt, derived = raw[:_SALT_BYTES], raw[_SALT_BYTES:]
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ITERATIONS)
    return hmac.compare_digest(derived, candidate)


def generate_token() -> str:
    return secrets.token_urlsafe(32)
