// Linter disabled repo-wide. Without this file, eslint's flat config resolution
// walks up to ~/eslint.config.js (a global fallback config outside this repo)
// and applies its rules (no-unused-vars, prefer-const, etc.) to every .ts file here.
// This file sits closer to the source, so it takes precedence and turns that off.
//
// import js from '@eslint/js'
// import tseslint from 'typescript-eslint'
// export default tseslint.config(js.configs.recommended, tseslint.configs.recommended)

export default [];
