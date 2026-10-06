import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfig(
  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**', '**/src-tauri/target/**', '**/src-tauri/gen/**']),
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: ['**/*.{ts,mts,tsx,vue}'] })),
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'], ecmaFeatures: { jsx: true } },
    },
  },
  skipFormatting,
  {
    files: ['**/*.{ts,mts,tsx,vue}'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
)
