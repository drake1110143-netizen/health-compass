export async function extractTextFromFileUrl(fileUrl: string) {
  return {
    fileUrl,
    extractedText:
      'OCR placeholder: integrate specialized OCR model/service (e.g., Azure Vision, Tesseract, or custom pipeline) here.',
    structuredSections: {
      patientDetails: null,
      observations: [],
      conclusions: []
    }
  };
}
