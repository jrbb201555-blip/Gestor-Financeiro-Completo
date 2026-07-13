import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from database import FinanceDatabase
import plotly.graph_objects as go
import plotly.express as px
from dateutil.relativedelta import relativedelta

# Configuração da página
st.set_page_config(
    page_title="ControlFin",
    page_icon="💰",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Inicializar banco de dados
db = FinanceDatabase()

# CSS personalizado para melhorar a aparência
st.markdown("""
    <style>
    /* Estilo geral */
    [data-testid="stSidebar"] {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    [data-testid="stSidebar"] [data-testid="stMarkdownContainer"] {
        color: white;
    }
    
    /* Cards de resumo */
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
        border-radius: 10px;
        color: white;
        text-align: center;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .metric-card-green {
        background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
    }
    
    .metric-card-red {
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
    }
    
    .metric-card-blue {
        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    }
    
    .metric-card-purple {
        background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
    }
    
    .metric-value {
        font-size: 32px;
        font-weight: bold;
        margin: 10px 0;
    }
    
    .metric-label {
        font-size: 14px;
        opacity: 0.9;
    }
    
    .metric-variation {
        font-size: 12px;
        margin-top: 8px;
    }
    
    /* Títulos */
    h1, h2 {
        color: #2c3e50;
    }
    
    /* Tabelas */
    .dataframe {
        border-radius: 10px;
    }
    </style>
""", unsafe_allow_html=True)

# ===== SIDEBAR =====
with st.sidebar:
    st.markdown("""
    <div style="text-align: center; padding: 20px 0;">
        <h1 style="color: white; font-size: 32px; margin: 0;">💰 ControlFin</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 5px 0;">Seu Controle Financeiro</p>
    </div>
    """, unsafe_allow_html=True)
    
    st.markdown("---")
    
    # Menu de navegação
    pagina = st.radio(
        "Menu",
        ["Dashboard", "Transações", "A Pagar", "A Receber", "Fluxo de Caixa", "Contas", "Categorias"],
        label_visibility="collapsed"
    )
    
    st.markdown("---")
    st.markdown("<p style='color: white; font-size: 12px; text-align: center;'>© 2026 ControlFin<br>Seu Assistente Financeiro</p>", unsafe_allow_html=True)

# ===== FUNÇÕES AUXILIARES =====

def formatar_moeda(valor):
    """Formata um valor como moeda brasileira."""
    return f"R$ {valor:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")

def criar_card_metrica(titulo, valor, variacao=None, tipo="neutro"):
    """Cria um card de métrica com estilo."""
    if tipo == "receita":
        classe = "metric-card metric-card-green"
    elif tipo == "despesa":
        classe = "metric-card metric-card-red"
    elif tipo == "saldo":
        classe = "metric-card metric-card-blue"
    elif tipo == "total":
        classe = "metric-card metric-card-purple"
    else:
        classe = "metric-card"
    
    variacao_html = ""
    if variacao is not None:
        cor = "green" if variacao >= 0 else "red"
        sinal = "+" if variacao >= 0 else ""
        variacao_html = f"<div class='metric-variation' style='color: {cor};'>{sinal}{variacao:.1f}% vs. mês anterior</div>"
    
    return f"""
    <div class="{classe}">
        <div class="metric-label">{titulo}</div>
        <div class="metric-value">{valor}</div>
        {variacao_html}
    </div>
    """

# ===== PÁGINA: DASHBOARD =====

