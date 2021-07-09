export interface PreviewServiceAPI {
  /**
   * Get a file entity from its id
   *
   * @param mime
   * @param inputPath
   * @param outputPath
   */
  get(
    mime: string,
    inputPath: string,
    outputPath: string,
    numberOfPages: number
  ): any;
}
