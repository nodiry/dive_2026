import { useParams } from "react-router";
import { KakaoMap } from "../components/KakaoMap";
import { useLocale } from "../lib/i18n/localeContext";
import { formatWon } from "../lib/format";
import { useHousingDetail } from "../lib/queries";

export function Detail() {
  const { t } = useLocale();
  const { id } = useParams();
  const housingId = Number(id);
  const { data: housing, isLoading, isError } = useHousingDetail(housingId);

  if (isLoading) return <div className="mx-auto max-w-3xl px-6 py-12 text-slate">{t.detail.loading}</div>;
  if (isError || !housing) {
    return <div className="mx-auto max-w-3xl px-6 py-12 text-terracotta-dark">{t.detail.notFound}</div>;
  }

  const typeLabel = t.housingType[housing.type];

  const specs: { label: string; value: string }[] = [
    { label: t.detail.specType, value: typeLabel },
    { label: t.detail.specAddress, value: housing.address },
    { label: t.detail.specBuiltDate, value: housing.builtDate ?? t.detail.noData },
    { label: t.detail.specTotalUnits, value: housing.totalUnits != null ? t.units.totalUnits(housing.totalUnits) : t.detail.noData },
    { label: t.detail.specDeposit, value: formatWon(housing.minDeposit) },
    { label: t.detail.specRent, value: formatWon(housing.minRent) },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <span className="inline-block rounded-full bg-marine/10 px-2.5 py-0.5 text-xs font-medium text-marine">
        {typeLabel}
      </span>
      <h1 className="mt-2 text-3xl font-extrabold text-marine">{housing.projectName}</h1>
      <p className="mt-1 text-slate">{housing.address}</p>

      <dl className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border border-slate-light/30 bg-white/60 p-6 sm:grid-cols-3">
        {specs.map((spec) => (
          <div key={spec.label}>
            <dt className="text-xs text-slate">{spec.label}</dt>
            <dd className="font-mono text-marine">{spec.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8">
        <h2 className="mb-3 font-medium text-marine">{t.detail.locationHeading}</h2>
        <KakaoMap
          className="aspect-video w-full rounded-2xl"
          markers={[
            { kind: "housing", id: housing.id, lat: housing.lat ?? NaN, lng: housing.lng ?? NaN, label: housing.projectName },
          ]}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-slate-light/50 bg-mist-dim p-6 text-center text-sm text-slate">
        {t.detail.nearbyPlaceholder}
      </div>
    </div>
  );
}
