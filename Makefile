.PHONY: dev build start worker test test-e2e lint typecheck migrate seed

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

worker:
	npm run worker

test:
	npm run test

test-e2e:
	npm run test:e2e

lint:
	npm run lint

typecheck:
	npm run typecheck

migrate:
	npm run migrate

seed:
	npm run seed
