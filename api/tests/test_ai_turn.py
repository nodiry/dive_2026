from types import SimpleNamespace

import pytest
from pydantic import ValidationError
from src.ai import service as ai_service
from src.ai import tools as ai_tools
from src.ai.schemas import AlertCriteria, ChatMessage


class TestWantsGame:
    """The deck is created before the reply, so a false positive costs a
    wasted generation call and answers a question nobody asked."""

    @pytest.mark.parametrize(
        "message",
        [
            "수영구 원룸 추천해줘",
            "이 서비스 게임처럼 재밌네요",
            "테스트로 하나만 물어볼게요",
            "테스트 결과 알려줘",
            # 감천문화마을 romanized: a landmark, not a request to play.
            "Gamecheon culture village 근처 임대주택",
            "보증금 테스트해보고 싶은데 3000만원 이하로",
        ],
    )
    def test_ordinary_messages_do_not_start_a_game(self, message: str) -> None:
        assert ai_service.wants_game(message) is False

    @pytest.mark.parametrize(
        "message",
        [
            # Both the web and mobile game buttons send this literal command.
            "/game",
            "/game 부산 카페",
            "게임",
            "게임 하고 싶어",
            "게임 시작",
            "테스트 해줘",
            "quiz me on nothing",
            "play a game",
        ],
    )
    def test_real_requests_still_start_a_game(self, message: str) -> None:
        assert ai_service.wants_game(message) is True


class TestImagePart:
    @pytest.mark.parametrize("mime", ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"])
    def test_formats_gemini_reads_are_kept(self, mime: str) -> None:
        assert ai_service._image_part(f"data:{mime};base64,aGVsbG8=") is not None

    @pytest.mark.parametrize("mime", ["image/svg+xml", "image/avif", "application/pdf", "text/plain"])
    def test_formats_gemini_rejects_are_dropped(self, mime: str) -> None:
        """The browser's image/* picker offers SVG and AVIF; sending either
        fails the whole request at the model rather than just the attachment."""
        assert ai_service._image_part(f"data:{mime};base64,aGVsbG8=") is None


def _fake_gemini(replies: list[object]) -> object:
    """A stand-in for genai.Client that returns the queued responses in order.

    The service only ever touches .candidates, .text, candidate.content,
    content.parts and part.function_call, so plain namespaces are enough.
    """
    queue = list(replies)

    async def generate_content(**_kwargs: object) -> object:
        return queue.pop(0)

    return SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=generate_content)))


def _tool_call_response(name: str, args: dict[str, object]) -> object:
    part = SimpleNamespace(function_call=SimpleNamespace(name=name, args=args), text=None)
    return SimpleNamespace(candidates=[SimpleNamespace(content=SimpleNamespace(parts=[part]))], text=None)


def _text_response(text: str) -> object:
    part = SimpleNamespace(function_call=None, text=text)
    return SimpleNamespace(candidates=[SimpleNamespace(content=SimpleNamespace(parts=[part]))], text=text)


async def test_invalid_tool_arguments_are_returned_to_the_model(monkeypatch: pytest.MonkeyPatch) -> None:
    """A model that breaks its own tool schema (a Korean label where the enum
    wants an id) used to raise ValidationError out of the router as a 500 and
    lose the turn. It should now come back as a tool result the loop can fix."""
    monkeypatch.setattr(ai_service, "_client", lambda: _fake_gemini([
        _tool_call_response("search_housing", {"district": "수영구", "type": "행복주택"}),
        _text_response("조건을 다시 확인했어요."),
    ]))

    async def raising_dispatch(*_args: object, **_kwargs: object) -> tuple[str, list[object], None]:
        AlertCriteria(type="행복주택")  # ty:ignore[invalid-argument-type]
        raise AssertionError("AlertCriteria should have rejected the Korean label")

    async def no_tools(_session: object) -> list[object]:
        return []

    monkeypatch.setattr(ai_tools, "dispatch_tool", raising_dispatch)
    monkeypatch.setattr(ai_tools, "build_tools", no_tools)

    reply, housing, no_match = await ai_service.generate_reply(
        session=None,  # ty:ignore[invalid-argument-type]
        history=[ChatMessage(role="user", text="이전 질문")],
        user_message="행복주택 보여줘",
    )

    assert reply == "조건을 다시 확인했어요."
    assert housing == []
    assert no_match is None


async def test_the_korean_label_really_is_invalid() -> None:
    """Pins the assumption the test above rests on."""
    with pytest.raises(ValidationError):
        AlertCriteria(type="행복주택")  # ty:ignore[invalid-argument-type]
