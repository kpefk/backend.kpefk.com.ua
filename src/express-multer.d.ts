/// <reference types="multer" />

// Форсує підключення глобальної augmentation `@types/multer` (namespace
// Express.Multer.File), яку автоматичне включення @types не завжди підхоплює
// при module/moduleResolution "nodenext". Використовується в classroom/diploma/
// google-drive контролерах для типу файлів завантаження.
