@echo off
chcp 65001 >nul
title Paris Store Scan Web - Push GitHub
cd /d "%~dp0"

echo ========================================================
echo   Paris Store Scan Web - Préparation du Push GitHub
echo ========================================================
echo.

where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Git n'est pas installé ou n'est pas dans votre variable PATH.
    echo Installez Git depuis https://git-scm.com/download/win ou glissez les fichiers modifiés directement sur GitHub.
    echo.
    pause
    exit /b 1
)

if not exist ".git" (
    echo Initialisation du dépôt Git local...
    git init
    git branch -M main
)

echo Ajout des fichiers modifiés...
git add .

echo Création du commit...
git commit -m "Mise à jour majeure : décodage codes étiquettes 88 / 337914, ITF-14, mode gâchette, PWA offline et catalogue WMS actualisé"

echo.
echo ========================================================
echo Si vous avez déjà lié un dépôt distant, tapez :
echo   git push origin main
echo.
echo Sinon, associez votre dépôt GitHub avec la commande :
echo   git remote add origin https://github.com/VOTRE_COMPTE/VOTRE_DEPOT.git
echo   git push -u origin main
echo ========================================================
echo.
pause