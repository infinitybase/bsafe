#!/bin/bash

# Get the current version of the package.
current_version=$(jq -r '.version' package.json)

# Get the next version of the package.
next_version=$(echo $current_version | awk -F. '{print $1"."$2"."$3+1}')

# Update the version in the package.json file.
#jq --arg new_version "$next_version" '.version = $new_version' package.json > package.json.new
#mv package.json.new package.json

# echo "The version of the package has been updated to $next_version"
