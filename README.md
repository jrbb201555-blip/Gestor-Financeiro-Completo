# ControlFin - Sistema de Controle Financeiro Pessoal

## 📊 Sobre o Projeto

**ControlFin** é uma aplicação web completa de controle financeiro pessoal construída com Python e Streamlit. Oferece uma interface moderna, limpa e profissional para gerenciar suas transações, contas e fluxo de caixa.

## ✨ Características Principais

### 1. **Dashboard Inteligente** 📈
- Visualização em tempo real de receitas e despesas
- Comparação com mês anterior (variação percentual)
- Cards informativos com saldos totais
- Gráficos interativos (receitas vs despesas, composição do mês)
- Últimas transações em destaque

### 2. **Gerenciamento de Transações** 💳
- Adicionar novas transações (Receita ou Despesa)
- Categorizar por tipo
- Editar transações existentes
- Deletar registros
- Histórico filtrado por mês e ano

### 3. **Gestão de Contas** 🏦
- Criar múltiplas contas (Conta Corrente, Poupança, Dinheiro, etc.)
- Definir saldo inicial
- Visualizar saldo total
- Deletar contas quando necess��rio

### 4. **Categorias Customizáveis** 🏷️
- Categorias predefinidas para receitas e despesas
- Criar novas categorias personalizadas
- Filtrar por tipo (Receita/Despesa)
- Deletar categorias quando necessário

### 5. **Fluxo de Caixa** 📊
- Visualizar fluxo histórico de receitas e despesas
- Gráficos mensais interativos
- Análise de saldo acumulado por período

### 6. **Menu Lateral Intuitivo** 🎯
- Navegação em um clique
- Design profissional com gradiente
- Seções para "A Pagar" e "A Receber" (prontas para expansão)

## 🗄️ Banco de Dados

O projeto utiliza **SQLite** para persistência de dados local:

- **Tabela de Transações**: Armazena todas as receitas e despesas
- **Tabela de Contas**: Gerencia suas contas bancárias e de poupança
- **Tabela de Categorias**: Organiza receitas e despesas por categoria
- **Tabela de Configurações**: Armazena preferências do usuário

Os dados são salvos localmente e persistem entre sessões.

## 🚀 Como Executar

### 1. Instalar Dependências
```bash
pip install -r requirements.txt
```

### 2. Executar a Aplicação
```bash
streamlit run app.py
```

A aplicação abrirá em seu navegador padrão em `http://localhost:8501`

## 📁 Estrutura de Arquivos

```
ControlFin/
├── app.py              # Aplicação principal Streamlit
├── database.py         # Módulo de banco de dados SQLite
├── requirements.txt    # Dependências do projeto
├── controlfin.db       # Banco de dados (criado automaticamente)
└── README.md          # Este arquivo
```

## 🎨 Design e Estilo

- **Paleta de Cores Moderna**: Gradientes profissionais em roxo, verde, vermelho e azul
- **Interface Responsiva**: Funciona perfeitamente em desktops e tablets
- **Componentes Visuais**: Cards elegantes, gráficos interativos, tabelas bem formatadas
- **Ícones Amigáveis**: Emojis que melhoram a experiência do usuário

## 💡 Categorias Predefinidas

### Receitas
- 💰 Salário
- 🎯 Freelance
- 📈 Investimentos
- 🎁 Outros Rendimentos

### Despesas
- 🍽️ Alimentação
- 🚗 Transporte
- 🏠 Moradia
- 🏥 Saúde
- 📚 Educação
- 🎮 Lazer
- 💡 Utilidades
- 📦 Outros

## 🔐 Segurança

Os dados são armazenados localmente no seu dispositivo. Nenhuma informação é enviada para servidores externos.

## 📱 Compatibilidade

- Python 3.8+
- Streamlit 1.28.1+
- Funciona em Windows, macOS e Linux

## 🛠️ Melhorias Futuras

- [ ] Autenticação de usuários
- [ ] Backup automático na nuvem
- [ ] Planejamento de orçamento
- [ ] Metas financeiras
- [ ] Relatórios avançados em PDF
- [ ] Sincronização entre dispositivos
- [ ] Alertas de gastos

## 📞 Suporte

Para dúvidas ou sugestões sobre o ControlFin, verifique a seção de issues do repositório.

## 📄 Licença

Este projeto é fornecido "como está" para fins educacionais e pessoais.

---

**ControlFin** - Seu Assistente Financeiro 💰
