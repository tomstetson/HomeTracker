declare module 'heic-convert' {
  interface HeicConvertOptions {
    buffer: ArrayBuffer | Buffer;
    format: 'JPEG' | 'PNG';
    quality?: number;
  }

  function heicConvert(options: HeicConvertOptions): Promise<ArrayBuffer>;

  export = heicConvert;
}


