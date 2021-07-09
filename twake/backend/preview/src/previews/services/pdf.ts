import { PDFImage } from "pdf-image";

export async function convertFromPdf(inputPath: string, outputPath: string) {
  var pdfImage = new PDFImage(inputPath);
  const imagePath = await pdfImage.convertFile();
}
