/**
 * Utility helper to convert numeric amount to uppercase English words
 * e.g., 155 -> "ONE HUNDRED FIFTY-FIVE PESOS ONLY"
 */

const ONES = [
  "", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
  "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN",
  "SEVENTEEN", "EIGHTEEN", "NINETEEN"
];

const TENS = [
  "", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"
];

function convertBelowThousand(num: number): string {
  let str = "";
  if (num >= 100) {
    str += ONES[Math.floor(num / 100)] + " HUNDRED ";
    num %= 100;
  }
  if (num >= 20) {
    str += TENS[Math.floor(num / 10)] + (num % 10 !== 0 ? "-" + ONES[num % 10] : "");
  } else if (num > 0) {
    str += ONES[num];
  }
  return str.trim();
}

export function numberToWords(amount: number): string {
  if (amount <= 0 || isNaN(amount)) return "ZERO PESOS ONLY";

  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  let result = "";

  const millions = Math.floor(integerPart / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remainder = integerPart % 1000;

  if (millions > 0) {
    result += convertBelowThousand(millions) + " MILLION ";
  }
  if (thousands > 0) {
    result += convertBelowThousand(thousands) + " THOUSAND ";
  }
  if (remainder > 0) {
    result += convertBelowThousand(remainder);
  }

  result = result.trim();
  if (!result) result = "ZERO";

  result += " PESOS";

  if (decimalPart > 0) {
    result += ` AND ${decimalPart}/100`;
  } else {
    result += " ONLY";
  }

  return result;
}

/**
 * Splits a long amount in words into two lines for Cedula printing.
 * Target: ~4 to 5 words on the first line, with the rest continuing on the second line.
 */
export function formatCedulaWordsTwoLines(words: string, maxWordsLine1 = 4): string {
  if (!words) return "";
  const parts = words.trim().split(/\s+/);
  if (parts.length <= maxWordsLine1) {
    return words;
  }

  const line1 = parts.slice(0, maxWordsLine1).join(" ");
  const line2 = parts.slice(maxWordsLine1).join(" ");
  return `${line1}\n${line2}`;
}
