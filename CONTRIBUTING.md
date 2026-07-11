# Contributing

Use small pull requests with tests for behavior changes.

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

Keep new recipes isolated to one folder plus a registry entry. Do not add provider-specific logic to the workflow wrapper.
