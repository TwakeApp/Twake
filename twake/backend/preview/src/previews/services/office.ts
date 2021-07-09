const unoconv = require("unoconv-promise");

export async function convertFromOffice(
  inputPath: string,
  outputPath: string,
  numberOfPages: number
) {
  await unoconv.run({
    file: inputPath,
    output: outputPath,
    export: `PageRange=1-${numberOfPages}`,
  });
}
