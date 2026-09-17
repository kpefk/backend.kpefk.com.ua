/**
 * Jest runs in ESM mode because the NestJS 12 packages are ESM-only.
 * Under ESM, Jest injects `describe` / `it` / `expect` as globals but
 * deliberately omits the `jest` object — it must be imported from
 * `@jest/globals` instead.
 *
 * Re-exposing it as a global keeps the existing specs working unchanged and
 * lets them keep the loose ambient typings from `@types/jest`, rather than the
 * stricter generic signatures that `@jest/globals` exports.
 */
import { jest } from '@jest/globals'

globalThis.jest = jest

/**
 * Some NestJS ecosystem packages are still CommonJS (e.g. `@nestjs-modules/mailer`)
 * and `require()` the now ESM-only `@nestjs/common`. Under Jest's ESM runtime that
 * fails with "Cannot require() ES Module ... it is currently being loaded by a
 * concurrent import()" whenever the require lands while the import is still in
 * flight. Fully resolving the ESM packages up front puts them in the module cache,
 * so the later synchronous require() finds a settled module instead of a pending one.
 */
await import('@nestjs/common')
await import('@nestjs/core')