if pagina == "Dashboard":
    st.title("📊 Dashboard")
    st.markdown("**Bem-vindo(a) ao seu resumo financeiro.**")
    
    # Filtros
    col1, col2 = st.columns(2)
    
    with col1:
        mes_atual = datetime.now().month
        mes_selecionado = st.selectbox(
            "Mês",
            range(1, 13),
            format_func=lambda x: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][x-1],
            index=mes_atual-1
        )
    
    with col2:
        ano_atual = datetime.now().year
        ano_selecionado = st.selectbox(
            "Ano",
            range(2020, ano_atual + 2),
            index=ano_atual - 2020
        )
    
    st.markdown("---")
    
    # Cálculos
    receitas = db.obter_receitas_totais(mes_selecionado, ano_selecionado)
    despesas = db.obter_despesas_totais(mes_selecionado, ano_selecionado)
    saldo_mes = receitas - despesas
    saldo_total = db.obter_saldo_total()
    
    # Cálculo de variação
    mes_anterior = mes_selecionado - 1 if mes_selecionado > 1 else 12
    ano_anterior = ano_selecionado if mes_selecionado > 1 else ano_selecionado - 1
    
    receitas_anterior = db.obter_receitas_totais(mes_anterior, ano_anterior)
    despesas_anterior = db.obter_despesas_totais(mes_anterior, ano_anterior)
    
    variacao_receitas = db.calcular_variacao_percentual(receitas, receitas_anterior)
    variacao_despesas = db.calcular_variacao_percentual(despesas, despesas_anterior)
    
    # Cards de resumo
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.markdown(criar_card_metrica("Receitas", formatar_moeda(receitas), variacao_receitas, "receita"), unsafe_allow_html=True)
    
    with col2:
        st.markdown(criar_card_metrica("Despesas", formatar_moeda(despesas), variacao_despesas, "despesa"), unsafe_allow_html=True)
    
    with col3:
        st.markdown(criar_card_metrica("Saldo do Mês", formatar_moeda(saldo_mes), None, "saldo"), unsafe_allow_html=True)
    
    with col4:
        st.markdown(criar_card_metrica("Saldo em Contas", formatar_moeda(saldo_total), None, "total"), unsafe_allow_html=True)
    
    st.markdown("---")
    
    # Gráficos
    transacoes = db.obter_transacoes(mes_selecionado, ano_selecionado)
    
    if transacoes:
        df_transacoes = pd.DataFrame(transacoes)
        
        col1, col2 = st.columns(2)
        
        # Gráfico de Receitas vs Despesas
        with col1:
            st.subheader("💹 Receitas vs Despesas")
            
            categoria_counts = df_transacoes.groupby(['tipo', 'categoria'])['valor'].sum().reset_index()
            fig = px.bar(
                categoria_counts,
                x='categoria',
                y='valor',
                color='tipo',
                color_discrete_map={'Receita': '#2ecc71', 'Despesa': '#e74c3c'},
                title="Detalhamento por Categoria"
            )
            st.plotly_chart(fig, use_container_width=True)
        
        # Gráfico de composição
        with col2:
            st.subheader("🥧 Composição do Mês")
            
            resumo = pd.DataFrame({
                'Tipo': ['Receitas', 'Despesas'],
                'Valor': [receitas, despesas]
            })
            
            fig = px.pie(
                resumo,
                values='Valor',
                names='Tipo',
                color_discrete_map={'Receitas': '#2ecc71', 'Despesas': '#e74c3c'},
                title="Proporção de Receitas e Despesas"
            )
            st.plotly_chart(fig, use_container_width=True)
        
        # Tabela de últimas transações
        st.subheader("📋 Últimas Transações")
        
        df_display = df_transacoes[['id', 'data', 'tipo', 'categoria', 'valor', 'descricao']].copy()
        df_display['valor'] = df_display['valor'].apply(formatar_moeda)
        df_display = df_display.rename(columns={
            'id': 'ID',
            'data': 'Data',
            'tipo': 'Tipo',
            'categoria': 'Categoria',
            'valor': 'Valor',
            'descricao': 'Descrição'
        })
        
        st.dataframe(df_display, use_container_width=True, hide_index=True)
    else:
        st.info("Nenhuma transação registrada para este período. Comece adicionando transações na aba 'Transações'.")

# ===== PÁGINA: TRANSAÇÕES =====

