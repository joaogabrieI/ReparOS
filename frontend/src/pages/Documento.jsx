import { useEffect } from 'react'
import { Marca } from '../components/AcessoLayout'
import { POLITICA_PRIVACIDADE, TERMOS_USO, VIGENCIA } from '../data/termos'

const DOCUMENTOS = { termos: TERMOS_USO, privacidade: POLITICA_PRIVACIDADE }

// Texto de um dos documentos, usado na página pública e na tela de aceite.
export function TextoDocumento({ tipo, nivel = 1 }) {
  const doc = DOCUMENTOS[tipo]
  const Titulo = `h${nivel}`
  const Secao = `h${nivel + 1}`

  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 14, lineHeight: 1.6 }}>
      <header>
        <Titulo style={{ margin: 0, fontSize: nivel === 1 ? 28 : 20, fontWeight: 500, letterSpacing: '-0.02em' }}>{doc.titulo}</Titulo>
        <div className="pagina-subtitulo" style={{ marginTop: 4 }}>
          Versão {doc.versao} · em vigor desde {VIGENCIA}
        </div>
      </header>
      <p style={{ margin: 0, color: 'var(--color-neutral-300)' }}>{doc.introducao}</p>
      {doc.secoes.map((s) => (
        <section key={s.titulo} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Secao style={{ margin: '8px 0 0', fontSize: 15, fontWeight: 600 }}>{s.titulo}</Secao>
          {s.paragrafos?.map((p) => (
            <p key={p} style={{ margin: 0, color: 'var(--color-neutral-300)' }}>
              {p}
            </p>
          ))}
          {s.itens && (
            <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--color-neutral-300)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {s.itens.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  )
}

// Página pública dos Termos de uso (#/termos) ou da Política de privacidade (#/privacidade), sem login.
export default function Documento({ tipo }) {
  const outro = tipo === 'termos' ? 'privacidade' : 'termos'

  useEffect(() => {
    document.title = `${DOCUMENTOS[tipo].titulo} · ReparOS`
    window.scrollTo(0, 0)
  }, [tipo])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 16px 64px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Marca />
          <a href={`#/${outro}`} style={{ fontSize: 13.5 }}>
            {DOCUMENTOS[outro].titulo}
          </a>
        </div>
        <main className="painel" style={{ padding: 28 }}>
          <TextoDocumento tipo={tipo} />
        </main>
        <div style={{ fontSize: 13.5, color: 'var(--color-neutral-400)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <a href="#/cadastro">Criar conta</a>
          <a href="#/entrar">Entrar</a>
          <a href="#/acompanhar">Acompanhar um reparo</a>
        </div>
      </div>
    </div>
  )
}
