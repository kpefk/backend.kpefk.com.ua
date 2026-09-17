const MB = 1024 * 1024

/**
 * Ліміти розміру завантажуваних файлів, у байтах.
 *
 * Навіщо окремі константи: кожен ліміт застосовується у ДВОХ місцях —
 * `FileInterceptor(..., { limits })` і `MaxFileSizeValidator`. Вони роблять
 * різні речі й обидва потрібні:
 *
 * - `limits.fileSize` (multer) — обриває потік на льоту. Це єдиний реальний
 *   захист heap: без нього multer спершу вичитує весь файл у пам'ять
 *   (memoryStorage), і лише потім щось перевіряється.
 * - `MaxFileSizeValidator` (ParseFilePipe) — дає зрозумілу 400-ку замість
 *   сирої multer-помилки і лишається як другий рубіж.
 *
 * Тримаємо число в одному місці, щоб два рубежі не розʼїхались.
 */
export const UPLOAD_LIMITS = {
	/** Фото кабінету (JPEG/PNG). */
	classroomPhoto: 5 * MB,
	/** Паспорт кабінету (PDF). */
	classroomPassport: 20 * MB,
	/** Навчальний план (.xls/.xlsx). */
	curriculumImport: 10 * MB,
	/** Шаблон диплома (.docx для docxtemplater). */
	diplomaTemplate: 20 * MB,
	/** Вивантаження ODM XML з ЄДЕБО. */
	diplomaImportXml: 20 * MB
} as const
