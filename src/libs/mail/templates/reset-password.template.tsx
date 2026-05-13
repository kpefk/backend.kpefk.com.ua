import {
	Body,
	Heading,
	Link,
	Tailwind,
	Text
} from '@react-email/components';
import { Html } from '@react-email/html';
import * as React from 'react';

interface ResetPasswordTemplateProps {
	domain: string;
	token: string;
}

/**
 * Генерує шаблон листа для скидання пароля.
 * Посилання для скидання формується з домену та токена. Лист інформує,
 * що посилання дійсне 1 годину.
 * 
 * @param {ResetPasswordTemplateProps} props - Домен та токен для генерації посилання.
 * @returns {JSX.Element} Згенерований шаблон листа.
 */
export function ResetPasswordTemplate({ domain, token }: ResetPasswordTemplateProps) {
	const resetLink = `${domain}/auth/new-password?token=${token}`;

	return (
		<Tailwind>
			<Html>
				<Body className='text-black'>
					<Heading>Скидання паролю</Heading>
					<Text>
						Привіт! Ви запитували скидання паролю. Будь ласка, перейдіть за посиланням, щоб створити новий пароль:
					</Text>
					<Link href={resetLink}>Підтвердити скидання паролю</Link>
					<Text>
						Це посилання дійсне протягом 1 години. Якщо ви не запитували скидання паролю, просто проігноруйте це повідомлення.
					</Text>
				</Body>
			</Html>
		</Tailwind>
	);
}