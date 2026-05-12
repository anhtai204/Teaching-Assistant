"""
Simple API-key based authentication middleware for FastAPI.

How it works:
- Protected routes call `Depends(require_auth)`.
- The client must send: `Authorization: Bearer <API_KEY>` header.
- API_KEY is read from env var `INTERNAL_API_KEY`.

This is a lightweight internal auth layer that prevents unauthenticated
access to sensitive endpoints while the full Auth.js session auth is
managed on the frontend (Next.js).
"""

import os
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

_bearer = HTTPBearer(auto_error=False)

# Read the shared secret from env. Falls back to a clearly insecure default
# so startup doesn't crash, but log a loud warning.
_INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")


def require_auth(
    credentials: HTTPAuthorizationCredentials = Security(_bearer),
) -> str:
    """
    Dependency that validates the Bearer token.
    Returns the token string on success.
    Raises HTTP 401 if missing/wrong.
    """
    if not _INTERNAL_API_KEY:
        # If the env var was never set, refuse all requests to avoid
        # silently running in an open state.
        raise HTTPException(
            status_code=503,
            detail="Server misconfiguration: INTERNAL_API_KEY not set.",
        )

    if not credentials or credentials.credentials != _INTERNAL_API_KEY:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: invalid or missing API key.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return credentials.credentials
