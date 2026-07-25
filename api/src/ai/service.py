import base64
import binascii
import re
from uuid import UUID

from google import genai
from google.genai import types
from pydantic import ValidationError
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.ai import tools as ai_tools
from src.ai.models import AIConversation, AIMessage, AIMessageRole
from src.ai.schemas import ChatMessage, NoMatchContext
from src.config import app_config
from src.game import service as game_service
from src.housing.models import HousingProject
from src.housing.schemas import HousingSummary
from src.housing.service import to_summaries

TITLE_MAX_LENGTH = 60

# Flash-Lite, not the full Flash tier: this task (tool-calling over a fixed
# schema, then summarizing rows) doesn't need Flash's extra reasoning depth,
# and Flash-Lite's free-tier quota runs several times higher (RPM and RPD).
# A rolling alias, not a pinned version, for the same reason as below.
#
# "gemini-2.5-flash" (and "-flash-lite") 404 as "no longer available to new
# users" on this project's key even though both are still listed in
# models.list() — a hard per-project gate on this key, not fixable here.
# The *-latest aliases are what Google recommends instead, and they do work
# on this key.
MODEL = "gemini-flash-lite-latest"
MAX_TOOL_ROUNDS = 5
# Gemini's inline-data ceiling is ~7MB per request; stay under it.
MAX_IMAGE_BYTES = 6_000_000

# What Gemini actually accepts as inline image data. The browser's image/*
# file picker is wider than this: SVG and AVIF sail through a naive image/*
# check and then fail the entire request at the model, so they get dropped
# here with every other unusable attachment.
SUPPORTED_IMAGE_MIME = frozenset(
    {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic", "image/heif"}
)

SYSTEM_PROMPT = """
You are 하루 (Haru)'s AI search assistant — a public rental
housing recommendation service for Busan Metropolitan City (BMC), built for
the DIVE 2026 hackathon with 선도소프트 (Sundosoft). When asked who owns,
made, or built you, say you're part of the 하루 service, not a general
assistant.

Help users find public rental housing in Busan (매입임대/재개발임대/통합공공임대/
행복주택). Users may describe hard conditions (deposit, room count,
construction year, district, program type) or lifestyle preferences (nearby
cafes, gyms, restaurants, convenience stores, etc) — pick the matching tool,
or both if the request mixes the two. Never invent housing data or numbers;
only state what a tool result actually returned. If a tool returns no
results, say so plainly and suggest loosening a condition.

When the user attaches an image, read it and use it: a 모집공고 screenshot, a
pay slip, a lease, a resume. Pull out what matters for housing (budget,
household size, workplace, district, deadlines), say plainly what you read,
then call a tool with those values. Never guess at text you cannot read.

If the user asks for a game, a quiz, a test, or says 게임/테스트, do not try to
run it yourself in chat: a 하루 deck has already been created for them and is
rendering in the UI. Just introduce it in one or two sentences and tell them
to pick their cards.

Reply in the same language the user wrote in (Korean or English).

Format ALL replies as GitHub-flavored Markdown:
- Use **bold** for housing project names and key numbers
- Use a bullet list when presenting multiple results
- Use a table when comparing options (deposit, rent, district)
- Keep it concise — the matching housing already renders as cards in the UI,
  so guide the user and call out standouts rather than restating every field
"""


class AiSearchError(Exception):
    pass


def _client() -> genai.Client:
    if not app_config.GEMINI_API_KEY:
        raise AiSearchError("AI search isn't configured (GEMINI_API_KEY missing).")
    return genai.Client(api_key=app_config.GEMINI_API_KEY)


def _to_contents(history: list[ChatMessage]) -> list[types.Content]:
    return [types.Content(role="model" if m.role == "assistant" else "user", parts=[types.Part(text=m.text)]) for m in history]


def _image_part(data_url: str) -> types.Part | None:
    """
    Turn a browser data URL into an inline image part. Anything we can't parse
    is dropped rather than raised: a bad attachment shouldn't fail the whole
    turn when the user also typed a question.
    """
    match = re.match(r"data:(image/[a-zA-Z0-9.+-]+);base64,(.+)$", data_url.strip(), re.S)
    if not match:
        return None
    mime, payload = match.group(1), match.group(2)
    if mime.lower() not in SUPPORTED_IMAGE_MIME:
        return None
    try:
        raw = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError):
        return None
    if not raw or len(raw) > MAX_IMAGE_BYTES:
        return None
    return types.Part.from_bytes(data=raw, mime_type=mime)