elif pagina == "Transações":
    st.title("💳 Transações")
    
    # Abas
    tab1, tab2 = st.tabs(["➕ Nova Transação", "📜 Histórico"])
    
    # ABA 1: NOVA TRANSAÇÃO
    with tab1:
        st.subheader("Adicionar Nova Transação")
        
        col1, col2 = st.columns(2)
        
        with col1:
            tipo_transacao = st.selectbox(
                "Tipo de Transação",
                ["Receita", "Despesa"]
            )
        
        with col2:
            valor = st.number_input("Valor (R$)", min_value=0.01, step=0.01)
        
        # Obter categorias baseado no tipo
        categorias = db.obter_categorias(tipo_transacao)
        categorias_nomes = [cat['nome'] for cat in categorias]
        
        col1, col2 = st.columns(2)
        
        with col1:
            categoria = st.selectbox("Categoria", categorias_nomes)
        
        with col2:
            data = st.date_input("Data", datetime.now())
        
        descricao = st.text_area("Descrição (opcional)", "")
        
        if st.button("✅ Adicionar Transação", use_container_width=True):
            if valor > 0 and categoria:
                if db.adicionar_transacao(
                    tipo_transacao,
                    valor,
                    categoria,
                    data.isoformat(),
                    descricao
                ):
                    st.success("✅ Transação adicionada com sucesso!")
                    st.rerun()
                else:
                    st.error("❌ Erro ao adicionar transação.")
            else:
                st.warning("⚠️ Preencha todos os campos obrigatórios.")
    
    # ABA 2: HISTÓRICO
    with tab2:
        st.subheader("Histórico de Transações")
        
        # Filtros
        col1, col2 = st.columns(2)
        
        with col1:
            mes_filtro = st.selectbox(
                "Filtrar por Mês",
                range(1, 13),
                format_func=lambda x: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][x-1],
                index=datetime.now().month - 1,
                key="mes_historico"
            )
        
        with col2:
            ano_filtro = st.selectbox(
                "Filtrar por Ano",
                range(2020, datetime.now().year + 2),
                index=datetime.now().year - 2020,
                key="ano_historico"
            )
        
        transacoes = db.obter_transacoes(mes_filtro, ano_filtro)
        
        if transacoes:
            # Criar DataFrame com cores para tipo
            df_display = pd.DataFrame(transacoes)
            df_display['valor'] = df_display['valor'].apply(formatar_moeda)
            df_display = df_display[['id', 'data', 'tipo', 'categoria', 'valor', 'descricao']]
            df_display = df_display.rename(columns={
                'id': 'ID',
                'data': 'Data',
                'tipo': 'Tipo',
                'categoria': 'Categoria',
                'valor': 'Valor',
                'descricao': 'Descrição'
            })
            
            st.dataframe(df_display, use_container_width=True, hide_index=True)
            
            st.markdown("---")
            st.subheader("⚙️ Gerenciar Transações")
            
            col1, col2 = st.columns(2)
            
            with col1:
                transacao_id = st.selectbox(
                    "Selecione uma transação para editar/deletar",
                    [t['id'] for t in transacoes],
                    format_func=lambda x: f"ID {x} - {next((t['data'] + ' - ' + t['categoria'] for t in transacoes if t['id'] == x), 'Não encontrada')}"
                )
            
            with col2:
                acao = st.selectbox("Ação", ["Selecionar", "Editar", "Deletar"])
            
            if acao == "Editar":
                transacao = db.obter_transacao_por_id(transacao_id)
                
                if transacao:
                    st.markdown("**Editando Transação:**")
                    
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        novo_tipo = st.selectbox(
                            "Tipo",
                            ["Receita", "Despesa"],
                            index=0 if transacao['tipo'] == 'Receita' else 1,
                            key="edit_tipo"
                        )
                    
                    with col2:
                        novo_valor = st.number_input(
                            "Valor (R$)",
                            value=transacao['valor'],
                            min_value=0.01,
                            step=0.01,
                            key="edit_valor"
                        )
                    
                    categorias = db.obter_categorias(novo_tipo)
                    categorias_nomes = [cat['nome'] for cat in categorias]
                    
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        nova_categoria = st.selectbox(
                            "Categoria",
                            categorias_nomes,
                            index=categorias_nomes.index(transacao['categoria']) if transacao['categoria'] in categorias_nomes else 0,
                            key="edit_categoria"
                        )
                    
                    with col2:
                        nova_data = st.date_input(
                            "Data",
                            datetime.fromisoformat(transacao['data']),
                            key="edit_data"
                        )
                    
                    nova_descricao = st.text_area(
                        "Descrição",
                        value=transacao['descricao'] or "",
                        key="edit_descricao"
                    )
                    
                    if st.button("✅ Salvar Alterações", use_container_width=True):
                        if db.atualizar_transacao(
                            transacao_id,
                            novo_tipo,
                            novo_valor,
                            nova_categoria,
                            nova_data.isoformat(),
                            nova_descricao
                        ):
                            st.success("✅ Transação atualizada com sucesso!")
                            st.rerun()
                        else:
                            st.error("❌ Erro ao atualizar transação.")
            
            elif acao == "Deletar":
                transacao = db.obter_transacao_por_id(transacao_id)
                
                if transacao:
                    st.warning(f"⚠️ Tem certeza que deseja deletar a transação de {transacao['data']} - {transacao['categoria']}?")
                    
                    if st.button("🗑️ Deletar Transação", use_container_width=True):
                        if db.deletar_transacao(transacao_id):
                            st.success("✅ Transação deletada com sucesso!")
                            st.rerun()
                        else:
                            st.error("❌ Erro ao deletar transação.")
        else:
            st.info("Nenhuma transação registrada para este período.")

