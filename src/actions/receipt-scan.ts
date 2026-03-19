"use server";

/**
 * Server action that sends a receipt image to the OCR.space API
 * and returns the extracted text.
 *
 * Requires OCR_SPACE_API_KEY in environment variables.
 * Free tier: 25,000 requests/month.
 */

const OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image";

interface OcrSpaceResult {
  ParsedResults?: {
    ParsedText: string;
    ErrorMessage: string;
    ErrorDetails: string;
  }[];
  IsErroredOnProcessing: boolean;
  ErrorMessage?: string[];
}

export async function scanReceipt(
  formData: FormData
): Promise<{ success: true; text: string } | { success: false; error: string }> {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    return { success: false, error: "OCR_SPACE_API_KEY not configured" };
  }

  const file = formData.get("image") as File | null;
  if (!file) {
    return { success: false, error: "No image provided" };
  }

  try {
    // Convert File to base64 data URI for the API
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "image/png";
    const dataUri = `data:${mimeType};base64,${base64}`;

    const body = new URLSearchParams({
      base64Image: dataUri,
      OCREngine: "2", // Engine 2 is optimized for receipts/documents
      isTable: "true", // Preserve table/columnar layout
      scale: "true", // Upscale small images server-side
      detectOrientation: "true",
    });

    const response = await fetch(OCR_SPACE_ENDPOINT, {
      method: "POST",
      headers: {
        apikey: apiKey,
      },
      body,
    });

    if (!response.ok) {
      return {
        success: false,
        error: `OCR API returned ${response.status}`,
      };
    }

    const result: OcrSpaceResult = await response.json();

    if (result.IsErroredOnProcessing || !result.ParsedResults?.length) {
      const msg =
        result.ErrorMessage?.join("; ") ||
        result.ParsedResults?.[0]?.ErrorMessage ||
        "OCR processing failed";
      return { success: false, error: msg };
    }

    const text = result.ParsedResults[0].ParsedText;
    if (!text || text.trim().length === 0) {
      return { success: false, error: "No text detected in image" };
    }

    return { success: true, text };
  } catch (err) {
    const message = err instanceof Error ? err.message : "OCR request failed";
    return { success: false, error: message };
  }
}
