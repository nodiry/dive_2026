import { Link } from "react-router";
import { TagStrip } from "../components/TagStrip";
import { usePoiCategories } from "../lib/queries";

export function Home() {
  const { data: categories } = usePoiCategories();

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <section className="text-center">
        <p className="font-mono text-sm tracking-wide text-terracotta uppercase">부산광역시 공공임대주택</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-marine sm:text-5xl">
          동네를 먼저 보고,
          <br />
          집을 고르세요.
        </h1>
        <p className="mt-4 text-lg text-slate">
          보증금과 평수만으로는 알 수 없는 것들 — 자주 가는 카페, 다니는 헬스장, 가까운 편의점까지 고려한
          공공임대주택 추천 서비스예요.
        </p>

        <div className="mt-8 flex justify-center">
          <TagStrip
            variant="hero"
            tags={(categories ?? []).slice(0, 7).map((c) => ({ label: c.categoryName }))}
          />
        </div>
      </section>

      <section className="mt-16 grid gap-6 sm:grid-cols-2">
        <Link
          to="/recommend"
          className="group rounded-3xl border border-terracotta/30 bg-terracotta/5 p-8 transition-colors hover:bg-terracotta/10"
        >
          <p className="font-mono text-xs tracking-wide text-terracotta-dark uppercase">취향 기반</p>
          <h2 className="mt-2 text-2xl font-bold text-marine">취향으로 찾기</h2>
          <p className="mt-2 text-slate">
            "자주 가는 카페, 헬스장, 편의점이 가까운 임대주택 어디야?" — 좋아하는 상권을 고르면 가까운 순서로
            추천해드려요.
          </p>
          <span className="mt-4 inline-block font-medium text-terracotta-dark group-hover:underline">
            취향 입력하기 →
          </span>
        </Link>

        <Link
          to="/search"
          className="group rounded-3xl border border-marine/20 bg-marine/5 p-8 transition-colors hover:bg-marine/10"
        >
          <p className="font-mono text-xs tracking-wide text-marine uppercase">조건 기반</p>
          <h2 className="mt-2 text-2xl font-bold text-marine">조건으로 찾기</h2>
          <p className="mt-2 text-slate">
            "5년 이내 신축, 보증금 3천만원 미만" — 원하는 조건을 정확히 입력해서 바로 필터링된 목록을
            받아보세요.
          </p>
          <span className="mt-4 inline-block font-medium text-marine group-hover:underline">조건 입력하기 →</span>
        </Link>
      </section>
    </div>
  );
}
