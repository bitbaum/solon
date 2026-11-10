/** word-extractor ships no types: the part Solon uses, reading the text of a .doc or .docx. */
declare module "word-extractor" {
  interface WordDocument {
    getBody(): string;
  }
  export default class WordExtractor {
    extract(source: string | Buffer): Promise<WordDocument>;
  }
}