# ===== PÁGINA: A PAGAR =====

elif pagina == "A Pagar":
    st.title("📤 A Pagar")
    st.info("Esta seção será implementada em breve para rastrear suas despesas futuras.")

# ===== PÁGINA: A RECEBER =====

elif pagina == "A Receber":
    st.title("📥 A Receber")
    st.info("Esta seção será implementada em breve para rastrear suas receitas futuras.")

# ===== PÁGINA: FLUXO DE CAIXA =====

elif pagina == "Fluxo de Caixa":
    st.title("📈 Fluxo de Caixa")
    
    transacoes_todos = db.obter_transacoes()
    
    if transacoes_todos:
        df = pd.DataFrame(transacoes_todos)
        df['data'] = pd.to_datetime(df['data'])
        df = df.sort_values('data')
        
        # Agrupar por mês
        df['ano_mes'] = df['data'].dt.to_period('M')
        
        fluxo = df.groupby(['ano_mes', 'tipo'])['valor'].sum().reset_index()
        fluxo['ano_mes'] = fluxo['ano_mes'].astype(str)
        
        # Criar gráfico
        fig = px.bar(
            fluxo,
            x='ano_mes',
            y='valor',
            color='tipo',
            color_discrete_map={'Receita': '#2ecc71', 'Despesa': '#e74c3c'},
            title="Fluxo de Caixa - Receitas vs Despesas",
            labels={'ano_mes': 'Período', 'valor': 'Valor (R$)', 'tipo': 'Tipo'}
        )
        
        st.plotly_chart(fig, use_container_width=True)
        
        # Tabela de fluxo
        st.subheader("Detalhamento por Período")
        
        fluxo_pivot = df.groupby(['ano_mes', 'tipo'])['valor'].sum().unstack(fill_value=0)
        fluxo_pivot['Saldo'] = fluxo_pivot.get('Receita', 0) - fluxo_pivot.get('Despesa', 0)
        
        st.dataframe(fluxo_pivot, use_container_width=True)
    else:
        st.info("Nenhuma transação registrada ainda.")

# ===== PÁGINA: CONTAS =====

