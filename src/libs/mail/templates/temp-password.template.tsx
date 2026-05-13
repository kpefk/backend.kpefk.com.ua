import {
  Body,
  Heading,
  Tailwind,
  Text
} from '@react-email/components'
import { Html } from '@react-email/html'
import * as React from 'react'

interface TempPasswordTemplateProps {
  password: string
}

/**
 * Генерує шаблон листа з тимчасовим паролем.
 * Лист інформує користувача про тимчасовий пароль та рекомендує
 * змінити його після першого входу в систему.
 *
 * @param {TempPasswordTemplateProps} props - Тимчасовий пароль користувача.
 * @returns {JSX.Element} Згенерований шаблон листа.
 */
export function TempPasswordTemplate({ password }: TempPasswordTemplateProps) {
  return (
    <Tailwind>
      <Html>
        <Body className='text-black'>
          <Heading>Ваші дані для входу в MyKPEFK</Heading>
          <Text>
            Вітаємо! Адміністратор системи створив для вас обліковий запис у системі управління навчальним процесом MyKPEFK.
          </Text>
          <Text>
            Ваш тимчасовий пароль для входу:
          </Text>
          <Text className='text-2xl font-bold tracking-widest'>
            {password}
          </Text>
          <Text>
            З міркувань безпеки рекомендуємо змінити пароль одразу після першого входу в систему.
          </Text>
          <Text>
            Якщо ви не очікували цього листа — зверніться до адміністратора системи.
          </Text>
        </Body>
      </Html>
    </Tailwind>
  )
}