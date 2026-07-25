from pydantic import Field, field_validator

from src.models import ApiModel


class SignupRequest(ApiModel):
    username: str = Field(min_length=3, max_length=32)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=200)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("username must be letters, numbers, - or _")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        local, _, domain = v.partition("@")
        if not local or "." not in domain or domain.startswith(".") or domain.endswith("."):
            raise ValueError("invalid email")
        return v


class LoginRequest(ApiModel):
    identifier: str = Field(min_length=1, max_length=254)  # username or email
    password: str = Field(min_length=1, max_length=200)


class UserPublic(ApiModel):
    id: int
    username: str
    email: str


class AuthResponse(ApiModel):
    token: str
    user: UserPublic
