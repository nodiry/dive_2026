from src.ai.criteria import criteria_key
from src.ai.schemas import AlertCriteria, NoMatchContext, actions_for_no_match
from src.housing.districts import is_busan_wide, normalize_district


def test_normalize_district_accepts_busans_common_spellings() -> None:
    assert normalize_district("수영") == "수영구"
    assert normalize_district("부산 수영구") == "수영구"
    assert normalize_district("부산광역시 수영구") == "수영구"
    assert normalize_district("기장") == "기장군"


def test_normalize_district_does_not_confuse_gangnam_with_nam_gu() -> None:
    assert normalize_district("강남구") is None


def test_citywide_aliases_are_supported_without_a_district_filter() -> None:
    assert is_busan_wide("부산")
    assert is_busan_wide("부산광역시")
    assert is_busan_wide("부산 전체")
    assert is_busan_wide("전체")
    assert not is_busan_wide("강남구")


def test_alert_actions_only_subscribe_for_supported_district_criteria() -> None:
    criteria = AlertCriteria(district="강서구", deposit_max=30_000_000)
    context = NoMatchContext(
        reason="district_inventory_empty",
        criteria=criteria,
        criteria_key=criteria_key(criteria),
    )
    assert [action.type for action in actions_for_no_match(context)] == ["subscribe_housing_alert"]

    unsupported = NoMatchContext(
        reason="unsupported_region",
        criteria=AlertCriteria(district="강남구"),
    )
    assert actions_for_no_match(unsupported) == []
