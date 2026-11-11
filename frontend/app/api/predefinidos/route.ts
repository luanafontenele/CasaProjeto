import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const EXT_IMAGEM = ['.png', '.jpeg', '.jpg', '.webp', '.svg'];
const EXT_AUDIO = ['.mp3', '.wav', '.m4a', '.ogg'];

// Remove acentos para busca flexível
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function encontrarArquivo(diretorios: string[], slugs: string[], extensoes: string[]): { existe: boolean; caminhoWeb: string | null; arquivoLocal: string | null } {
  for (const dir of diretorios) {
    if (!fs.existsSync(dir)) continue;
    try {
      const arquivos = fs.readdirSync(dir);
      for (const slug of slugs) {
        const slugNorm = normalizar(slug);
        for (const ext of extensoes) {
          const match = arquivos.find((arq) => {
            const semExt = path.parse(arq).name;
            const arqExt = path.parse(arq).ext.toLowerCase();
            return (normalizar(semExt) === slugNorm || semExt.toLowerCase() === slug.toLowerCase()) && extensoes.includes(arqExt);
          });

          if (match) {
            const caminhoCompleto = path.join(dir, match);
            const normPath = caminhoCompleto.replace(/\\/g, '/');
            const publicIdx = normPath.lastIndexOf('/public/');
            let caminhoWeb = '';
            if (publicIdx !== -1) {
              caminhoWeb = normPath.substring(publicIdx + '/public'.length);
            } else {
              caminhoWeb = `/predefinidos/${match}`;
            }
            return { existe: true, caminhoWeb, arquivoLocal: caminhoCompleto };
          }
        }
      }
    } catch (e) {
      console.error('Erro ao ler diretório de predefinidos:', e);
    }
  }
  return { existe: false, caminhoWeb: null, arquivoLocal: null };
}

export async function GET() {
  const publicDir = path.join(process.cwd(), 'frontend', 'public', 'predefinidos');
  const fallbackPublicDir = path.join(process.cwd(), 'public', 'predefinidos');
  const baseDir = fs.existsSync(publicDir) ? publicDir : fallbackPublicDir;

  const dirsImagens = [
    path.join(baseDir, 'imagens'),
    baseDir
  ];

  const dirsAudios = [
    path.join(baseDir, 'audios'),
    baseDir
  ];

  const CATEGORIAS_CONFIG = [
    { id: 'casa', nome: 'Casa', slugs: ['casa'] },
    { id: 'desejos', nome: 'Desejos', slugs: ['desejos', 'desejo'] },
    { id: 'emocoes', nome: 'Emoções', slugs: ['emocoes', 'emoções', 'emocao', 'emoção'] }
  ];

  const ACOES_CONFIG: Record<string, { id: string; nome: string; slugs: string[] }[]> = {
    casa: [
      { id: 'banheiro', nome: 'Banheiro', slugs: ['banheiro'] },
      { id: 'cozinha', nome: 'Cozinha', slugs: ['cozinha'] },
      { id: 'lavanderia', nome: 'Lavanderia', slugs: ['lavanderia'] },
      { id: 'sala', nome: 'Sala', slugs: ['sala'] },
      { id: 'quarto', nome: 'Quarto', slugs: ['quarto'] }
    ],
    desejos: [
      { id: 'festa', nome: 'Festa', slugs: ['festa'] },
      { id: 'ler', nome: 'Ler', slugs: ['ler'] },
      { id: 'musica', nome: 'Música', slugs: ['musica', 'música'] },
      { id: 'silencio', nome: 'Silêncio', slugs: ['silencio', 'silêncio'] },
      { id: 'ajuda', nome: 'Ajuda', slugs: ['ajuda'] }
    ],
    emocoes: [
      { id: 'feliz', nome: 'Feliz', slugs: ['feliz'] },
      { id: 'medo', nome: 'Medo', slugs: ['medo'] },
      { id: 'nojo', nome: 'Nojo', slugs: ['nojo'] },
      { id: 'raiva', nome: 'Raiva', slugs: ['raiva'] },
      { id: 'triste', nome: 'Triste', slugs: ['triste'] }
    ]
  };

  const resultadoCategorias: Record<string, any> = {};
  for (const cat of CATEGORIAS_CONFIG) {
    const img = encontrarArquivo(dirsImagens, cat.slugs, EXT_IMAGEM);
    const aud = encontrarArquivo(dirsAudios, cat.slugs, EXT_AUDIO);
    const audFem = encontrarArquivo(dirsAudios, cat.slugs.map((s) => `${s}_feminino`), EXT_AUDIO);
    const audMasc = encontrarArquivo(dirsAudios, cat.slugs.map((s) => `${s}_masculino`), EXT_AUDIO);
    const pronto = img.existe && (aud.existe || audFem.existe);

    resultadoCategorias[cat.id] = {
      id: cat.id,
      nome: cat.nome,
      pronto,
      imagem: img.caminhoWeb,
      audio: aud.caminhoWeb || audFem.caminhoWeb,
      audioFeminino: audFem.caminhoWeb || aud.caminhoWeb,
      audioMasculino: audMasc.caminhoWeb || aud.caminhoWeb,
      temImagem: img.existe,
      temAudio: aud.existe || audFem.existe
    };
  }

  const resultadoAcoes: Record<string, Record<string, any>> = {};
  for (const [catId, acoes] of Object.entries(ACOES_CONFIG)) {
    resultadoAcoes[catId] = {};
    for (const acao of acoes) {
      const img = encontrarArquivo(dirsImagens, acao.slugs, EXT_IMAGEM);
      const aud = encontrarArquivo(dirsAudios, acao.slugs, EXT_AUDIO);
      const audFem = encontrarArquivo(dirsAudios, acao.slugs.map((s) => `${s}_feminino`), EXT_AUDIO);
      const audMasc = encontrarArquivo(dirsAudios, acao.slugs.map((s) => `${s}_masculino`), EXT_AUDIO);
      const pronto = img.existe && (aud.existe || audFem.existe);

      resultadoAcoes[catId][acao.id] = {
        id: acao.id,
        nome: acao.nome,
        categoriaId: catId,
        pronto,
        imagem: img.caminhoWeb,
        audio: aud.caminhoWeb || audFem.caminhoWeb,
        audioFeminino: audFem.caminhoWeb || aud.caminhoWeb,
        audioMasculino: audMasc.caminhoWeb || aud.caminhoWeb,
        temImagem: img.existe,
        temAudio: aud.existe || audFem.existe
      };
    }
  }

  return NextResponse.json({
    diretorioBase: baseDir,
    categorias: resultadoCategorias,
    acoes: resultadoAcoes
  });
}
