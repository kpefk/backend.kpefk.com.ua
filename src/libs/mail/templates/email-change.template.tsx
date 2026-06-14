import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Preview,
	Section,
	Tailwind,
	Text,
} from '@react-email/components'
import { Html } from '@react-email/html'
import * as React from 'react'

const C = {
	primary:      '#4361d6',
	primaryLight: '#eef1fc',
	primaryDark:  '#3451c0',
	dark:         '#1c1c1e',
	muted:        '#71717a',
	subtle:       '#a1a1aa',
	border:       '#e4e4e7',
	pageBg:       '#f1f3f7',
	white:        '#ffffff',
} as const

interface EmailChangeTemplateProps {
	confirmUrl: string
}

/**
 * Лист підтвердження зміни email. Надсилається на НОВУ адресу — лише власник
 * нової скриньки може підтвердити зміну. Посилання дійсне 1 годину.
 */
export function EmailChangeTemplate({ confirmUrl }: EmailChangeTemplateProps) {
	return (
		<Html lang="uk">
			<Head />
			<Preview>Підтвердження зміни email · my.kpefk.com.ua</Preview>
			<Tailwind>
				<Body style={{
					backgroundColor: C.pageBg,
					margin: 0,
					padding: 0,
					fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
				}}>
					<Container style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 16px' }}>

						<Section style={{ textAlign: 'center', marginBottom: '20px' }}>
							<Text style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: C.primary, letterSpacing: '0.5px' }}>
								my.kpefk.com.ua
							</Text>
						</Section>

						<Section style={{
							backgroundColor: C.white,
							borderRadius: '16px',
							border: `1px solid ${C.border}`,
							overflow: 'hidden',
						}}>

							<Section style={{ backgroundColor: C.primary, padding: '28px 40px 24px', textAlign: 'center' }}>
								<Text style={{ margin: '0 0 10px 0', fontSize: '40px', lineHeight: '1' }}>✉️</Text>
								<Heading style={{
									margin: 0,
									fontSize: '22px',
									fontWeight: '700',
									color: C.white,
									lineHeight: '1.3',
									letterSpacing: '-0.3px',
								}}>
									Підтвердження зміни email
								</Heading>
							</Section>

							<Section style={{ padding: '36px 40px 32px' }}>

								<Text style={{ margin: '0 0 28px 0', fontSize: '15px', color: C.muted, textAlign: 'center', lineHeight: '1.75' }}>
									Ми отримали запит на зміну email-адреси вашого облікового запису
									на цю адресу. Натисніть кнопку нижче, щоб підтвердити зміну.
								</Text>

								<Section style={{ textAlign: 'center', marginBottom: '32px' }}>
									<Button
										href={confirmUrl}
										style={{
											backgroundColor: C.primary,
											color:           C.white,
											fontSize:        '15px',
											fontWeight:      '600',
											lineHeight:      '1',
											borderRadius:    '10px',
											padding:         '14px 40px',
											textDecoration:  'none',
											display:         'inline-block',
										}}
									>
										Підтвердити зміну email →
									</Button>
								</Section>

								<Hr style={{ borderColor: C.border, margin: '0 0 24px 0' }} />

								<Section style={{
									backgroundColor: C.primaryLight,
									borderRadius:    '10px',
									padding:         '14px 18px',
									marginBottom:    '24px',
									borderLeft:      `3px solid ${C.primary}`,
								}}>
									<Text style={{ margin: 0, fontSize: '13px', color: C.primary, lineHeight: '1.6' }}>
										<strong>⏱ Посилання дійсне протягом 1 години.</strong>
										{' '}Після закінчення часу необхідно повторно запросити зміну email.
									</Text>
								</Section>

								<Text style={{ margin: 0, fontSize: '13px', color: C.muted, textAlign: 'center', lineHeight: '1.7' }}>
									Якщо ви не надсилали цей запит — просто проігноруйте цей лист.
									Ваша поточна адреса залишиться без змін.
								</Text>

							</Section>

							<Section style={{ backgroundColor: C.pageBg, padding: '16px 40px', borderTop: `1px solid ${C.border}` }}>
								<Text style={{ margin: 0, fontSize: '12px', color: C.subtle, textAlign: 'center', lineHeight: '1.6' }}>
									Цей лист надіслано автоматично — будь ласка, не відповідайте на нього.
								</Text>
							</Section>

						</Section>

						<Section style={{ textAlign: 'center', padding: '20px 0 8px' }}>
							<Text style={{ margin: 0, fontSize: '12px', color: C.subtle }}>
								© {new Date().getFullYear()} КПЕФК · Коледж права та економіки
							</Text>
						</Section>

					</Container>
				</Body>
			</Tailwind>
		</Html>
	)
}
