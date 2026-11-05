@echo off
title Paris Store - Scan Web (Vite Dev Server)
cd /d "%~dp0"
echo ==========================================================
echo Démarrage du serveur Paris Store Scan Web...
echo ==========================================================
npm run dev -- --host
pause
