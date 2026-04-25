/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: {
    '/api/generate-interactive-page': [
      // Hoisted pdfjs-dist (our dynamic import + worker)
      './node_modules/pdfjs-dist/legacy/build/pdf.mjs',
      './node_modules/pdfjs-dist/legacy/build/pdf.min.mjs',
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs',
      './node_modules/pdfjs-dist/wasm/**/*.wasm',
      './node_modules/pdfjs-dist/standard_fonts/**/*',
      './node_modules/pdfjs-dist/cmaps/**/*',
      // External `pdf-parse` resolves `pdfjs-dist` from its nested node_modules; standalone
      // otherwise copies only workers and breaks `import()` from pdf-parse.
      './node_modules/.pnpm/pdf-parse@*/node_modules/pdfjs-dist/legacy/build/pdf.mjs',
      './node_modules/.pnpm/pdf-parse@*/node_modules/pdfjs-dist/legacy/build/pdf.min.mjs',
    ],
  },
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
