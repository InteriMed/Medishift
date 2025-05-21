#!/bin/bash

# This script automates the process of committing and pushing changes
# in the main Git repository and all its submodules.
#
# Usage: ./git_push_all.sh "Your commit message"
# If no message is provided, a default message will be used.

# Get the commit message from the first argument, or use a default
COMMIT_MESSAGE="${1:-Automated commit via script}"

echo "--- Starting Git push automation ---"
echo "Commit Message: \"$COMMIT_MESSAGE\""
echo ""

# --- Step 1: Process the main repository ---
echo "Processing main repository..."

# Add all changes in the main repository
git add .

# Attempt to commit changes in the main repository
# If there are no changes, git commit will fail, so we check its success.
if git commit -m "$COMMIT_MESSAGE (main project)"; then
    echo "Main project changes committed."
else
    echo "No new changes in main project to commit. Continuing..."
fi

# Get the current branch of the main repository
MAIN_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Push the main repository changes to its remote
echo "Pushing main project to origin/$MAIN_BRANCH..."
if git push origin "$MAIN_BRANCH"; then
    echo "Main project pushed successfully."
else
    echo "Failed to push main project. Please resolve conflicts or issues manually."
    exit 1 # Exit script if main push fails
fi

echo ""

# --- Step 2: Iterate through and process each submodule ---
echo "Processing submodules..."

# Use git submodule status --recursive to get a list of all submodules
# and then loop through them.
# The 'while read -r line' loop processes each line of the output.
git submodule status --recursive | while read -r line; do
    # Extract the submodule path from the status line.
    # The path is typically the second word in the output (e.g., " 1234567890abcdef submodule_path (branch_name)")
    SUBMODULE_PATH=$(echo "$line" | awk '{print $2}')

    # Skip if the path is empty (e.g., blank lines or unexpected format)
    if [ -z "$SUBMODULE_PATH" ]; then
        continue
    fi

    echo "Entering submodule: $SUBMODULE_PATH"

    # Use a subshell (parentheses) to change directory for the submodule
    # This ensures that 'cd ..' is not needed and the script returns to the main dir automatically.
    # The '|| { ...; exit 1; }' handles errors if cd fails.
    (
        cd "$SUBMODULE_PATH" || { echo "Error: Could not enter $SUBMODULE_PATH. Skipping this submodule."; exit 0; } # Exit subshell, continue main loop

        # Add all changes within the submodule
        git add .

        # Attempt to commit changes in the submodule
        if git commit -m "$COMMIT_MESSAGE (submodule: $SUBMODULE_PATH)"; then
            echo "Changes committed in submodule: $SUBMODULE_PATH"
        else
            echo "No new changes in submodule $SUBMODULE_PATH to commit. Skipping push for this submodule."
            exit 0 # Exit subshell, continue main loop
        fi

        # Get the current branch of the submodule
        SUBMODULE_BRANCH=$(git rev-parse --abbrev-ref HEAD)

        # Check if the submodule is in a detached HEAD state
        if [ "$SUBMODULE_BRANCH" = "HEAD" ]; then
            echo "Submodule $SUBMODULE_PATH is in a detached HEAD state. Attempting to push current commit."
            CURRENT_COMMIT=$(git rev-parse HEAD)
            REMOTE_NAME=$(git remote | head -n 1) # Get the first remote name (usually 'origin')

            if [ -n "$REMOTE_NAME" ]; then
                # Push the current detached HEAD commit to the remote's HEAD
                if git push "$REMOTE_NAME" "$CURRENT_COMMIT:HEAD"; then
                     echo "Pushed detached HEAD commit for submodule: $SUBMODULE_PATH"
                else
                     echo "Failed to push detached HEAD for submodule $SUBMODULE_PATH. Please resolve manually."
                     exit 1 # Exit subshell if push fails
                fi
            else
                echo "No remote found for submodule $SUBMODULE_PATH. Skipping push."
            fi
        else
            # Push the submodule's changes to its remote branch
            echo "Pushing submodule $SUBMODULE_PATH to origin/$SUBMODULE_BRANCH..."
            if git push origin "$SUBMODULE_BRANCH"; then
                echo "Pushed submodule: $SUBMODULE_PATH"
            else
                echo "Failed to push submodule $SUBMODULE_PATH. Please resolve manually."
                exit 1 # Exit subshell if push fails
            fi
        fi
    ) || { echo "An error occurred while processing submodule $SUBMODULE_PATH. Aborting script."; exit 1; }
    echo ""
done

# --- Step 3: Commit and push the updated submodule references in the main repository ---
echo "Updating submodule references in main repository..."

# Add all changes again, specifically to pick up the updated submodule references
git add .

# Commit the updated submodule references
if git commit -m "$COMMIT_MESSAGE (updated submodule references)"; then
    echo "Submodule references committed in main project."
else
    echo "No new submodule reference changes to commit in main project. Continuing..."
fi

# Push the main repository again with the updated submodule references
echo "Pushing main project (with submodule reference updates) to origin/$MAIN_BRANCH..."
if git push origin "$MAIN_BRANCH"; then
    echo "Main project (with submodule reference updates) pushed successfully."
else
    echo "Failed to push main project (with submodule reference updates). Please resolve manually."
    exit 1 # Exit script if final push fails
fi

echo "--- Git push automation finished successfully! ---"
