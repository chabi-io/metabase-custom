#!/bin/bash

# Extended Date Picker Deployment Script
# Applies the extended date picker feature to any Metabase version

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Feature details
FEATURE_TAG="extended-date-picker-v1.0"
# Note: Only cherry-pick the feature code commits (4), not the doc/script commit
FEATURE_COMMITS=(
    "934e051af0"  # Add extended fiscal calendar date picker
    "8ea1640bb6"  # Fix type issues
    "158bc78c2e"  # Register widget
    "b25db2534d"  # Add parameter type
)

print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  Extended Date Picker Deployment${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

usage() {
    echo "Usage: $0 <metabase-version> [options]"
    echo ""
    echo "Arguments:"
    echo "  metabase-version    Metabase version tag (e.g., v0.56.15.1)"
    echo ""
    echo "Options:"
    echo "  --skip-validation   Skip build validation step"
    echo "  --force            Force branch creation even if it exists"
    echo "  --push             Push branch to origin after creation"
    echo "  --dry-run          Show what would be done without making changes"
    echo ""
    echo "Examples:"
    echo "  $0 v0.56.15.1"
    echo "  $0 v0.56.15.1 --push"
    echo "  $0 v0.57.0 --skip-validation --force"
    exit 1
}

# Parse arguments
if [ $# -lt 1 ]; then
    usage
fi

METABASE_VERSION="$1"
shift

SKIP_VALIDATION=false
FORCE=false
PUSH=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --push)
            PUSH=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            ;;
    esac
done

CUSTOM_BRANCH="${METABASE_VERSION}-custom"

print_header

# Validate we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a git repository"
    exit 1
fi

print_info "Target Version: $METABASE_VERSION"
print_info "Custom Branch: $CUSTOM_BRANCH"
print_info "Feature Tag: $FEATURE_TAG"
echo ""

# Step 1: Fetch latest tags
print_info "Step 1/6: Fetching latest tags from upstream..."
if [ "$DRY_RUN" = false ]; then
    if git remote get-url upstream > /dev/null 2>&1; then
        git fetch upstream --tags --quiet
        print_success "Fetched upstream tags"
    else
        print_warning "No upstream remote found, using origin"
        git fetch origin --tags --quiet
        print_success "Fetched origin tags"
    fi
else
    print_info "[DRY RUN] Would fetch tags from upstream/origin"
fi

# Step 2: Verify Metabase version exists
print_info "Step 2/6: Verifying Metabase version exists..."
if ! git rev-parse "$METABASE_VERSION" > /dev/null 2>&1; then
    print_error "Metabase version $METABASE_VERSION not found"
    print_info "Available recent versions:"
    git tag -l "v0.56*" | sort -V | tail -10
    exit 1
fi
print_success "Version $METABASE_VERSION exists"

# Step 3: Create custom branch
print_info "Step 3/6: Creating custom branch..."

# Check if branch already exists
if git show-ref --verify --quiet refs/heads/"$CUSTOM_BRANCH"; then
    if [ "$FORCE" = true ]; then
        print_warning "Branch $CUSTOM_BRANCH already exists, force deleting..."
        if [ "$DRY_RUN" = false ]; then
            git branch -D "$CUSTOM_BRANCH"
            print_success "Deleted existing branch"
        else
            print_info "[DRY RUN] Would delete branch $CUSTOM_BRANCH"
        fi
    else
        print_error "Branch $CUSTOM_BRANCH already exists. Use --force to overwrite"
        exit 1
    fi
fi

if [ "$DRY_RUN" = false ]; then
    git checkout -b "$CUSTOM_BRANCH" "$METABASE_VERSION"
    print_success "Created branch $CUSTOM_BRANCH from $METABASE_VERSION"
else
    print_info "[DRY RUN] Would create branch $CUSTOM_BRANCH from $METABASE_VERSION"
fi

# Step 4: Cherry-pick feature commits
print_info "Step 4/6: Applying extended date picker feature..."

if [ "$DRY_RUN" = false ]; then
    # Try cherry-picking all commits at once
    if git cherry-pick "${FEATURE_COMMITS[@]}" 2>&1; then
        print_success "Applied all 4 feature commits successfully"
    else
        print_error "Cherry-pick failed. Conflicts need manual resolution."
        print_info "Conflicted files:"
        git status --short | grep "^UU"
        print_info ""
        print_info "Resolution steps:"
        print_info "1. Resolve conflicts in the files above"
        print_info "2. git add <resolved-files>"
        print_info "3. git cherry-pick --continue"
        print_info "4. Repeat until all commits are applied"
        print_info "5. Then run validation: yarn type-check && yarn build"
        exit 1
    fi
else
    print_info "[DRY RUN] Would cherry-pick commits:"
    for commit in "${FEATURE_COMMITS[@]}"; do
        COMMIT_MSG=$(git log --format=%s -n 1 "$commit" 2>/dev/null || echo "commit not found")
        print_info "  - $commit: $COMMIT_MSG"
    done
fi

# Step 5: Validate build (optional)
if [ "$SKIP_VALIDATION" = false ]; then
    print_info "Step 5/6: Validating build..."

    if [ "$DRY_RUN" = false ]; then
        print_info "Running type check..."
        if yarn type-check 2>&1 | tail -20; then
            print_success "Type check passed"
        else
            print_warning "Type check failed, but continuing..."
        fi

        print_info "Running build..."
        if yarn build 2>&1 | tail -20; then
            print_success "Build passed"
        else
            print_error "Build failed"
            print_info "Fix build errors and try again"
            exit 1
        fi
    else
        print_info "[DRY RUN] Would run: yarn type-check && yarn build"
    fi
else
    print_warning "Skipping validation (--skip-validation flag set)"
fi

# Step 6: Push (optional)
if [ "$PUSH" = true ]; then
    print_info "Step 6/6: Pushing to origin..."

    if [ "$DRY_RUN" = false ]; then
        git push origin "$CUSTOM_BRANCH"
        print_success "Pushed $CUSTOM_BRANCH to origin"
    else
        print_info "[DRY RUN] Would push $CUSTOM_BRANCH to origin"
    fi
else
    print_info "Step 6/6: Skipping push (use --push to enable)"
fi

echo ""
print_success "Deployment complete!"
echo ""
print_info "Summary:"
print_info "  Branch: $CUSTOM_BRANCH"
print_info "  Base: $METABASE_VERSION"
print_info "  Feature: $FEATURE_TAG (4 commits)"
echo ""
print_info "Next steps:"
if [ "$PUSH" = false ] && [ "$DRY_RUN" = false ]; then
    print_info "  1. Test the feature in the application"
    print_info "  2. Push branch: git push origin $CUSTOM_BRANCH"
    print_info "  3. Build Docker image: docker build -t your-registry/metabase-custom:$METABASE_VERSION ."
elif [ "$DRY_RUN" = false ]; then
    print_info "  1. Test the feature in the application"
    print_info "  2. Build Docker image: docker build -t your-registry/metabase-custom:$METABASE_VERSION ."
else
    print_info "  Run without --dry-run to actually apply changes"
fi
echo ""
