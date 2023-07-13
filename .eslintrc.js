module.exports = {
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": "standard",
  "overrides": [
    {
      "files": ["*.ts"],
      "extends": "standard-with-typescript",
      "rules": {
        '@typescript-eslint/semi': ['error', 'always']
      }
    }
  ],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "rules": {
    semi: ['error', 'always']
  }
}
