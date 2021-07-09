import sharp from "sharp";

export function generatePreview(inputPath: string, outputPath: string) {
  sharp(inputPath)
    .resize(300, 200)
    .toFile(`${outputPath}.png`, function (err) {});
}
