#!/bin/bash

# Caminho para o diretório com o package.json
DIR="src/library/sway/"

# Remove o diretório dist
rm -rf "$DIR/dist"

# Acessa o diretório
cd "$DIR"

# Instala dependencias
pnpm install

# Executa o comando do package.json
pnpm run build:sway
