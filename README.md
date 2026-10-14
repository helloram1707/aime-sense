# AIME Machine Health source bundle

This ZIP is a portable pnpm workspace containing the AIME Android app and the workspace configuration it needs. It excludes node_modules, caches, Replit secrets, and unrelated apps.

After extraction, run `pnpm install` from this directory. Start with `artifacts/aime-machine-health/README.md` for setup, tests, Android prebuild, APK build, CSV format, and verified limitations. The standalone workspace generates its own pnpm lockfile on first install.
