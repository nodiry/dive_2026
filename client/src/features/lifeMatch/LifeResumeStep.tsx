import type { Translations } from "../../lib/i18n/translations";
import { DISTRICTS } from "../../lib/i18n/translations";
import { HOUSING_TYPE_VALUES } from '@utils/filters';
import { DESTINATIONS, type LifeProfile } from "./model";

interface LifeResumeStepProps {
  profile: LifeProfile;
  onChange: (profile: LifeProfile) => void;
  t: Translations;
}

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-light/40 bg-white px-3 py-2.5 font-mono text-sm text-marine outline-none transition focus:border-terracotta";

export function LifeResumeStep({ profile, onChange, t }: LifeResumeStepProps) {
  const copy = t.lifeMatch;
  const set = <K extends keyof LifeProfile>(key: K, value: LifeProfile[K]) => onChange({ ...profile, [key]: value });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
      <section className="rounded-3xl border border-slate-light/30 bg-white/70 p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-extrabold text-marine">{copy.resumeTitle}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate">{copy.resumeDescription}</p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium text-marine">
            {copy.depositMax}
            <input
              type="number"
              min="0"
              value={profile.depositMaxManwon}
              onChange={(event) => set("depositMaxManwon", event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-marine">
            {copy.rentMax}
            <input
              type="number"
              min="0"
              value={profile.rentMaxManwon}
              onChange={(event) => set("rentMaxManwon", event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-marine">
            {copy.minArea}
            <input
              type="number"
              min="0"
              value={profile.minAreaM2}
              onChange={(event) => set("minAreaM2", event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-marine">
            {copy.minRooms}
            <input
              type="number"
              min="1"
              value={profile.minRoomCount}
              onChange={(event) => set("minRoomCount", event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="text-sm font-medium text-marine">
            {t.explore.districtLabel}
            <select value={profile.district} onChange={(event) => set("district", event.target.value)} className={inputClass}>
              <option value="">{t.explore.districtAll}</option>
              {DISTRICTS.map((district) => (
                <option key={district} value={district}>
                  {t.districts[district]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-marine">
            {t.explore.typeLabel}
            <select
              value={profile.type}
              onChange={(event) => set("type", event.target.value as LifeProfile["type"])}
              className={inputClass}
            >
              <option value="">{t.explore.typeAll}</option>
              {HOUSING_TYPE_VALUES.map((type) => (
                <option key={type} value={type}>
                  {t.housingType[type]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-marine">
            {copy.destination}
            <select value={profile.destinationId} onChange={(event) => set("destinationId", event.target.value)} className={inputClass}>
              {Object.keys(DESTINATIONS).map((id) => (
                <option key={id} value={id}>
                  {copy.destinationOptions[id as keyof typeof copy.destinationOptions]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-marine">
            {copy.destinationFrequency}
            <input
              type="number"
              min="0"
              max="7"
              value={profile.destinationFrequency}
              onChange={(event) => set("destinationFrequency", event.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <p className="mt-4 text-xs leading-5 text-slate">{copy.destinationNote}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {(
            [
              ["elevatorRequired", copy.elevator],
              ["parkingRequired", copy.parking],
              ["hasVehicle", copy.vehicle],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-light/30 bg-mist/70 px-4 py-3 text-sm font-medium text-marine"
            >
              <input
                type="checkbox"
                checked={profile[key]}
                onChange={(event) => set(key, event.target.checked)}
                className="h-4 w-4 accent-terracotta"
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      <aside className="rounded-3xl bg-marine p-6 text-mist shadow-lg sm:p-8">
        <p className="font-mono text-xs tracking-[0.2em] text-gold">{copy.liveResume}</p>
        <h3 className="mt-3 text-2xl font-extrabold">BUSAN HOME FIT</h3>
        <dl className="mt-8 space-y-5 text-sm">
          <div className="border-b border-white/15 pb-4">
            <dt className="text-mist/60">{copy.budget}</dt>
            <dd className="mt-1 font-mono text-lg">
              {profile.depositMaxManwon || "—"} / {profile.rentMaxManwon || "—"}
              <span className="ml-1 text-xs text-mist/60">만원</span>
            </dd>
          </div>
          <div className="border-b border-white/15 pb-4">
            <dt className="text-mist/60">{copy.home}</dt>
            <dd className="mt-1 font-mono text-lg">
              {profile.minAreaM2 || "—"}㎡ · {t.explore.roomCountLabel} {profile.minRoomCount || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-mist/60">{copy.location}</dt>
            <dd className="mt-1 text-lg">{profile.district ? t.districts[profile.district] : t.explore.districtAll}</dd>
          </div>
          <div>
            <dt className="text-mist/60">{copy.destination}</dt>
            <dd className="mt-1 text-lg">
              {copy.destinationOptions[profile.destinationId as keyof typeof copy.destinationOptions]} · {copy.perWeek} {profile.destinationFrequency}
            </dd>
          </div>
        </dl>
        <div className="mt-8 flex flex-wrap gap-2">
          {profile.elevatorRequired ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{copy.elevator}</span> : null}
          {profile.parkingRequired ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{copy.parking}</span> : null}
          {profile.hasVehicle ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{copy.vehicle}</span> : null}
        </div>
      </aside>
    </div>
  );
}
