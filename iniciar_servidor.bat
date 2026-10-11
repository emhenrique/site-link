@echo off
cd /d "%~dp0"
echo Verificando ambiente para iniciar o servidor...

where python >nul 2>nul
if %errorlevel% equ 0 (
    echo Iniciando servidor com Python...
    python server.py
    goto fim
)

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo Iniciando servidor com Node.js...
    node server.js
    goto fim
)

echo [ERRO] Nem o Python nem o Node.js foram encontrados no seu computador.
echo Por favor, instale o Python ou o Node.js para rodar o servidor local.
:fim
pause
