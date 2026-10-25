// Primeira mensagem de erro de um campo, como a API devolve na validação (422).
export default function ErroCampo({ erros }) {
  if (!erros?.length) return null
  return (
    <div className="erro-campo">
      <i className="ph ph-warning-circle" />
      {erros[0]}
    </div>
  )
}
