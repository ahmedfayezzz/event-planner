declare module "bidi-js" {
  interface EmbeddingLevels {
    levels: Uint8Array;
    paragraphs: Array<{ start: number; end: number; level: number }>;
  }

  interface Bidi {
    getEmbeddingLevels(
      text: string,
      direction?: "ltr" | "rtl" | "auto"
    ): EmbeddingLevels;
    getReorderedString(text: string, embeddingLevels: EmbeddingLevels): string;
    getMirroredCharacter(char: string): string | null;
    getMirroredCharactersMap(
      text: string,
      embeddingLevels: EmbeddingLevels
    ): Map<number, string>;
  }

  export default function bidiFactory(): Bidi;
}
