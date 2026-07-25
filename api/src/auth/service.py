from sqlmodel import or_, select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.auth.models import User, UserSession
from src.auth.schemas import LoginRequest, SignupRequest
from src.auth.security import generate_token, hash_password, verify_password


class AuthError(Exception):
    pass


async def _create_session(session: AsyncSession, user_id: int) -> str:
    token = generate_token()
    session.add(UserSession(token=token, user_id=user_id))
    await session.commit()
    return token


async def signup(session: AsyncSession, body: SignupRequest) -> tuple[User, str]:
    result = await session.exec(select(User).where(or_(User.username == body.username, User.email == body.email)))
    if result.first() is not None:
        raise AuthError("username or email already taken")

    user = User(username=body.username, email=body.email, password_hash=hash_password(body.password))
    session.add(user)
    await session.commit()
    await session.refresh(user)
    assert user.id is not None

    token = await _create_session(session, user.id)
    return user, token


async def login(session: AsyncSession, body: LoginRequest) -> tuple[User, str]:
    identifier = body.identifier.strip().lower()
    result = await session.exec(select(User).where(or_(User.username == body.identifier.strip(), User.email == identifier)))
    user = result.first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise AuthError("invalid username/email or password")
    assert user.id is not None

    token = await _create_session(session, user.id)
    return user, token


async def logout(session: AsyncSession, token: str) -> None:
    user_session = await session.get(UserSession, token)
    if user_session is not None:
        await session.delete(user_session)
        await session.commit()


async def get_user_by_token(session: AsyncSession, token: str) -> User | None:
    user_session = await session.get(UserSession, token)
    if user_session is None:
        return None
    return await session.get(User, user_session.user_id)
