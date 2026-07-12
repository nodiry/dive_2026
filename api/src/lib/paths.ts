/**
 * Single source of truth for where the (gitignored, ~560MB) sample data lives.
 * Every ingestion script imports SAMPLES_DIR from here rather than hardcoding
 * a relative path — if the drop-in location ever changes, this is the only
 * file that needs editing.
 */
export const SAMPLES_DIR = new URL("../../../samples/", import.meta.url);

export async function requireSamplesDir(): Promise<void> {
  const exists = await Bun.file(new URL("housing/purchased_units.csv", SAMPLES_DIR)).exists();
  if (!exists) {
    console.error(
      "\nsamples/ not found (or incomplete) at the repo root.\n" +
        "Download the data zip, unzip it, and drop the resulting `samples/` folder\n" +
        "directly into the project root (next to api/, client/, docs/), then re-run\n" +
        "this command. See README.md and docs/DATA_MODEL.md for details.\n",
    );
    process.exit(1);
  }
}
