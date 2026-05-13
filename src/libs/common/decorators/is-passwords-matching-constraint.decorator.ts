import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator'

/**
 * Перевіряє, чи співпадають паролі.
 *
 * Цей клас реалізує інтерфейс ValidatorConstraintInterface та використовується
 * для перевірки, чи співпадають два паролі в процесі валідації.
 */
@ValidatorConstraint({ name: 'IsPasswordsMatching', async: false })
export class IsPasswordsMatchingConstraint
  implements ValidatorConstraintInterface {

  /**
   * Перевіряє, чи співпадають паролі.
   *
   * @param passwordRepeat - Повторний пароль, введений користувачем.
   * @param args - Аргументи валідації, що містять об'єкт, який перевіряється.
   * @returns true, якщо паролі співпадають; інакше false.
   */
  public validate(passwordRepeat: string, args: ValidationArguments): boolean {
    const obj = args.object as { password?: string }
    return obj.password === passwordRepeat
  }

  /**
   * Повертає повідомлення про помилку, якщо валідація не пройшла.
   *
   * @returns Повідомлення про помилку.
   */
  public defaultMessage(): string {
    return 'Паролі не співпадають.'
  }
}