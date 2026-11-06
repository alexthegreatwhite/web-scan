@echo off
title Paris Store Scan Web - Update Catalog
cd /d "%~dp0"

echo ==========================================================
echo   Mise a jour du catalogue depuis le serveur Paris Store
echo   Source : \\192.168.10.251 (WMS + ACKB Caisse)
echo ==========================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\build-catalog-server.ps1"

echo.
echo ==========================================================
echo   Mise a jour terminee.
echo ==========================================================
pause