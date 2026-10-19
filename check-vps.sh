#!/bin/bash
# SafeSite — Verificação do ambiente VPS PTISP
# Executa este script no servidor via SSH:
#   ssh utilizador@IP_DO_VPS
#   bash check-vps.sh

echo "======================================"
echo " SafeSite — Verificação VPS"
echo "======================================"
echo ""

# Node.js
echo "1. Node.js:"
node --version 2>/dev/null && echo "   ✅ Node.js instalado" || echo "   ❌ Node.js NÃO encontrado"
echo ""

# npm
echo "2. npm:"
npm --version 2>/dev/null && echo "   ✅ npm instalado" || echo "   ❌ npm NÃO encontrado"
echo ""

# PM2
echo "3. PM2:"
pm2 --version 2>/dev/null && echo "   ✅ PM2 instalado" || echo "   ❌ PM2 NÃO instalado (instalar com: npm install -g pm2)"
echo ""

# Nginx
echo "4. Nginx:"
nginx -v 2>/dev/null && echo "   ✅ Nginx instalado" || echo "   ❌ Nginx NÃO encontrado"
systemctl is-active nginx 2>/dev/null | grep -q "active" && echo "   ✅ Nginx em execução" || echo "   ⚠️  Nginx instalado mas não activo"
echo ""

# PostgreSQL
echo "5. PostgreSQL:"
psql --version 2>/dev/null && echo "   ✅ PostgreSQL client instalado" || echo "   ❌ PostgreSQL NÃO encontrado"
systemctl is-active postgresql 2>/dev/null | grep -q "active" && echo "   ✅ PostgreSQL em execução" || echo "   ⚠️  PostgreSQL instalado mas não activo"
echo ""

# Verificar se DB existe
echo "6. Base de dados 'safesite_db':"
sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw safesite_db && echo "   ✅ DB 'safesite_db' já existe" || echo "   ⚠️  DB 'safesite_db' NÃO existe (será criada)"
echo ""

# Certbot / SSL
echo "7. SSL / Certbot:"
certbot --version 2>/dev/null && echo "   ✅ Certbot instalado" || echo "   ⚠️  Certbot NÃO instalado (precisas para HTTPS)"
echo ""

# Git
echo "8. Git:"
git --version 2>/dev/null && echo "   ✅ Git instalado" || echo "   ❌ Git NÃO instalado (instalar com: apt install git)"
echo ""

# Espaço em disco
echo "9. Espaço em disco:"
df -h / | tail -1
echo ""

# Memória RAM
echo "10. Memória RAM:"
free -h | head -2
echo ""

echo "======================================"
echo " Verificação concluída"
echo "======================================"
