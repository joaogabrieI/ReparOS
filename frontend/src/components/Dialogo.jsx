import { useEffect, useRef, useState } from 'react'

const FOCAVEIS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focaveis(caixa) {
  return [...caixa.querySelectorAll(FOCAVEIS)].filter((el) => el.offsetParent !== null || el === document.activeElement)
}

// Janela de diálogo acessível (NBR 17225 / WCAG 2.1.2, 2.4.3 e 4.1.2), usada por todos os diálogos do sistema:
// - role="dialog" e aria-modal, com o título ligado por aria-labelledby (tituloId);
// - ao abrir, o foco entra no diálogo (campo com autoFocus, primeiro campo ou primeiro botão);
// - Tab e Shift+Tab ficam presos dentro do diálogo;
// - Esc fecha; clicar no fundo escuro também;
// - ao fechar, o foco volta para o botão que abriu o diálogo (ou para o conteúdo principal, se ele sumiu).
// `as="form"` faz da caixa o próprio formulário (onSubmit e os demais atributos são repassados).
export default function Dialogo({ tituloId, descricaoId, onFechar, as: Caixa = 'div', style, children, ...resto }) {
  const ref = useRef(null)
  const fechar = useRef(onFechar)
  // Quem tinha o foco ao abrir, lido no primeiro render (antes do autoFocus dos campos).
  const [anterior] = useState(() => document.activeElement)

  useEffect(() => {
    fechar.current = onFechar
  })

  useEffect(() => {
    const caixa = ref.current
    if (!caixa.contains(document.activeElement)) {
      const alvo =
        caixa.querySelector('[autofocus]') ??
        focaveis(caixa).find((el) => el.matches('input, select, textarea')) ??
        caixa.querySelector('.dialog-actions button:not([disabled])') ??
        caixa
      alvo.focus()
    }
    return () => {
      // Depois do fechamento o React pode ter trocado a tela; só volta para o que ainda existe.
      requestAnimationFrame(() => {
        if (caixa.isConnected) return
        const destino = anterior && document.body.contains(anterior) ? anterior : document.getElementById('conteudo')
        destino?.focus({ preventScroll: true })
      })
    }
  }, [anterior])

  // Teclado ouvido na janela (fase de captura): funciona mesmo se o foco cair fora do diálogo,
  // por exemplo quando o botão Salvar fica desabilitado enquanto envia.
  useEffect(() => {
    function tecla(e) {
      const caixa = ref.current
      if (e.key === 'Escape') {
        // Não deixa o Esc chegar ao Layout (que fecharia a gaveta do menu).
        e.stopPropagation()
        fechar.current()
        return
      }
      if (e.key !== 'Tab') return
      const itens = focaveis(caixa)
      if (!itens.length) {
        e.preventDefault()
        caixa.focus()
        return
      }
      const primeiro = itens[0]
      const ultimo = itens.at(-1)
      const atual = document.activeElement
      if (!caixa.contains(atual)) {
        e.preventDefault()
        ;(e.shiftKey ? ultimo : primeiro).focus()
      } else if (e.shiftKey && (atual === primeiro || atual === caixa)) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && atual === ultimo) {
        e.preventDefault()
        primeiro.focus()
      }
    }
    window.addEventListener('keydown', tecla, true)
    return () => window.removeEventListener('keydown', tecla, true)
  }, [])

  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && fechar.current()}>
      <Caixa
        ref={ref}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descricaoId}
        tabIndex={-1}
        style={{ maxWidth: '100%', ...style }}
        {...resto}
      >
        {children}
      </Caixa>
    </div>
  )
}
