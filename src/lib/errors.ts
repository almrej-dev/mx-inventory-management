/**
 * Maps raw database/Prisma errors to user-friendly messages.
 */

const CONSTRAINT_FIELD_LABELS: Record<string, string> = {
  sku: "SKU",
  email: "email",
  name: "name",
};

/**
 * Converts a caught error into a human-readable message suitable for display.
 * Handles common Prisma error patterns (unique constraint, foreign key, not found).
 *
 * @param err  – the caught value (usually an Error instance)
 * @param fallback – generic message when no pattern matches (e.g. "Failed to create product")
 */
export function humanError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;

  const msg = err.message;

  // Unique constraint violation
  if (msg.includes("Unique constraint failed")) {
    const fieldMatch = msg.match(/fields:\s*\(([^)]+)\)/);
    if (fieldMatch) {
      const fields = fieldMatch[1]
        .split(",")
        .map((f) => f.replace(/`/g, "").trim())
        .map((f) => CONSTRAINT_FIELD_LABELS[f] || f);
      return `A record with this ${fields.join(", ")} already exists.`;
    }
    return "A record with these values already exists.";
  }

  // Foreign key constraint (e.g. trying to delete a referenced row)
  if (msg.includes("Foreign key constraint failed")) {
    return "This record is referenced by other data and cannot be deleted.";
  }

  // Record not found (e.g. concurrent deletion)
  if (msg.includes("Record to update not found") || msg.includes("Record to delete does not exist")) {
    return "This record no longer exists. It may have been deleted.";
  }

  // Transaction timeout
  if (msg.includes("Transaction API error") || msg.includes("expired transaction")) {
    return "The operation took too long. Please try again.";
  }

  // Connection / timeout errors
  if (msg.includes("Can't reach database") || msg.includes("Connection refused") || msg.includes("timed out")) {
    return "Unable to reach the database. Please try again later.";
  }

  // Prisma validation (malformed query – should not happen, but just in case)
  if (msg.includes("Invalid `prisma.")) {
    // Strip the Prisma internals, return only the human-useful portion
    const reasonMatch = msg.match(/:\s*([A-Z][\s\S]*)/);
    if (reasonMatch) {
      const reason = reasonMatch[1].trim().split("\n")[0];
      // If the extracted reason is still technical, use fallback
      if (reason.length > 120 || reason.includes("prisma")) {
        return fallback;
      }
      return reason;
    }
    return fallback;
  }

  // If the message looks like a clean sentence (starts with uppercase, no stack trace indicators),
  // trust it — it's likely a manually thrown error from our own code.
  if (/^[A-Z]/.test(msg) && !msg.includes("\n") && msg.length < 200) {
    return msg;
  }

  return fallback;
}
