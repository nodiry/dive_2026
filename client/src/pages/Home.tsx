import { Link } from "react-router";
import { TagStrip } from "../components/TagStrip";
import { useLocale } from "../lib/i18n/localeContext";
import { usePoiCategories } from "../lib/queries";

export function Home() {
  const { t } = useLocale();
  const { data: categories } = usePoiCategories();

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <section className="text-center">
        <p className="font-mono text-sm tracking-wide text-terracotta uppercase">{t.home.eyebrow}</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-marine sm:text-5xl">
          {t.home.titleLine1}
          <br />
          {t.home.titleLine2}
        </h1>
        <p className="mt-4 text-lg text-slate">{t.home.subtitle}</p>

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
          <p className="font-mono text-xs tracking-wide text-terracotta-dark uppercase">{t.home.recommendEyebrow}</p>
          <h2 className="mt-2 text-2xl font-bold text-marine">{t.home.recommendTitle}</h2>
          <p className="mt-2 text-slate">{t.home.recommendBody}</p>
          <span className="mt-4 inline-block font-medium text-terracotta-dark group-hover:underline">
            {t.home.recommendCta}
          </span>
        </Link>

        <Link
          to="/search"
          className="group rounded-3xl border border-marine/20 bg-marine/5 p-8 transition-colors hover:bg-marine/10"
        >
          <p className="font-mono text-xs tracking-wide text-marine uppercase">{t.home.searchEyebrow}</p>
          <h2 className="mt-2 text-2xl font-bold text-marine">{t.home.searchTitle}</h2>
          <p className="mt-2 text-slate">{t.home.searchBody}</p>
          <span className="mt-4 inline-block font-medium text-marine group-hover:underline">{t.home.searchCta}</span>
        </Link>
      </section>
    </div>
  );
}
