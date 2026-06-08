import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

/**
 * Converts all Prisma Decimal instances in API responses to plain strings
 * (e.g. "4.00") before ClassSerializerInterceptor processes the result.
 *
 * Why this is necessary:
 *   ClassSerializerInterceptor calls class-transformer's `instanceToPlain`,
 *   which recursively converts every object to a plain representation.
 *   For a `Prisma.Decimal` / `decimal.js` Decimal instance it enumerates
 *   the internal properties {d, e, s} instead of calling `.toJSON()`,
 *   producing a raw object like `{ d: [4], e: 0, s: 1 }` on the wire.
 *
 * This interceptor must be registered AFTER ClassSerializerInterceptor in
 * main.ts so it executes FIRST on the outgoing response.
 */
@Injectable()
export class DecimalSerializerInterceptor implements NestInterceptor {
  public intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => serializeDecimals(data)))
  }
}

function serializeDecimals(value: unknown): unknown {
  if (value instanceof Prisma.Decimal) {
    // Use toFixed(2) to match the @db.Decimal(6,2) schema precision.
    // This produces "4.00", "4.50", "12.00" etc. — consistent with what a
    // vanilla Prisma JSON response would emit via Decimal.prototype.toJSON().
    return value.toFixed(2)
  }

  if (Array.isArray(value)) {
    return value.map(serializeDecimals)
  }

  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as object)) {
      out[key] = serializeDecimals((value as Record<string, unknown>)[key])
    }
    return out
  }

  return value
}