async def generate_reply(
    session: AsyncSession, history: list[ChatMessage], user_message: str, image: str | None = None
) -> tuple[str, list[HousingSummary], NoMatchContext | None]:
    client = _client()
    tools = await ai_tools.build_tools(session)
    config = types.GenerateContentConfig(tools=tools, system_instruction=SYSTEM_PROMPT)

    parts: list[types.Part] = [types.Part(text=user_message)]
    if image:
        attachment = _image_part(image)
        if attachment is not None:
            parts.append(attachment)
    contents = _to_contents(history) + [types.Content(role="user", parts=parts)]
    # Keyed by id, not appended, so a housing project surfaced by more than
    # one tool call in the same turn only renders once in the UI.
    all_housing: dict[int, HousingSummary] = {}
    last_no_match: NoMatchContext | None = None

    def result(text: str) -> tuple[str, list[HousingSummary], NoMatchContext | None]:
        housing = list(all_housing.values())
        return text, housing, None if housing else last_no_match

    for _ in range(MAX_TOOL_ROUNDS):
        try:
            response = await client.aio.models.generate_content(model=MODEL, contents=contents, config=config)
        except Exception as e:
            raise AiSearchError("The AI search request failed. Please try again.") from e

        if not response.candidates:
            return result(response.text or "")

        candidate = response.candidates[0]
        content = candidate.content
        if content is None or not content.parts:
            return result(response.text or "")

        function_calls = [p.function_call for p in content.parts if p.function_call]
        contents.append(content)

        if not function_calls:
            return result(response.text or "")

        for fc in function_calls:
            if not fc.name:
                continue
            try:
                result_text, housing, no_match = await ai_tools.dispatch_tool(session, fc.name, dict(fc.args or {}))
            except ValidationError as e:
                # The model broke its own tool schema — a Korean label where the
                # enum wants an id, a string where a number belongs. This is a
                # retryable mistake, so hand the rejection back as the tool
                # result and let the remaining rounds correct it rather than
                # failing the whole turn with a 500.
                rejected = ", ".join(str(err["loc"][0]) for err in e.errors() if err["loc"]) or "arguments"
                result_text = (
                    f"Rejected: {fc.name} was called with invalid {rejected}. "
                    "Use the exact types and enum values from the tool schema and call it again."
                )
                housing, no_match = [], None
            if no_match is not None:
                last_no_match = no_match
            for h in housing:
                all_housing[h.id] = h
            contents.append(
                types.Content(
                    role="user",
                    parts=[types.Part.from_function_response(name=fc.name, response={"result": result_text})],
                )
            )

    return result("I couldn't finish that request — try narrowing your question.")


class ConversationNotFound(Exception):
    pass


# "/game" is the explicit command; the patterns below catch natural phrasing
# in both languages ("게임 하고 싶어", "give me a quiz"). Checked server-side
# rather than left to the model so the deck is guaranteed to exist before the
# reply mentions it.
GAME_COMMAND = "/game"

# Latin keywords need word boundaries: "Gamecheon culture village" is 감천문화마을,
# a real Busan landmark, not a request to play.
GAME_WORD_RE = re.compile(r"\b(game|quiz)\b", re.I)

# The Korean keywords only count when paired with a play verb (or standing
# alone), so "게임처럼 재밌네요" and "테스트로 하나만 물어볼게요" stay ordinary
# messages instead of silently becoming a card deck.
GAME_INTENT_RE = re.compile(r"(게임|테스트)\s*(을|를|은|는|도)?\s*(해|하|할|시작|플레이|하자|하고|$)")

# ...and never when the message is plainly a housing search. A deck generated
# for "보증금 테스트해보고 싶은데 3000만원 이하로" answers a question nobody asked.
HOUSING_HINT_RE = re.compile(r"(보증금|임대|월세|전세|만원|매물|평수|추천해|\d\s*방|방\s*\d)")


def wants_game(message: str) -> bool:
    stripped = message.strip()
    if stripped.lower().startswith(GAME_COMMAND):
        return True
    if HOUSING_HINT_RE.search(stripped):
        return False
    return bool(GAME_WORD_RE.search(stripped) or GAME_INTENT_RE.search(stripped))


def game_theme(message: str) -> str:
    """Everything after /game is the theme; a bare keyword has none."""
    stripped = message.strip()
    if stripped.lower().startswith(GAME_COMMAND):
        return stripped[len(GAME_COMMAND) :].strip()
    return stripped


