import mpConfig from '@mp/app-kit/eslint-config';

export default [
  ...mpConfig,
  { ignores: ['dist/**', 'node_modules/**'] },
];
