"""
Generates a 하루 deck with Gemini and scores the run.

The deck is model-authored but not free-form: options must spend a closed set
of traits (the same vocabulary the Life Match engine already scores) and pick
icons the client can already draw. That keeps a generated game renderable by
the existing deck UI and, more importantly, lets the run end in real housing
recommendations instead of a personality label.
"""

import json
import uuid
from typing import Any
from uuid import UUID

from google import genai
from google.genai import types
from sqlmodel import col, desc, select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.config import app_config
from src.game.models import GameSession
from src.game.schemas import (
    ICON_KEYS,
    TRAIT_KEYS,
    GameQuestion,
    GameResult,
    GameSessionOut,
    GameStats,
    GameSummary,
    LocalizedText,
)
from src.models import utcnow
from src.recommendation import service as recommendation_service
from src.recommendation.schemas import LifestylePreference, LifestyleRecommendationRequest

MODEL = "gemini-flash-lite-latest"
QUESTION_COUNT = 5
OPTIONS_PER_QUESTION = 4
RESULT_HOUSING_LIMIT = 6

# Which real commercial_poi category_name values a trait argues for. Traits with
# no shop equivalent (rest, space, green...) shape the stats instead.
TRAIT_CATEGORIES: dict[str, list[str]] = {
    "cafe": ["카페"],
    "convenience": ["편의점"],
    "exercise": ["헬스장"],
    "pharmacy": ["약국"],
    "dining": ["백반/한정식", "김밥/만두/분식", "치킨"],
    "food": ["백반/한정식", "국/탕/찌개류", "중국집"],
    "commercial": ["카페", "편의점"],
}
FUN_TRAITS = {"cafe", "dining", "food", "exercise", "fun", "commercial"}
WORK_TRAITS = {"commute", "work", "destination", "parking", "housing"}
REST_TRAITS = {"rest", "home", "green", "residential", "walking", "space", "quiet"}

DECK_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "kicker": {"$ref": "#/$defs/text"},
                    "title": {"$ref": "#/$defs/text"},
                    "description": {"$ref": "#/$defs/text"},
                    "options": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "title": {"$ref": "#/$defs/text"},
                                "caption": {"$ref": "#/$defs/text"},
                                "meaning": {"$ref": "#/$defs/text"},
                                "icon": {"type": "string", "enum": ICON_KEYS},
                                "chips": {"type": "array", "items": {"$ref": "#/$defs/text"}},
                                "traits": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "key": {"type": "string", "enum": TRAIT_KEYS},
                                            "value": {"type": "number"},
                                        },
                                        "required": ["key", "value"],
                                    },
                                },
                            },
                            "required": ["id", "title", "caption", "meaning", "icon", "chips", "traits"],
                        },
                    },
                },
                "required": ["id", "kicker", "title", "description", "options"],
            },
        }
    },
    "required": ["questions"],
    "$defs": {
        "text": {
            "type": "object",
            "properties": {"ko": {"type": "string"}, "en": {"type": "string"}},
            "required": ["ko", "en"],
        }
    },
}

SYSTEM_PROMPT = f"""
You author a short card game that helps a Busan citizen discover what they
actually want from a neighborhood, in the voice of the 하루 service.

Rules:
- Exactly {QUESTION_COUNT} questions, exactly {OPTIONS_PER_QUESTION} options each.
- Every question is a concrete everyday scene ("토요일 아침 눈을 떴다"), never a
  survey question ("카페를 얼마나 좋아하세요?"). No option is obviously correct.
- All text is written in both Korean (ko) and English (en). Korean is primary
  and must read naturally, not translated.
- `caption` is one short line shown before the card is picked. `meaning` is one
  or two sentences shown after, telling the player what the choice says about
  how they want to live. `chips` are 2-3 two-word tags.
- Each option spends 2-4 traits with values between 1 and 3. Traits are the
  only way the game affects the housing recommendation, so make them honest:
  an option about late-night walks should spend `walking` and `rest`, not `cafe`.
- ids are short lowercase slugs, unique within the deck.
"""


def _client() -> genai.Client:
    return genai.Client(api_key=app_config.GEMINI_API_KEY)


def _normalize(raw: dict[str, Any]) -> list[GameQuestion]:
    """Gemini returns traits as a list of pairs (object keys can't be an enum)."""
    questions: list[GameQuestion] = []
    for question in raw.get("questions", []):
        options = []
        for option in question.get("options", []):
            traits = {entry["key"]: float(entry["value"]) for entry in option.get("traits", []) if entry.get("key") in TRAIT_KEYS}
            options.append(
                {
                    **option,
                    "icon": option["icon"] if option.get("icon") in ICON_KEYS else "compass",
                    "traits": traits,
                }
            )
        if options:
            questions.append(GameQuestion.model_validate({**question, "options": options}))
    return questions


async def generate_deck(theme: str) -> list[GameQuestion]:
    response = await _client().aio.models.generate_content(
        model=MODEL,
        contents=f"Theme the deck around: {theme}" if theme else "A general 하루 deck.",
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=DECK_SCHEMA,
            temperature=1.0,
        ),
    )
    questions = _normalize(json.loads(response.text or "{}"))
    if not questions:
        raise ValueError("deck generation returned no questions")
    return questions


