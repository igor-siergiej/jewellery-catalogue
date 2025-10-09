#!/bin/bash
# Clean up local tags that don't exist on remote
# This prevents conflicts during semantic-release

echo "🧹 Cleaning up orphaned local tags..."

# Get all local tags
local_tags=$(git tag -l)

# Get all remote tags
remote_tags=$(git ls-remote --tags origin | awk '{print $2}' | sed 's/refs\/tags\///')

# Find and delete tags that exist locally but not on remote
for tag in $local_tags; do
    if ! echo "$remote_tags" | grep -q "^${tag}$"; then
        echo "  Deleting orphaned local tag: $tag"
        git tag -d "$tag" 2>/dev/null || true
    fi
done

echo "✅ Tag cleanup complete"
