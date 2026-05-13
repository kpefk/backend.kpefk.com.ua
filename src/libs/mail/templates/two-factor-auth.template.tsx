import {
	Body,
	Heading,
	Tailwind,
	Text
} from '@react-email/components';
import { Html } from '@react-email/html';
import * as React from 'react';

interface TwoFactorAuthTemplateProps {
	token: string;
}

/**
 * Генерує шаблон листа для двохфакторної аутентифікації.
 * Лист містить код, який потрібно ввести для завершення аутентифікації.
 * 
 * @param {TwoFactorAuthTemplateProps} props - Токен для двохфакторної аутентифікації.
 * @returns {JSX.Element} Згенерований шаблон листа.
 */
export function TwoFactorAuthTemplate({ token }: TwoFactorAuthTemplateProps) {
	return (
		<Tailwind>
			<Html>
				<Body className='text-black'>
					<Heading>Двухфакторна аутентифікація</Heading>
					<Text>Ваш код двохфакторної аутентифікації: <strong>{token}</strong></Text>
					<Text>
						Будь ласка, введіть цей код в програмі для завершення процесу аутентифікації.
					</Text>
					<Text>
						Якщо ви не запитували цей код, просто проігноруйте це повідомлення.
					</Text>
				</Body>
			</Html>
		</Tailwind>
	);
}