elif pagina == "Contas":
    st.title("🏦 Contas")
    
    tab1, tab2 = st.tabs(["➕ Nova Conta", "📋 Minhas Contas"])
    
    with tab1:
        st.subheader("Adicionar Nova Conta")
        
        col1, col2 = st.columns(2)
        
        with col1:
            nome_conta = st.text_input("Nome da Conta")
        
        with col2:
            tipo_conta = st.selectbox("Tipo", ["Conta Corrente", "Poupança", "Dinheiro", "Outro"])
        
        saldo_inicial = st.number_input("Saldo Inicial (R$)", min_value=0.0, step=0.01)
        
        if st.button("✅ Adicionar Conta", use_container_width=True):
            if nome_conta:
                if db.adicionar_conta(nome_conta, saldo_inicial, tipo_conta):
                    st.success("✅ Conta adicionada com sucesso!")
                    st.rerun()
                else:
                    st.error("❌ Erro ao adicionar conta (nome já existe?).")
            else:
                st.warning("⚠️ Digite o nome da conta.")
    
    with tab2:
        st.subheader("Minhas Contas")
        
        contas = db.obter_contas()
        
        if contas:
            for i, conta in enumerate(contas):
                col1, col2, col3 = st.columns([2, 1, 1])
                
                with col1:
                    st.markdown(f"**{conta['nome']}** ({conta['tipo']})")
                
                with col2:
                    st.write(f"Saldo: {formatar_moeda(conta['saldo_inicial'])}")
                
                with col3:
                    if st.button("🗑️ Deletar", key=f"delete_conta_{conta['id']}", use_container_width=True):
                        if db.deletar_conta(conta['id']):
                            st.success("✅ Conta deletada!")
                            st.rerun()
                        else:
                            st.error("❌ Erro ao deletar conta.")
        else:
            st.info("Nenhuma conta cadastrada.")

# ===== PÁGINA: CATEGORIAS =====

elif pagina == "Categorias":
    st.title("🏷️ Categorias")
    
    tab1, tab2 = st.tabs(["➕ Nova Categoria", "📋 Minhas Categorias"])
    
    with tab1:
        st.subheader("Adicionar Nova Categoria")
        
        col1, col2 = st.columns(2)
        
        with col1:
            nome_categoria = st.text_input("Nome da Categoria")
        
        with col2:
            tipo_categoria = st.selectbox("Tipo", ["Receita", "Despesa"])
        
        if st.button("✅ Adicionar Categoria", use_container_width=True):
            if nome_categoria:
                if db.adicionar_categoria(nome_categoria, tipo_categoria):
                    st.success("✅ Categoria adicionada com sucesso!")
                    st.rerun()
                else:
                    st.error("❌ Erro ao adicionar categoria (já existe?).")
            else:
                st.warning("⚠️ Digite o nome da categoria.")
    
    with tab2:
        st.subheader("Minhas Categorias")
        
        tipo_filtro = st.selectbox("Filtrar por tipo", ["Todas", "Receita", "Despesa"])
        
        if tipo_filtro == "Todas":
            categorias = db.obter_categorias()
        else:
            categorias = db.obter_categorias(tipo_filtro)
        
        if categorias:
            for categoria in categorias:
                col1, col2, col3 = st.columns([2, 1, 1])
                
                with col1:
                    badge_color = "#2ecc71" if categoria['tipo'] == 'Receita' else "#e74c3c"
                    st.markdown(f"**{categoria['nome']}** <span style='background-color: {badge_color}; color: white; padding: 2px 8px; border-radius: 5px; font-size: 12px;'>{categoria['tipo']}</span>", unsafe_allow_html=True)
                
                with col3:
                    if st.button("🗑️ Deletar", key=f"delete_cat_{categoria['id']}", use_container_width=True):
                        if db.deletar_categoria(categoria['id']):
                            st.success("✅ Categoria deletada!")
                            st.rerun()
                        else:
                            st.error("❌ Erro ao deletar categoria.")
        else:
            st.info("Nenhuma categoria neste tipo.")
