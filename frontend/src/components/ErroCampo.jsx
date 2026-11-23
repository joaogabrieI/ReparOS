import { useId, useLayoutEffect, useRef } from 'react'

const CONTROLES = 'input:not([type="hidden"]), select, textarea'

// Acha o campo a que o erro se refere: o indicado em `para` (id), o único campo do mesmo .field
// ou o único campo do elemento logo antes da mensagem.
function acharControle(mensagem, para) {
  if (para) return document.getElementById(para)
  for (const lugar of [mensagem.closest('.field'), mensagem.previousElementSibling]) {
    if (!lugar) continue
    if (lugar.matches(CONTROLES)) return lugar
    const achados = lugar.querySelectorAll(CONTROLES)
    if (achados.length === 1) return achados[0]
  }
  return null
}

// Primeira mensagem de erro de um campo, como a API devolve na validação (422).
// Acessibilidade (NBR 17225 / WCAG 3.3.1 e 4.1.2): o campo recebe aria-invalid e aria-describedby
// apontando para a mensagem, então o leitor de tela lê o erro junto com o rótulo.
// Erro sem campo (erro geral do formulário) vira role="alert" e é anunciado assim que aparece.
export default function ErroCampo({ erros, para }) {
  const id = useId()
  const ref = useRef(null)
  const texto = erros?.length ? erros[0] : null

  useLayoutEffect(() => {
    const mensagem = ref.current
    if (!mensagem) return undefined
    const controle = acharControle(mensagem, para)
    if (!controle) {
      mensagem.setAttribute('role', 'alert')
      return undefined
    }
    mensagem.removeAttribute('role')
    const descricoes = (controle.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean)
    controle.setAttribute('aria-invalid', 'true')
    controle.setAttribute('aria-describedby', [...descricoes.filter((d) => d !== id), id].join(' '))
    return () => {
      controle.removeAttribute('aria-invalid')
      const restantes = (controle.getAttribute('aria-describedby') ?? '').split(' ').filter((d) => d && d !== id)
      if (restantes.length) controle.setAttribute('aria-describedby', restantes.join(' '))
      else controle.removeAttribute('aria-describedby')
    }
  }, [texto, para, id])

  if (!texto) return null
  return (
    <div ref={ref} id={id} className="erro-campo">
      <i className="ph ph-warning-circle" aria-hidden="true" />
      {texto}
    </div>
  )
}
