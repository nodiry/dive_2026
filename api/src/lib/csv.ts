/**
 * BMC's sample CSVs are EUC-KR encoded; the 소상공인시장진흥공단 POI dataset is
 * UTF-8 (its own read-me notes they switched away from EUC-KR because it was
 * corrupting business names). Always read via `readCsv`, never `.text()`
 * directly, or one of the two will come out mangled.
 */
const decoders = {
  "euc-kr": new TextDecoder("euc-kr" as never),
  "utf-8": new TextDecoder("utf-8"),
};

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/\r\n/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

export async function readCsv(
  path: string | URL,
  encoding: keyof typeof decoders = "euc-kr",
): Promise<Record<string, string>[]> {
  const bytes = await Bun.file(path).bytes();
  const text = decoders[encoding].decode(bytes);
  const [header, ...body] = parseRows(text);
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

export function toNumber(v: string | undefined): number | null {
  if (!v) return null;
  const t = v.replace(/,/g, "").trim();
  if (t === "" || t.toUpperCase() === "NA") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** "20251130" -> "2025-11-30" */
export function dateFromYYYYMMDD(v: string | undefined): string | null {
  const t = v?.trim();
  if (!t || !/^\d{8}$/.test(t)) return null;
  return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
}

/** "10-27-2023 13:10:05" -> "2023-10-27T13:10:05" */
export function timestampFromMMDDYYYY(v: string | undefined): string | null {
  const t = v?.trim();
  const m = t?.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}:\d{2}:\d{2})$/);
  if (!m) return null;
  const [, mm, dd, yyyy, time] = m;
  return `${yyyy}-${mm}-${dd}T${time}`;
}

/**
 * 매입임대 unit-info rows suffix the address with a "(동명[,건물명])" annotation
 * that the matching price file omits, e.g. "...100(광안동,명성갤러리3)" vs
 * "...100" — strip it so both files key on the same string.
 */
export function stripDongSuffix(address: string): string {
  return address.replace(/\s*\([^)]*\)?\s*$/, "").trim();
}

/** "부산광역시 수영구 ..." -> "수영구" — generic, not hardcoded to sample districts */
export function districtFromAddress(address: string): string | null {
  const m = address.match(/부산광역시\s+(\S+?(?:구|군))/);
  return m?.[1] ?? null;
}

export function elevatorFromLabel(v: string | undefined): boolean | null {
  if (v === "설치") return true;
  if (v === "미설치") return false;
  return null;
}
