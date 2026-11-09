<?php

namespace App\Models;

use App\Enums\SituacaoOrcamento;
use App\Enums\StatusOrdemServico;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Orcamento extends Model
{
    use HasFactory;

    protected $fillable = [
        'ordem_servico_id',
        'valor_total',
        'prazo_dias',
        'prazo_entrega',
        'situacao',
        'validade_dias',
        'validade_ate',
        'data_envio',
        'data_resposta',
        'canal_resposta',
        'codigo_resposta',
    ];

    // O código só sai no link do WhatsApp; nenhuma resposta da API o devolve.
    protected $hidden = ['codigo_resposta'];

    /**
     * Canais em que o cliente pode responder ao orçamento.
     */
    public const CANAIS = ['whatsapp', 'telefone', 'presencial'];

    /**
     * Canal gravado quando o próprio cliente responde pela tela de acompanhamento (link do WhatsApp).
     */
    public const CANAL_LINK = 'link';

    protected $appends = ['vencido'];

    protected function casts(): array
    {
        return [
            'valor_total' => 'decimal:2',
            'prazo_dias' => 'integer',
            'prazo_entrega' => 'date',
            'situacao' => SituacaoOrcamento::class,
            'validade_dias' => 'integer',
            'validade_ate' => 'date',
            'data_envio' => 'datetime',
            'data_resposta' => 'datetime',
        ];
    }

    /**
     * Recalcula o valor total a partir dos itens.
     */
    public function recalcularTotal(): void
    {
        $this->valor_total = $this->itens()->sum(DB::raw('quantidade * valor_unitario'));
        $this->save();
    }

    /**
     * Orçamento enviado, ainda sem resposta e com a validade já passada (CDC art. 40, §1º).
     */
    public function getVencidoAttribute(): bool
    {
        return $this->situacao === SituacaoOrcamento::Pendente
            && $this->validade_ate !== null
            && $this->validade_ate->lt(today());
    }

    /**
     * Itens e valores só mudam antes do envio: depois disso, o cliente já tem o orçamento em mãos.
     */
    public function editavel(): bool
    {
        return $this->data_envio === null;
    }

    /**
     * Grava a resposta do cliente e avança a OS um passo, com o histórico, na mesma transação (RF12).
     * Aprovado: "Em reparo", e o prazo vira data contando dias úteis. Recusado: "Orçamento recusado".
     * O código do link deixa de valer: cada orçamento só recebe uma resposta.
     */
    public function registrarResposta(bool $aprovado, string $canal, string $observacao): void
    {
        DB::transaction(function () use ($aprovado, $canal, $observacao) {
            $this->ordemServico->mudarStatus(
                $aprovado ? StatusOrdemServico::EmReparo : StatusOrdemServico::OrcamentoRecusado,
                $observacao,
            );
            $this->update([
                'situacao' => $aprovado ? SituacaoOrcamento::Aprovado : SituacaoOrcamento::Recusado,
                'data_resposta' => now(),
                'canal_resposta' => $canal,
                'prazo_entrega' => $aprovado ? today()->addWeekdays($this->prazo_dias) : null,
                'codigo_resposta' => null,
            ]);
        });
    }

    /**
     * Confere o código do link em tempo constante, para a comparação não vazar pistas.
     */
    public function codigoConfere(?string $codigo): bool
    {
        return $this->codigo_resposta !== null && is_string($codigo) && hash_equals($this->codigo_resposta, $codigo);
    }

    public function ordemServico(): BelongsTo
    {
        return $this->belongsTo(OrdemServico::class);
    }

    public function itens(): HasMany
    {
        return $this->hasMany(ItemOrcamento::class);
    }
}
