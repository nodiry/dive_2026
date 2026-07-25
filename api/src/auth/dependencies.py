from typing import Annotated

from fastapi import Depends, Header, HTTPException

from src.auth import service as auth_service
from src.auth.models import User
from src.database import SessionDep


async def get_current_user(session: SessionDep, authorization: Annotated[str | None, Header()] = None) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="not authenticated")
    token = authorization.removeprefix("Bearer ").strip()
    user = await auth_service.get_user_by_token(session, token)
    if user is None:
        raise HTTPException(status_code=401, detail="invalid or expired session")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
