# 🌱 Dados de Apresentação - SafeSite

Este documento explica como popular a aplicação com dados de demonstração para apresentações.

## 📋 O Que Será Criado

O script `seed-presentation-data.js` irá criar dados realistas para:

### 🏢 **4 Empresas**
- **Construções Silva & Filhos, Lda** (Tier 1 - Construção Civil)
- **Electromec - Instalações Eléctricas** (Tier 2)
- **HidroTec - Canalizações e AVAC** (Tier 2)
- **Acabamentos Premium, SA** (Tier 3)

### 👷 **17 Trabalhadores**
- 5 trabalhadores na Silva & Filhos (Encarregado, Pedreiro, Servente, Carpinteiro, Armador)
- 4 trabalhadores na Electromec (Electricista Chefe, 2 Electricistas, Ajudante)
- 4 trabalhadores na HidroTec (Canalizador Chefe, 2 Canalizadores, Ajudante)
- 4 trabalhadores na Acabamentos Premium (Pintor Chefe, 2 Pintores, Gesseiro)

Todos com:
- Dados pessoais completos (NIF, telefone, data nascimento)
- Documentação válida (CC, Apto Médico, Contrato)
- Datas de formação (EPI, Acolhimento, Formação Específica)
- Cartões de acesso atribuídos

### 🚜 **13 Equipamentos**
- **Silva & Filhos**: Escavadora, Dumper, Grua Torre, Betoneira
- **Electromec**: Plataforma Elevatória, Gerador, Andaime Móvel
- **HidroTec**: Máquina de Soldar, Compressor, Bomba de Água
- **Acabamentos Premium**: Máquina de Projetar, Lixadora, Compressor

Todos com:
- Marca, modelo, número de série
- Datas de manutenção (última e próxima)
- Ano de fabrico e potência sonora
- Estado operacional

### 📚 **6 Tipos de Formação**
- Segurança em Altura (24 meses)
- Trabalhos em Espaços Confinados (24 meses)
- Primeiros Socorros (36 meses)
- Operação de Máquinas Pesadas (60 meses)
- Segurança Eléctrica (24 meses)
- Segurança Geral em Obra (12 meses)

*Formações atribuídas aleatoriamente aos trabalhadores (1-3 por trabalhador)*

### 🚪 **7 Pontos de Acesso**
- Entrada Principal
- Saída de Emergência Norte
- Zona de Trabalho - Piso 1, 2, 3
- Ponto de Segurança - Refeitório
- Armazém de Materiais

### 📊 **50 Registos de Acesso**
- Distribuídos pelos últimos 30 dias
- Métodos variados: QR, NFC, Face Recognition
- 95% aprovados, 5% negados

### ⚠️ **6 Acidentes/Incidentes**
1. **Queda de Material em Altura** (Acidente - Severidade Média - Fechado)
2. **Corte Superficial em Mão** (Acidente - Severidade Baixa - Fechado)
3. **Quase Acidente - Escorregamento** (Near Miss - Severidade Baixa - Fechado)
4. **Exposição a Ruído Excessivo** (Incidente - Severidade Média - Em Investigação)
5. **Quase Acidente - Carga Suspensa** (Near Miss - Severidade Alta - Aberto)
6. **Entorse no Tornozelo** (Acidente - Severidade Média - Em Investigação)

---

## 🚀 Como Usar

### **Passo 1: Navegar para um Projeto**
Abra a aplicação e navegue para a página de um projeto existente.

### **Passo 2: Abrir a Consola do Browser**
Pressione **F12** para abrir as ferramentas de desenvolvimento.

### **Passo 3: Copiar e Executar o Script**
1. Abra o ficheiro `seed-presentation-data.js`
2. Copie todo o conteúdo
3. Cole na consola do browser (tab "Console")
4. Pressione **Enter**

### **Passo 4: Aguardar**
O script irá:
- Criar todos os dados automaticamente
- Mostrar o progresso na consola
- Recarregar a página automaticamente após 2 segundos

---

## ✅ Verificação

Após a execução, verifique:

- **Empresas**: Navegue para a página de Empresas
- **Trabalhadores**: Navegue para a página de Trabalhadores
- **Equipamentos**: Navegue para a página de Equipamentos
- **Formações**: Navegue para a página de Formações
- **Controlo de Acesso**: Navegue para a página de Controlo de Acesso
- **Acidentes**: Navegue para a página de Acidentes & Incidentes

---

## 🔄 Limpar Dados

Se precisar de limpar os dados e recomeçar, pode usar o script `complete-reset.js` existente.

---

## 📝 Notas

- Todos os dados são **fictícios** e criados para fins de demonstração
- Os NIFs, telefones e emails são **exemplos** e não correspondem a entidades reais
- As datas são calculadas dinamicamente com base na data atual
- Os dados são guardados no **localStorage** (Zustand store)

---

## 🎯 Ideal Para

- **Demonstrações** a clientes
- **Apresentações** comerciais
- **Testes** de funcionalidades
- **Screenshots** e vídeos promocionais
- **Formação** de utilizadores

---

**Criado para**: SafeSite - Sistema de Gestão de Segurança em Obra  
**Versão**: 1.0  
**Data**: Fevereiro 2026
