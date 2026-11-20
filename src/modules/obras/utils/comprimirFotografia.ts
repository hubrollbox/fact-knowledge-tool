const MAX_DIMENSAO = 1920;
const QUALIDADE_JPEG = 0.8;

export async function comprimirFotografia(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('O ficheiro tem de ser uma imagem.');
  if (file.size <= 700 * 1024) return file;
  if (typeof document === 'undefined') return file;

  try {
    const imagem = await createImageBitmap(file);
    const escala = Math.min(1, MAX_DIMENSAO / Math.max(imagem.width, imagem.height));
    if (escala === 1 && file.size <= 2 * 1024 * 1024) {
      imagem.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(imagem.width * escala));
    canvas.height = Math.max(1, Math.round(imagem.height * escala));
    const contexto = canvas.getContext('2d');
    if (!contexto) {
      imagem.close();
      return file;
    }
    contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
    imagem.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALIDADE_JPEG),
    );
    if (!blob) return file;

    const nome = file.name.replace(/\.[^.]+$/, '') || 'fotografia';
    return new File([blob], `${nome}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } catch {
    // Se o browser não conseguir descodificar a imagem, conserva-se o original.
    return file;
  }
}
