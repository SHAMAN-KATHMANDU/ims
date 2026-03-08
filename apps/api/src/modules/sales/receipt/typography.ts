/**
 * Typography scale and font registration for receipt PDF.
 */
import path from "path";
import fs from "fs";
import type PDFDocument from "pdfkit";

export const TYPE = {
  title: 20,
  subtitle: 14,
  section: 11,
  body: 9,
  small: 8,
  tiny: 7,
} as const;

const FONT_REGULAR = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";

let customFontsAvailable = false;
let fontsChecked = false;

function findFontPaths(): { regular: string; bold: string } | null {
  const possibleBase = [
    path.join(process.cwd(), "node_modules/@fontsource/roboto/files"),
    path.join(__dirname, "../../../../node_modules/@fontsource/roboto/files"),
  ];

  for (const base of possibleBase) {
    const regular = path.join(base, "roboto-latin-400-normal.woff");
    const bold = path.join(base, "roboto-latin-700-normal.woff");
    if (fs.existsSync(regular) && fs.existsSync(bold)) {
      return { regular, bold };
    }
  }
  return null;
}

/**
 * Register Roboto fonts on the document if @fontsource/roboto is available.
 * Call once per document after creation.
 */
export function registerFonts(doc: InstanceType<typeof PDFDocument>): void {
  if (fontsChecked && !customFontsAvailable) return;
  if (fontsChecked && customFontsAvailable) {
    const paths = findFontPaths();
    if (paths) {
      try {
        const d = doc as unknown as {
          registerFont?: (name: string, fontPath: string) => void;
        };
        if (typeof d.registerFont === "function") {
          d.registerFont("Roboto", paths.regular);
          d.registerFont("Roboto-Bold", paths.bold);
        }
      } catch {
        // Ignore for subsequent docs
      }
    }
    return;
  }

  fontsChecked = true;
  const paths = findFontPaths();
  if (!paths) return;

  try {
    const d = doc as unknown as {
      registerFont?: (name: string, fontPath: string) => void;
    };
    if (typeof d.registerFont === "function") {
      d.registerFont("Roboto", paths.regular);
      d.registerFont("Roboto-Bold", paths.bold);
      customFontsAvailable = true;
    }
  } catch {
    customFontsAvailable = false;
  }
}

export function getFontRegular(): string {
  return customFontsAvailable ? "Roboto" : FONT_REGULAR;
}

export function getFontBold(): string {
  return customFontsAvailable ? "Roboto-Bold" : FONT_BOLD;
}
