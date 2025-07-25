# 🔧 Workiz Job Creator для Pipedrive
## Техническая документация

### 📋 Обзор проекта

**Workiz Job Creator** - это интеграционное приложение для Pipedrive CRM, которое позволяет создавать сервисные заявки прямо из интерфейса Pipedrive. Приложение реализовано как Custom Modal Extension с использованием официального Pipedrive App Extensions SDK.

**Основные возможности:**
- ✅ Создание сервисных заявок из контактов и сделок
- ✅ Автоматическое предзаполнение данных клиента
- ✅ Создание новых контактов и сделок в Pipedrive
- ✅ Автообновление OAuth токенов
- ✅ Полная интеграция с Pipedrive UI

---

## 🏗️ Архитектура системы

### Компоненты

1. **Frontend (modal.js + modal.html)**
   - Пользовательский интерфейс формы
   - Интеграция с Pipedrive SDK
   - Валидация и обработка форм

2. **Backend (api.php)**
   - OAuth авторизация
   - API интеграция с Pipedrive
   - Автообновление токенов

3. **OAuth система (index.php + oauth-callback.php)**
   - Установка приложения
   - Обработка OAuth flow
   - Управление пользователями

### Схема взаимодействия

```
Pipedrive UI → Custom Modal → modal.js → api.php → Pipedrive API
                    ↓                        ↓
               modal.html              OAuth система
```

---

## 🚀 Установка и настройка

### Предварительные требования

- PHP 7.4+
- HTTPS сервер (обязательно для Pipedrive)
- Зарегистрированное приложение в Pipedrive Developer Hub

### 1. Настройка OAuth

В файлах `index.php` и `oauth-callback.php` укажите ваши данные:

```php
$CLIENT_ID = 'ваш_client_id';
$CLIENT_SECRET = 'ваш_client_secret';
$REDIRECT_URI = 'https://ваш-домен.com/oauth-callback.php';
```

### 2. Настройка веб-сервера

Скопируйте файл `.htaccess` для правильной конфигурации заголовков:

```apache
# Разрешает загрузку в iframe от Pipedrive
Header set Content-Security-Policy "frame-ancestors 'self' *.pipedrive.com"
Header unset X-Frame-Options
```

### 3. Настройка в Pipedrive Developer Hub

1. Создайте новое приложение
2. Добавьте Custom Modal Extension:
   - **Name:** Create Job
   - **URL:** `https://ваш-домен.com/index.php?action=modal`
   - **Entry points:** Person detail, Person list, Deal detail, Deal list

### 4. Установка приложения

1. Перейдите на `https://ваш-домен.com/`
2. Нажмите "Install App"
3. Пройдите OAuth авторизацию

---

## 📡 API документация

### Основные эндпоинты

#### `POST /api.php` - Создание задания

**Параметры:**
```json
{
  "firstName": "Имя",
  "lastName": "Фамилия", 
  "phone": "(123) 456-7890",
  "email": "client@example.com",
  "serviceNeeded": "Plumbing",
  "jobDescription": "Описание работы",
  "address": "Адрес",
  "city": "Город",
  "state": "Штат",
  "zipCode": "12345",
  "preferredDate": "2025-07-25",
  "startTime": "10:00",
  "pipedrive_api_token": "токен",
  "userId": "23712931",
  "companyId": "14068830"
}
```

**Ответ при успехе:**
```json
{
  "success": true,
  "message": "Job created successfully in Pipedrive!",
  "data": {
    "person_id": 123,
    "person_name": "Имя Фамилия",
    "deal_id": 456,
    "deal_title": "Plumbing - Имя",
    "deal_value": 0,
    "pipedrive_url": "https://company.pipedrive.com/deal/456"
  }
}
```

#### `POST /api.php` - Получение данных контакта

**Параметры:**
```json
{
  "action": "get_person",
  "person_id": "123",
  "pipedrive_api_token": "токен",
  "userId": "23712931", 
  "companyId": "14068830"
}
```

---

## 🔐 Система авторизации

### OAuth Flow

1. **Установка:** Пользователь устанавливает приложение через Developer Hub
2. **Авторизация:** Перенаправление на OAuth эндпоинт Pipedrive
3. **Callback:** Получение authorization code
4. **Токены:** Обмен code на access_token и refresh_token
5. **Сохранение:** Токены сохраняются в сессии и файле

### Автообновление токенов

Система автоматически обновляет истекшие токены:

