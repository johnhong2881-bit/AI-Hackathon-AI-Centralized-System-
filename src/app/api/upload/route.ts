import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ACCEPTED_EXTS = ['.pdf', '.docx'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || lowerName.endsWith('.docx');

    if (!isPdf && !isDocx) {
      return NextResponse.json({ error: 'Only PDF or DOCX files are supported' }, { status: 400 });
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 20 MB.' }, { status: 400 });
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let text = '';
    let pageCount = 0;
    const fileType = isPdf ? 'pdf' : 'docx';

    if (isPdf) {
      // Extract text using pdf-parse v2 API
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: new Uint8Array(bytes) });

      try {
        const textResult = await parser.getText();
        text = textResult.text || '';
        pageCount = textResult.total || 0;
      } finally {
        await parser.destroy();
      }
    } else {
      // Extract text from DOCX using mammoth
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || '';
      // mammoth doesn't give page count, estimate from word count
      pageCount = Math.max(1, Math.ceil(text.split(/\s+/).length / 300));
    }

    if (!text.trim()) {
      return NextResponse.json({
        error: `No text found in this ${fileType.toUpperCase()} file. It may be a scanned image. Please paste the text instead.`,
        fileName: file.name,
        fileSize: file.size,
      }, { status: 422 });
    }

    return NextResponse.json({
      text: text.trim(),
      fileName: file.name,
      fileSize: file.size,
      pageCount,
      fileType,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to parse file: ${message}` }, { status: 500 });
  }
}
