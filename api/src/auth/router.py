from typing import Annotated

from fastapi import APIRouter, Header, HTTPException

from src.auth import service as auth_service
from src.auth.dependencies import CurrentUser
from src.auth.schemas import AuthResponse, LoginRequest, SignupRequest, UserPublic
from src.database import SessionDep

router = APIRouter()


@router.post("/signup", response_model=AuthResponse)
async def post_signup(body: SignupRequest, session: SessionDep) -> AuthResponse:
    try:
        user, token = await auth_service.signup(session, body)
    except auth_service.AuthError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return AuthResponse(token=token, user=UserPublic.model_validate(user))


@router.post("/login", response_model=AuthResponse)
async def post_login(body: LoginRequest, session: SessionDep) -> AuthResponse:
    try:
        user, token = await auth_service.login(session, body)
    except auth_service.AuthError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e
    return AuthResponse(token=token, user=UserPublic.model_validate(user))


@router.post("/logout", status_code=204)
async def post_logout(session: SessionDep, authorization: Annotated[str | None, Header()] = None) -> None:
    if authorization and authorization.startswith("Bearer "):
        await auth_service.logout(session, authorization.removeprefix("Bearer ").strip())


@router.get("/me", response_model=UserPublic)
async def get_me(current_user: CurrentUser) -> UserPublic:
    return UserPublic.model_validate(current_user)
