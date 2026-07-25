from uuid import UUID

from fastapi import APIRouter, HTTPException

from src.ai import service as ai_service
from src.ai.models import AIMessageRole
from src.ai.schemas import (
    AiSearchRequest,
    AiSearchResponse,
    ConversationDetail,
    ConversationMessage,
    ConversationSummary,
)
from src.auth.dependencies import CurrentUser
from src.database import SessionDep

router = APIRouter()


@router.post("/search", response_model=AiSearchResponse)
async def post_ai_search(body: AiSearchRequest, session: SessionDep, user: CurrentUser) -> AiSearchResponse:
    assert user.id is not None
    try:
        conversation, reply, housing = await ai_service.chat(session, user.id, body.conversation_id, body.message)
    except ai_service.ConversationNotFound:
        raise HTTPException(status_code=404, detail="conversation not found") from None
    except ai_service.AiSearchError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return AiSearchResponse(reply=reply, housing=housing, conversation_id=conversation.id)


@router.get("/conversations", response_model=list[ConversationSummary])
async def get_conversations(session: SessionDep, user: CurrentUser) -> list[ConversationSummary]:
    assert user.id is not None
    conversations = await ai_service.list_conversations(session, user.id)
    return [ConversationSummary(id=c.id, title=c.title, created_at=c.created_at) for c in conversations]


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(conversation_id: UUID, session: SessionDep, user: CurrentUser) -> ConversationDetail:
    assert user.id is not None
    try:
        conversation, messages = await ai_service.get_conversation(session, user.id, conversation_id)
    except ai_service.ConversationNotFound:
        raise HTTPException(status_code=404, detail="conversation not found") from None
    by_id = await ai_service.housing_by_ids(session, {i for m in messages for i in (m.housing_ids or [])})
    return ConversationDetail(
        id=conversation.id,
        title=conversation.title,
        messages=[
            ConversationMessage(
                role="assistant" if m.role == AIMessageRole.MODEL else "user",
                text=m.content,
                housing=[by_id[i] for i in (m.housing_ids or []) if i in by_id],
            )
            for m in messages
        ],
    )


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(conversation_id: UUID, session: SessionDep, user: CurrentUser) -> None:
    assert user.id is not None
    try:
        await ai_service.delete_conversation(session, user.id, conversation_id)
    except ai_service.ConversationNotFound:
        raise HTTPException(status_code=404, detail="conversation not found") from None
