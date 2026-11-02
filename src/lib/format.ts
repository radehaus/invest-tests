// Zahlenformat passend zur englischen App (€30,203.34).
// Für deutsches Format (30.203,34 €) nur LOCALE auf "de-DE" stellen, alles andere folgt.
const LOCALE = "en-IE";
/** Dezimaltrennzeichen der Locale, z. B. für den Ziffernblock */
export const DECIMAL = (1.5).toLocaleString(LOCALE).charAt(1);
const PCT = LOCALE.startsWith("de") ? " %" : "%";

const eurFmt = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR" });
const eur0Fmt = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export const eur = (n: number) => eurFmt.format(n);
export const eur0 = (n: number) => eur0Fmt.format(n);
export const num = (n: number, digits = 2) =>
  n.toLocaleString(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits });

const sign = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "±");
export const signedEur = (n: number) => sign(n) + eurFmt.format(Math.abs(n));
export const pct = (n: number, digits = 2) => `${sign(n)}${num(Math.abs(n), digits)}${PCT}`;
/** Prozent ohne Vorzeichen, z. B. Kosten oder Gewichte */
export const percent = (n: number, digits = 2) => `${num(n, digits)}${PCT}`;
export const pp = (n: number) => `${sign(n)}${num(Math.abs(n))} pp`;

export const shortDate = (ts: number) =>
  new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
export const monthYear = (ts: number) => new Date(ts).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
