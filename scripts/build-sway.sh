#!/bin/bash

# Caminho para o diretório com o package.json
DIR="packages/sway"

# Remove o diretório dist
rm -rf "$DIR/dist"

# Acessa o diretório
cd "$DIR"

# Instala dependencias
yarn install

# Executa o comando do package.json
yarn run build:sway