async def create_game(
    session: AsyncSession,
    user_id: int,
    theme: str | None,
    conversation_id: UUID | None,
) -> GameSessionOut:
    resolved_theme = (theme or "").strip() or "부산에서의 하루"
    questions = await generate_deck(resolved_theme)
    game = GameSession(
        user_id=user_id,
        conversation_id=conversation_id,
        theme=resolved_theme,
        deck=[q.model_dump(by_alias=True) for q in questions],
    )
    session.add(game)
    await session.commit()
    await session.refresh(game)
    return _to_out(game)


def _to_out(game: GameSession) -> GameSessionOut:
    return GameSessionOut(
        id=game.id,
        theme=game.theme,
        questions=[GameQuestion.model_validate(q) for q in game.deck],
        answers=game.answers,
        result=GameResult.model_validate(game.result) if game.result else None,
        created_at=game.created_at,
    )


async def list_games(session: AsyncSession, user_id: int) -> list[GameSummary]:
    rows = (
        await session.exec(
            select(GameSession).where(col(GameSession.user_id) == user_id).order_by(desc(col(GameSession.created_at))).limit(20)
        )
    ).all()
    return [GameSummary(id=g.id, theme=g.theme, completed=g.result is not None, created_at=g.created_at) for g in rows]


async def get_game(session: AsyncSession, user_id: int, game_id: UUID) -> GameSessionOut | None:
    game = await session.get(GameSession, game_id)
    if game is None or game.user_id != user_id:
        return None
    return _to_out(game)


async def save_progress(
    session: AsyncSession,
    user_id: int,
    game_id: UUID,
    answers: dict[str, str],
) -> GameSessionOut | None:
    """
    Store picks without scoring, so abandoning a deck halfway and reopening the
    chat resumes where it stopped instead of restarting at card one.
    """
    game = await session.get(GameSession, game_id)
    if game is None or game.user_id != user_id:
        return None
    if game.result is not None:
        return _to_out(game)
    game.answers = answers
    game.updated_at = utcnow()
    session.add(game)
    await session.commit()
    await session.refresh(game)
    return _to_out(game)


async def answer_game(
    session: AsyncSession,
    user_id: int,
    game_id: UUID,
    answers: dict[str, str],
) -> GameSessionOut | None:
    game = await session.get(GameSession, game_id)
    if game is None or game.user_id != user_id:
        return None

    totals: dict[str, float] = {}
    for question in game.deck:
        chosen_id = answers.get(question["id"])
        option = next((o for o in question["options"] if o["id"] == chosen_id), None)
        if option is None:
            continue
        for key, value in (option.get("traits") or {}).items():
            totals[key] = totals.get(key, 0.0) + float(value)

    fun = sum(v for k, v in totals.items() if k in FUN_TRAITS)
    work = sum(v for k, v in totals.items() if k in WORK_TRAITS)
    rest = sum(v for k, v in totals.items() if k in REST_TRAITS)
    axis_total = fun + work + rest
    stats = (
        GameStats(
            fun=round(fun / axis_total * 100, 1),
            work=round(work / axis_total * 100, 1),
            rest=round(100 - round(fun / axis_total * 100, 1) - round(work / axis_total * 100, 1), 1),
        )
        if axis_total
        else GameStats(fun=34, work=33, rest=33)
    )

    ranked_traits = sorted(totals.items(), key=lambda pair: pair[1], reverse=True)
    categories: list[str] = []
    weight_by_category: dict[str, float] = {}
    peak = ranked_traits[0][1] if ranked_traits else 1.0
    for key, value in ranked_traits:
        for category in TRAIT_CATEGORIES.get(key, []):
            if category not in weight_by_category:
                categories.append(category)
            weight_by_category[category] = max(weight_by_category.get(category, 0.0), round(min(1.0, value / peak), 2))

    housing = []
    if weight_by_category:
        ranked = await recommendation_service.recommend_lifestyle(
            session,
            LifestyleRecommendationRequest(
                preferences=[
                    LifestylePreference(category_name=name, weight=max(weight, 0.15))
                    for name, weight in weight_by_category.items()
                ],
                radius_meters=600,
            ),
        )
        housing = [r.housing for r in ranked[:RESULT_HOUSING_LIMIT]]

    top_traits = [key for key, _ in ranked_traits[:3]]
    leaned_ko = ", ".join(top_traits) or "균형"
    leaned_en = ", ".join(top_traits) or "balance"
    result = GameResult(
        stats=stats,
        top_traits=top_traits,
        categories=categories[:6],
        summary=LocalizedText(
            ko=f"FUN {stats.fun} · WORK {stats.work} · REST {stats.rest}. 가장 크게 반응한 건 {leaned_ko}이었어요.",
            en=f"FUN {stats.fun} · WORK {stats.work} · REST {stats.rest}. You leaned hardest on {leaned_en}.",
        ),
        housing=housing,
    )

    game.answers = answers
    game.result = json.loads(result.model_dump_json(by_alias=True))
    game.completed_at = utcnow()
    game.updated_at = utcnow()
    session.add(game)
    await session.commit()
    await session.refresh(game)
    return _to_out(game)


def new_game_id() -> UUID:
    return uuid.uuid4()
