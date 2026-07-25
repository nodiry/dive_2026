from uuid import UUID

from google import genai
from google.genai import types
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.ai import tools as ai_tools
from src.ai.models import AIConversation, AIMessage, AIMessageRole
from src.ai.schemas import ChatMessage
from src.config import app_config
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

SYSTEM_PROMPT = """
You are 동네탐색 (Dongne Tamsaek)'s AI search assistant — a public rental
housing recommendation service for Busan Metropolitan City (BMC), built for
the DIVE 2026 hackathon with 선도소프트 (Sundosoft). When asked who owns,
made, or built you, say you're part of the 동네탐색 service, not a general
assistant.

Help users find public rental housing in Busan (매입임대/재개발임대/통합공공임대/
행복주택). Users may describe hard conditions (deposit, room count,
construction year, district, program type) or lifestyle preferences (nearby
cafes, gyms, restaurants, convenience stores, etc) — pick the matching tool,
or both if the request mixes the two. Never invent housing data or numbers;
only state what a tool result actually returned. If a tool returns no
results, say so plainly and suggest loosening a condition.

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


async def generate_reply(
    session: AsyncSession, history: list[ChatMessage], user_message: str
) -> tuple[str, list[HousingSummary]]:
    client = _client()
    tools = await ai_tools.build_tools(session)
    config = types.GenerateContentConfig(tools=tools, system_instruction=SYSTEM_PROMPT)

    contents = _to_contents(history) + [types.Content(role="user", parts=[types.Part(text=user_message)])]
    # Keyed by id, not appended, so a housing project surfaced by more than
    # one tool call in the same turn only renders once in the UI.
    all_housing: dict[int, HousingSummary] = {}

    for _ in range(MAX_TOOL_ROUNDS):
        try:
            response = await client.aio.models.generate_content(model=MODEL, contents=contents, config=config)
        except Exception as e:
            raise AiSearchError("The AI search request failed. Please try again.") from e

        if not response.candidates:
            return response.text or "", list(all_housing.values())

        candidate = response.candidates[0]
        content = candidate.content
        if content is None or not content.parts:
            return response.text or "", list(all_housing.values())

        function_calls = [p.function_call for p in content.parts if p.function_call]
        contents.append(content)

        if not function_calls:
            return response.text or "", list(all_housing.values())

        for fc in function_calls:
            if not fc.name:
                continue
            result_text, housing = await ai_tools.dispatch_tool(session, fc.name, dict(fc.args or {}))
            for h in housing:
                all_housing[h.id] = h
            contents.append(
                types.Content(
                    role="user",
                    parts=[types.Part.from_function_response(name=fc.name, response={"result": result_text})],
                )
            )

    return "I couldn't finish that request — try narrowing your question.", list(all_housing.values())


class ConversationNotFound(Exception):
    pass


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


async def chat(
    session: AsyncSession, user_id: int, conversation_id: UUID | None, user_message: str
) -> tuple[AIConversation, str, list[HousingSummary]]:
    """One turn against a persisted conversation: loads (or creates) it,
    replays its stored history to the model, and stores both new messages."""
    if conversation_id is not None:
        conversation = await _get_owned_conversation(session, user_id, conversation_id)
        history = _to_chat_history(await get_messages(session, conversation.id))
    else:
        conversation = AIConversation(user_id=user_id, title=user_message[:TITLE_MAX_LENGTH])
        session.add(conversation)
        await session.commit()
        await session.refresh(conversation)
        history = []

    reply, housing = await generate_reply(session, history, user_message)

    session.add(AIMessage(chat_id=conversation.id, role=AIMessageRole.USER, content=user_message))
    session.add(
        AIMessage(
            chat_id=conversation.id,
            role=AIMessageRole.MODEL,
            content=reply,
            housing_ids=[h.id for h in housing] or None,
        )
    )
    await session.commit()

    return conversation, reply, housing


async def housing_by_ids(session: AsyncSession, ids: set[int]) -> dict[int, HousingSummary]:
    if not ids:
        return {}
    result = await session.exec(select(HousingProject).where(col(HousingProject.id).in_(ids)))
    summaries = await to_summaries(session, list(result.all()))
    return {s.id: s for s in summaries}
