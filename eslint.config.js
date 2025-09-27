import { allowDefaultProjectGlobs,typescriptConfig } from "@alanscodelog/eslint-config"
import { defineConfig } from "eslint/config"
export default defineConfig([
	// https://github.com/AlansCodeLog/eslint-config
	{
		extends: [ typescriptConfig ],
	},
	{
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: allowDefaultProjectGlobs,
					// defaultProject: "./tsconfig.eslint.json",
				}
			}
		},
	},
	// RULE LINKS
	// Eslint: https://eslint.org/docs/rules/
	// Typescript: https://typescript-eslint.io/rules/
	// Vue: https://eslint.vuejs.org/rules/
])