async def list_conversations(session: AsyncSession, user_id: int) -> list[AIConversation]:
    result = await session.exec(
        select(AIConversation).where(AIConversation.user_id == user_id).order_by(col(AIConversation.created_at).desc())
    )
    return list(result.all())


async def _get_owned_conversation(session: AsyncSession, user_id: int, conversation_id: UUID) -> AIConversation:
    conversation = await session.get(AIConversation, conversation_id)
    if conversation is None or conversation.user_id != user_id:
        raise ConversationNotFound
    return conversation


async def get_messages(session: AsyncSession, conversation_id: UUID) -> list[AIMessage]:
    result = await session.exec(
        select(AIMessage).where(AIMessage.chat_id == conversation_id).order_by(col(AIMessage.sent_date).asc())
    )
    return list(result.all())


async def get_conversation(session: AsyncSession, user_id: int, conversation_id: UUID) -> tuple[AIConversation, list[AIMessage]]:
    conversation = await _get_owned_conversation(session, user_id, conversation_id)
    return conversation, await get_messages(session, conversation_id)


async def delete_conversation(session: AsyncSession, user_id: int, conversation_id: UUID) -> None:
    conversation = await _get_owned_conversation(session, user_id, conversation_id)
    await session.delete(conversation)
    await session.commit()


def _to_chat_history(messages: list[AIMessage]) -> list[ChatMessage]:
    return [ChatMessage(role="assistant" if m.role == AIMessageRole.MODEL else "user", text=m.content) for m in messages]


def message_context(message: AIMessage) -> NoMatchContext | None:
    """The stored no-match context, so a live turn and a replayed one derive
    their alert actions the same way."""
    return NoMatchContext.model_validate(message.search_context) if message.search_context else None


async def chat(
    session: AsyncSession,
    user_id: int,
    conversation_id: UUID | None,
    user_message: str,
    image: str | None = None,
) -> tuple[AIConversation, AIMessage, list[HousingSummary]]:
    """One turn against a persisted conversation: loads (or creates) it,
    replays its stored history to the model, and stores both new messages.

    The stored assistant message carries everything the turn produced — its
    deck and its no-match context — so callers read those off the row rather
    than off a widening tuple."""
    started_here = conversation_id is None
    if conversation_id is not None:
        conversation = await _get_owned_conversation(session, user_id, conversation_id)
        history = _to_chat_history(await get_messages(session, conversation.id))
    else:
        # Committed up front because the game below needs a real row to point
        # its foreign key at, which is why the failure path has to clean up.
        conversation = AIConversation(user_id=user_id, title=user_message[:TITLE_MAX_LENGTH])
        session.add(conversation)
        await session.commit()
        await session.refresh(conversation)
        history = []

    game_id: UUID | None = None
    if wants_game(user_message):
        # Generated before the reply so the model can introduce a deck that
        # actually exists; a generation failure falls back to a normal turn.
        try:
            game = await game_service.create_game(session, user_id, game_theme(user_message), conversation.id)
            game_id = game.id
        except Exception:
            game_id = None

    # Read before the failure path below: a rollback expires the instance, and
    # touching conversation.id afterwards would attempt lazy IO from a context
    # that cannot await it (MissingGreenlet).
    conversation_pk = conversation.id

    try:
        reply, housing, no_match = await generate_reply(session, history, user_message, image)
    except Exception:
        # A first turn that never produced a reply must not leave a chat in the
        # sidebar titled with the question, which would open completely blank.
        if started_here:
            await session.rollback()
            orphan = await session.get(AIConversation, conversation_pk)
            if orphan is not None:
                await session.delete(orphan)
                await session.commit()
        raise

    session.add(AIMessage(chat_id=conversation.id, role=AIMessageRole.USER, content=user_message))
    assistant_message = AIMessage(
        chat_id=conversation.id,
        role=AIMessageRole.MODEL,
        content=reply,
        housing_ids=[h.id for h in housing] or None,
        game_id=game_id,
        search_context=no_match.model_dump(mode="json") if no_match else None,
    )
    session.add(assistant_message)
    await session.commit()

    return conversation, assistant_message, housing


async def housing_by_ids(session: AsyncSession, ids: set[int]) -> dict[int, HousingSummary]:
    if not ids:
        return {}
    result = await session.exec(select(HousingProject).where(col(HousingProject.id).in_(ids)))
    summaries = await to_summaries(session, list(result.all()))
    return {s.id: s for s in summaries}
