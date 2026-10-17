// Marca do app: coração com o "M" de batimento (ver docs/marca.md).
// SVG inline para herdar nitidez em qualquer tamanho; cada instância recebe um id de gradiente próprio.

let brandSeq=0;

export function brandMarkView({size=40,className="brand-mark",decorative=true}={}){
  const id=`mt-grad-${++brandSeq}`;
  return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 48 48" ${decorative?'aria-hidden="true"':'role="img" aria-label="Meu Treino"'}>
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1f6b3a"/><stop offset="1" stop-color="#34a853"/></linearGradient></defs>
    <rect width="48" height="48" rx="13" fill="url(#${id})"/>
    <path class="brand-heart" d="M24 38.5 11.6 26.4a8.6 8.6 0 0 1 12.4-11.9 8.6 8.6 0 0 1 12.4 11.9Z" fill="#b6f1bb"/>
    <path class="brand-pulse" d="M7.5 25h5.5l3.4-8.5 7.6 15 7.6-15 3.4 8.5h5.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
