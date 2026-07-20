// src/app/core/format.ts
var inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
var inrRound = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
function fmtINR(n, round = false) {
  return (round ? inrRound : inr).format(n || 0);
}
function fmtINRCompact(n) {
  const v = n || 0;
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  const scaled = (divisor) => (abs / divisor).toFixed(1).replace(/\.0$/, "");
  if (abs >= 1e7)
    return `${sign}\u20B9${scaled(1e7)} Cr`;
  if (abs >= 1e5)
    return `${sign}\u20B9${scaled(1e5)} L`;
  return fmtINR(v, true);
}
function fmtDate(d) {
  if (!d)
    return "\u2014";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function today() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function addDays(days, from) {
  const base = from ? new Date(from).getTime() : Date.now();
  return new Date(base + days * 864e5).toISOString().slice(0, 10);
}
function daysBetween(a, b = /* @__PURE__ */ new Date()) {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 864e5);
}
function initials(name) {
  return (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}
var AVATAR_COLORS = [
  { bg: "#eef2ff", color: "#4f46e5" },
  { bg: "#fdf2f8", color: "#9d174d" },
  { bg: "#ecfdf5", color: "#065f46" },
  { bg: "#fff7ed", color: "#9a3412" },
  { bg: "#ede9fe", color: "#5b21b6" },
  { bg: "#dbeafe", color: "#1d4ed8" }
];
function avatarColor(name) {
  let h = 0;
  for (const c of name || "")
    h += c.charCodeAt(0);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function numberToWords(amount) {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen"
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const n = Math.floor(Math.abs(amount));
  if (n === 0)
    return "Zero Rupees Only";
  const inWords = (num) => {
    if (num === 0)
      return "";
    if (num < 20)
      return ones[num] + " ";
    if (num < 100)
      return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "") + " ";
    if (num < 1e3)
      return ones[Math.floor(num / 100)] + " Hundred " + inWords(num % 100);
    if (num < 1e5)
      return inWords(Math.floor(num / 1e3)) + "Thousand " + inWords(num % 1e3);
    if (num < 1e7)
      return inWords(Math.floor(num / 1e5)) + "Lakh " + inWords(num % 1e5);
    return inWords(Math.floor(num / 1e7)) + "Crore " + inWords(num % 1e7);
  };
  const paise = Math.round((Math.abs(amount) - n) * 100);
  return inWords(n).trim() + " Rupees" + (paise ? " and " + inWords(paise).trim() + " Paise" : "") + " Only";
}
var STATES = [
  { name: "Jammu & Kashmir", code: "01" },
  { name: "Himachal Pradesh", code: "02" },
  { name: "Punjab", code: "03" },
  { name: "Chandigarh", code: "04" },
  { name: "Uttarakhand", code: "05" },
  { name: "Haryana", code: "06" },
  { name: "Delhi", code: "07" },
  { name: "Rajasthan", code: "08" },
  { name: "Uttar Pradesh", code: "09" },
  { name: "Bihar", code: "10" },
  { name: "Sikkim", code: "11" },
  { name: "Arunachal Pradesh", code: "12" },
  { name: "Nagaland", code: "13" },
  { name: "Manipur", code: "14" },
  { name: "Mizoram", code: "15" },
  { name: "Tripura", code: "16" },
  { name: "Meghalaya", code: "17" },
  { name: "Assam", code: "18" },
  { name: "West Bengal", code: "19" },
  { name: "Jharkhand", code: "20" },
  { name: "Odisha", code: "21" },
  { name: "Chhattisgarh", code: "22" },
  { name: "Madhya Pradesh", code: "23" },
  { name: "Gujarat", code: "24" },
  { name: "Daman & Diu", code: "25" },
  { name: "Dadra & Nagar Haveli", code: "26" },
  { name: "Maharashtra", code: "27" },
  { name: "Andhra Pradesh (old)", code: "28" },
  { name: "Karnataka", code: "29" },
  { name: "Goa", code: "30" },
  { name: "Lakshadweep", code: "31" },
  { name: "Kerala", code: "32" },
  { name: "Tamil Nadu", code: "33" },
  { name: "Puducherry", code: "34" },
  { name: "Andaman & Nicobar", code: "35" },
  { name: "Telangana", code: "36" },
  { name: "Andhra Pradesh", code: "37" },
  { name: "Ladakh", code: "38" }
];
function stateName(code) {
  return STATES.find((s) => s.code === code)?.name || code;
}
var UNITS = ["Nos", "Kg", "Gm", "Ltr", "Ml", "Box", "Pcs", "Dozen", "Set", "Mtr", "Sqft", "Hrs", "Bag", "Pair"];
var GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
function isValidGSTIN(gstin) {
  return GSTIN_RE.test((gstin || "").toUpperCase());
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
}
function monthLabel(yyyyMm) {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short" });
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export {
  fmtINR,
  fmtINRCompact,
  fmtDate,
  today,
  addDays,
  daysBetween,
  initials,
  avatarColor,
  numberToWords,
  STATES,
  stateName,
  UNITS,
  isValidGSTIN,
  isValidEmail,
  monthLabel,
  downloadBlob
};
//# sourceMappingURL=chunk-7F65RAZH.js.map
