# .gitignore Configuration for Polyshed Indexer

## Overview
Comprehensive `.gitignore` file for the Polyshed Indexer project, configured to exclude files and directories that should not be committed to version control.

## File Location
```
polyshed-indexer/.gitignore
```

## What's Ignored

### Dependencies
- `node_modules/` - All installed packages
- `package-lock.json` - NPM lock file
- `yarn.lock` - Yarn lock file
- `pnpm-lock.yaml` - pnpm lock file

### Environment Variables
- `.env` - Local environment variables
- `.env.local` - Local env overrides
- `.env.*.local` - Environment-specific local files
- `.env.production` - Production environment
- `.env.development` - Development environment

### Cloudflare Workers
- `.wrangler/` - Wrangler local state
- `wrangler-migrations/` - Migration files
- `dist/` - Built distribution

### Build Outputs
- `build/` - Build directory
- `out/` - Output directory
- `*.tsbuildinfo` - TypeScript build info

### IDE & Editors
- `.vscode/` - VS Code settings
- `.idea/` - JetBrains IDE
- `*.swp` - Vim swap files
- `*.swo` - Vim backup files
- `*~` - Editor backups
- `.DS_Store` - macOS metadata
- `.AppleDouble` - macOS resource forks
- `.LSOverride` - macOS metadata
- `*.sublime-project` - Sublime Text project
- `*.sublime-workspace` - Sublime Text workspace
- `.vim/` - Vim directory
- `.emacs.d/` - Emacs directory

### Testing
- `coverage/` - Test coverage reports
- `.nyc_output/` - NYC coverage output
- `*.lcov` - Coverage files
- `.mocha-timeout` - Mocha timeout

### Logs
- `logs/` - Log directory
- `*.log` - All log files
- `npm-debug.log*` - NPM debug logs
- `yarn-debug.log*` - Yarn debug logs
- `yarn-error.log*` - Yarn error logs
- `lerna-debug.log*` - Lerna debug logs
- `pnpm-debug.log*` - pnpm debug logs

### Temporary Files
- `tmp/` - Temporary directory
- `temp/` - Temp directory
- `*.tmp` - Temporary files

### Operating System
- `Thumbs.db` - Windows cache
- `.DS_Store` - macOS metadata
- `.Spotlight-V100` - macOS Spotlight
- `.Trashes` - macOS Trashes

### Editor Backups
- `*.bak` - Backup files
- `*.BAK` - Backup files (uppercase)
- `*~` - Backup files
- `*.orig` - Original files

### Database Files (Local Development)
- `*.db` - Database files
- `*.sqlite` - SQLite databases
- `*.sqlite3` - SQLite3 databases
- `local.db` - Local database

### Cache
- `.cache/` - Cache directory
- `dist-cache/` - Distribution cache

### Miscellaneous
- `.versionrc.json` - Version config
- `release.json` - Release info

## Usage

### Initial Setup
The `.gitignore` file is already created and ready to use. No additional configuration needed.

### Verify It's Working
```bash
# Check which files Git is ignoring
git check-ignore -v <filename>

# List all ignored files
git status --ignored
```

### Example: Check if node_modules is ignored
```bash
git check-ignore -v node_modules/
# Output: node_modules/   .gitignore:1
```

## Best Practices

### What NOT to Commit
- ❌ `.env` files with secrets
- ❌ `node_modules/` directory
- ❌ Build artifacts (`dist/`, `build/`)
- ❌ IDE-specific settings (`.vscode/`, `.idea/`)
- ❌ Log files
- ❌ OS-specific files

### What TO Commit
- ✅ Source code (`.js` files)
- ✅ Configuration files (`wrangler.toml`, `package.json`)
- ✅ Documentation (`.md` files)
- ✅ Database schema (`schema.sql`)
- ✅ `.gitignore` itself
- ✅ `.env.example` (without secrets)

## Creating Environment Template

To help team members, create a `.env.example` file:

```bash
# Create template
cp .env .env.example

# Remove actual values
# Edit .env.example with placeholder values
```

Example `.env.example`:
```toml
POLYMARKET_API_BASE = "https://clob.polymarket.com"
GAMMA_API_BASE = "https://gamma-api.polymarket.com"
MAX_WHALES_PER_UPDATE = "50"
BATCH_SIZE = "100"
RATE_LIMIT_MS = "100"
```

## Troubleshooting

### Already Committed Files
If files are already in Git history before adding `.gitignore`:

```bash
# Remove from tracking (but keep locally)
git rm --cached <filename>

# Or remove a directory
git rm --cached -r <directory>

# Commit the removal
git commit -m "Remove files from tracking"
```

### Force .gitignore Update
```bash
# Clear Git's file cache
git rm -r --cached .

# Re-add all files respecting .gitignore
git add .

# Commit changes
git commit -m "Respect .gitignore"
```

### Not Working?
```bash
# Check .gitignore syntax
git check-ignore -v .

# List ignored files
git ls-files --others --exclude-standard
```

## Security Notes

⚠️ **Important**: Never commit:
- API keys
- Database credentials
- Private keys
- Access tokens
- Passwords
- Sensitive configuration

Always use environment variables for secrets and add `.env` to `.gitignore`.

## Related Files

- **`.env.example`** - Template for environment variables (commit to repo)
- **`.env`** - Actual environment variables (never commit)
- **`wrangler.toml`** - Cloudflare config (commit to repo)

## Summary

The `.gitignore` file is configured to:
- ✅ Exclude dependencies and build artifacts
- ✅ Protect environment variables and secrets
- ✅ Ignore IDE and editor configurations
- ✅ Remove OS-specific files
- ✅ Clean up log and temporary files
- ✅ Follow Node.js/npm best practices

This ensures your Git repository remains clean and secure.

---

**File Size**: ~815 bytes
**Last Updated**: December 4, 2025
**Status**: Ready for use ✅