```php
function refreshTokenIfNeeded($user) {
    $expires = $user['token_expires'] ?? 0;
    
    // Проверяем истечение (с запасом 10 минут)
    if ($expires < (time() + 600)) {
        return refreshAccessToken($user['refresh_token']);
    }
    
    return $user;
}
```

---

## 🎯 Frontend интеграция

### Pipedrive SDK

Приложение использует официальный Pipedrive App Extensions SDK:

```javascript
// Инициализация
sdk = await new AppExtensionsSDK().initialize({
    size: { height: 950, width: 800 }
});

// Получение контекста
const context = await sdk.execute('getCurrentContext');

// Закрытие модала  
const { Command } = window.AppExtensionsSDK;
sdk.execute(Command.CLOSE_MODAL);

// Показ уведомления
sdk.execute('showSnackbar', {
    message: 'Job created successfully!',
    link: { url: dealUrl, label: 'View Deal' }
});
```

### Предзаполнение формы

Система автоматически загружает данные выбранного контакта:

```javascript
async function loadPersonData(personId) {
    const response = await fetch('api.php', {
        method: 'POST',
        body: JSON.stringify({
            action: 'get_person',
            person_id: personId,
            pipedrive_api_token: window.PIPEDRIVE_REAL_API_TOKEN,
            userId: currentContext.userId,
            companyId: currentContext.companyId
        })
    });
    
    const result = await response.json();
    if (result.success) {
        fillPersonData(result.data);
    }
}
```

---

## 📁 Структура файлов

```
workiz-job-creator/
├── index.php              # Главная страница и OAuth
├── modal.html             # HTML форма
├── modal.js               # Frontend логика + SDK
├── api.php                # Backend API
├── oauth-callback.php     # OAuth callback handler
├── uninstall.php         # Деинсталляция
├── .htaccess             # Конфигурация сервера
├── policy.html           # Политика конфиденциальности
├── terms.html            # Пользовательское соглашение
└── user_data_*.json      # Кеш пользователей
```

---

## 🐛 Troubleshooting

### Частые проблемы

#### 1. Модал не открывается
- **Проблема:** X-Frame-Options блокирует iframe
- **Решение:** Проверить .htaccess конфигурацию

#### 2. "Invalid command" в SDK
- **Проблема:** Неправильные названия команд
- **Решение:** Использовать константы `Command.CLOSE_MODAL` вместо строк

#### 3. "Invalid token" при API запросах  
- **Проблема:** Истекший access_token
- **Решение:** Проверить работу автообновления токенов

#### 4. Форма не предзаполняется
- **Проблема:** Неправильный person_id или проблемы с токеном
- **Решение:** Проверить логи api_debug.txt

### Логирование

Система ведет детальные логи:

- `api_debug.txt` - API запросы и ответы
- `oauth_debug.txt` - OAuth процесс  
- `jobs_log.txt` - Созданные задания
- `index_debug.txt` - Отладка модалов

### Тестирование

1. **Локальное тестирование:** `?action=modal` напрямую
2. **Проверка SDK:** Консоль браузера `window.AppExtensionsSDK`
3. **API тестирование:** Postman/curl запросы к api.php

---

## 📈 Мониторинг и производительность

### Метрики для отслеживания

- Успешность создания заданий (%)
- Время ответа API запросов
- Частота обновления токенов
- Ошибки SDK интеграции

### Рекомендации по масштабированию

1. **База данных:** Заменить файловое хранение на MySQL/PostgreSQL
2. **Кеширование:** Redis для токенов и сессий
3. **Очередь:** Background jobs для тяжелых операций
4. **Мониторинг:** Prometheus + Grafana

---

## 🔒 Безопасность

### Реализованные меры

- ✅ HTTPS обязателен
- ✅ JWT токен валидация
- ✅ CORS политики
- ✅ Автообновление токенов
- ✅ Логирование запросов

### Рекомендации

- 🔸 Регулярная ротация Client Secret
- 🔸 Rate limiting для API
- 🔸 Валидация всех входящих данных
- 🔸 Шифрование логов с чувствительными данными

---

## 📚 Дополнительные ресурсы

- [Pipedrive App Extensions SDK](https://github.com/pipedrive/app-extensions-sdk)
- [Pipedrive API Documentation](https://developers.pipedrive.com/)
- [OAuth 2.0 Specification](https://oauth.net/2/)

---

## 👥 Команда разработки

**Разработчик:** Junior Developer 
**Дата создания:** Июль 2025  
**Версия:** 1.0.0

---

*Документация актуальна на дату: 25 июля 2025*
