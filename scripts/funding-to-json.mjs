// Converts public/data/funding.xlsx into public/data/funding.json before every dev/build run,
// so staff can upload an Excel file and never touch code. A row with a bad year or amount
// stops the build (the live site keeps its previous version) and the error says which row.
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { readSheet } from 'read-excel-file/node';

const SRC = 'public/data/funding.xlsx';
const OUT = 'public/data/funding.json';

if (!existsSync(SRC)) {
  rmSync(OUT, { force: true });
  console.log(`funding: no ${SRC}, skipping`);
  process.exit(0);
}

const rows = await readSheet(SRC, 'Funding');
const header = rows[0].map((h) => String(h ?? '').trim().toLowerCase());
const col = (name) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`funding.xlsx: the Funding sheet needs a "${name[0].toUpperCase() + name.slice(1)}" column in row 1`);
  return i;
};
const [ci, yi, ai] = [col('centre'), col('year'), col('amount')];

const records = [];
const errors = [];
rows.slice(1).forEach((row, i) => {
  const line = i + 2;
  const centre = String(row[ci] ?? '').trim();
  const rawYear = row[yi];
  const rawAmount = row[ai];
  // Rows with no amount are placeholders (the template lists every centre with blanks).
  if (!centre || rawAmount == null || String(rawAmount).trim() === '') return;
  const year = Number(rawYear);
  const amount = typeof rawAmount === 'number' ? rawAmount : Number(String(rawAmount).replace(/[$,\s]/g, ''));
  if (!Number.isInteger(year) || year < 1900 || year > 2100) errors.push(`row ${line}: Year "${rawYear ?? ''}" should be a whole year like 2024`);
  else if (!Number.isFinite(amount) || amount < 0) errors.push(`row ${line}: Amount "${rawAmount}" is not a number`);
  else records.push({ centre, year, amount });
});

if (errors.length) {
  console.error(`funding.xlsx has problems:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}

writeFileSync(OUT, JSON.stringify(records));
console.log(`funding: ${records.length} rows -> ${OUT}`);
