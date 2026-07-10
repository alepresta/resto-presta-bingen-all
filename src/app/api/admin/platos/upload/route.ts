import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

const BUCKET = 'platos';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

// POST: Subir una imagen de plato desde el dispositivo del usuario
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Formato de subida inválido' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
  }

  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return NextResponse.json(
      { error: 'Tipo de archivo no permitido. Usá JPG, PNG, WEBP, GIF o AVIF.' },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'La imagen supera el máximo de 5 MB' }, { status: 400 });
  }

  // Asegurar que el bucket exista (público) — idempotente
  const { data: buckets } = await supabase.storage.listBuckets();
  const existe = (buckets || []).some((b) => b.name === BUCKET);
  if (!existe) {
    const { error: errorBucket } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
    });
    if (errorBucket && !/already exists/i.test(errorBucket.message)) {
      return NextResponse.json({ error: errorBucket.message }, { status: 500 });
    }
  }

  const ext = (file.name.split('.').pop() || file.type.split('/').pop() || 'jpg')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const nombreArchivo = `${crypto.randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error: errorUpload } = await supabase.storage
    .from(BUCKET)
    .upload(nombreArchivo, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (errorUpload) {
    return NextResponse.json({ error: errorUpload.message }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(nombreArchivo);

  return NextResponse.json({ url: data.publicUrl });
}
