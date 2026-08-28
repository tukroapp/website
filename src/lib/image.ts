const MAX_DIMENSION = 1920;
const QUALITY = 0.82;

/**
 * Redimensiona e reencoda em WebP antes do upload, pra gastar menos storage sem perder
 * muita qualidade visual. GIF sai intocado (perderia a animação no canvas). Se a
 * compressão falhar ou não render um arquivo menor, o original segue como está.
 */
export async function compressImage(file: File): Promise<File> {
    if (file.type === "image/gif") return file;

    try {
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
        const width = Math.round(bitmap.width * scale);
        const height = Math.round(bitmap.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return file;

        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/webp", QUALITY),
        );
        // Safari antigo ignora "image/webp" e devolve PNG: aí o original serve melhor
        // e evita um arquivo `.webp` que na verdade é PNG.
        if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;

        const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
        return new File([blob], name, { type: blob.type });
    } catch {
        return file;
    }
}
