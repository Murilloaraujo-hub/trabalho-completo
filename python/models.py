"""
EPHYRA FINANCE — Modelos de Dados
Preparado para futura migração de LocalStorage para SQLite/MySQL.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List
from enum import Enum
import uuid


class TipoTransacao(str, Enum):
    RECEITA = "receita"
    DESPESA = "despesa"

class StatusMeta(str, Enum):
    ATIVA = "ativa"
    CONCLUIDA = "concluida"

class Prioridade(str, Enum):
    BAIXA = "baixa"
    MEDIA = "media"
    ALTA = "alta"


@dataclass
class Usuario:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    nome: str = ""
    email: str = ""
    senha_hash: str = ""
    foto_url: Optional[str] = None
    data_cadastro: str = field(default_factory=lambda: datetime.now().isoformat())
    salario_mensal: float = 0.0

@dataclass
class Categoria:
    id: str = ""
    nome: str = ""
    icone: str = ""
    tipo: str = "despesa"
    cor: str = "#64748b"

@dataclass
class Transacao:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    tipo: str = "receita"
    nome: str = ""
    categoria_id: str = ""
    valor: float = 0.0
    data: str = field(default_factory=lambda: datetime.now().isoformat())
    descricao: str = ""

@dataclass
class Meta:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    nome: str = ""
    descricao: str = ""
    valor_objetivo: float = 0.0
    valor_guardado: float = 0.0
    data_limite: Optional[str] = None
    cor: str = "#3b82f6"
    icone: str = "🎯"
    prioridade: str = "media"
    status: str = "ativa"
    data_criacao: str = field(default_factory=lambda: datetime.now().isoformat())

@dataclass
class Conquista:
    id: str = ""
    nome: str = ""
    descricao: str = ""
    xp: int = 0
    icone: str = "🏆"
    categoria: str = "iniciante"
    data: str = field(default_factory=lambda: datetime.now().isoformat())
    desbloqueada: bool = False

@dataclass
class EstadoApp:
    saldo: float = 0.0
    receitas: List[Transacao] = field(default_factory=list)
    despesas: List[Transacao] = field(default_factory=list)
    metas: List[Meta] = field(default_factory=list)
    historico: List[Transacao] = field(default_factory=list)
    conquistas: List[Conquista] = field(default_factory=list)
    categorias: List[Categoria] = field(default_factory=list)
    xp: int = 0
    nivel: int = 1
