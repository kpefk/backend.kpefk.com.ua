import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { authenticator } from 'otplib'
import * as crypto from 'crypto'
import * as QRCode from 'qrcode'

const ALGORITHM = 'aes-256-cbc'

@Injectable()
export class TotpService {
  private readonly logger = new Logger(TotpService.name)
  private readonly encryptionKey: Buffer

  public constructor(private readonly configService: ConfigService) {
    // Derive a 32-byte key from SESSION_SECRET (or AUTH_SECRET if provided).
    // scryptSync ensures the key is always exactly 32 bytes regardless of secret length.
    const secret =
      this.configService.get<string>('AUTH_SECRET') ??
      this.configService.get<string>('SESSION_SECRET') ??
      'fallback-32-byte-key-replace-me!'
    this.encryptionKey = crypto.scryptSync(secret, 'totp-salt-v1', 32)
  }

  // ── Secret generation ─────────────────────────────────────────────────────

  public generateSecret(): string {
    return authenticator.generateSecret(20) // 20-byte → 32-char base32
  }

  public getOtpauthUrl(email: string, secret: string): string {
    return authenticator.keyuri(email, "MyKPEFK", secret)
  }

  public async generateQrCodeDataUrl(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl, { width: 250, margin: 2 })
  }

  // ── Verification ──────────────────────────────────────────────────────────

  /**
   * Verify a 6-digit TOTP token against a plaintext base32 secret.
   * Window ±1 step (30 s tolerance either side).
   */
  public verify(token: string, plaintextSecret: string): boolean {
    authenticator.options = { window: 1 }
    try {
      return authenticator.verify({ token, secret: plaintextSecret })
    } catch (err) {
      this.logger.warn(`TOTP verify error: ${err}`)
      return false
    }
  }

  // ── Encryption / decryption ───────────────────────────────────────────────

  public encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`
  }

  public decrypt(ciphertext: string): string {
    const [ivHex, encHex] = ciphertext.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const enc = Buffer.from(encHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv)
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
  }
}
