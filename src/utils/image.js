// Prepara a foto da ficha para enviar à IA: corrige a orientação, reduz para no máximo
// 1600 px no maior lado e comprime em JPEG. Uma foto de 4–12 MB do celular vira ~200–500 KB.

const MAX_SIDE = 1600;
const QUALITY = 0.85;

function loadImage(file) {
  // createImageBitmap respeita a orientação EXIF (foto "deitada" do celular) nos navegadores atuais.
  if ("createImageBitmap" in window) {
    return createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => loadWithElement(file));
  }
  return loadWithElement(file);
}

function loadWithElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível abrir esta imagem.")); };
    img.src = url;
  });
}

// Retorna { mimeType, data (base64 sem prefixo), preview (data URL para a miniatura) }.
export async function prepareSheetImage(file) {
  if (!file || !/^image\//.test(file.type || "image/")) throw new Error("Escolha um arquivo de imagem.");
  const source = await loadImage(file);
  const width = source.width, height = source.height;
  if (!width || !height) throw new Error("Não foi possível ler esta imagem.");
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // PNG com transparência vira fundo branco, como o papel
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close?.();
  const preview = canvas.toDataURL("image/jpeg", QUALITY);
  return { mimeType: "image/jpeg", data: preview.slice(preview.indexOf(",") + 1), preview };
}
