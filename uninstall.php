<?php
// Uninstall endpoint для Pipedrive приложения
// Этот файл вызывается когда пользователь удаляет приложение

session_start();
header('Content-Type: application/json');

// Логирование для отладки
file_put_contents('uninstall_debug.txt', "=== Uninstall Request " . date('Y-m-d H:i:s') . " ===\n", FILE_APPEND);
file_put_contents('uninstall_debug.txt', "Method: " . $_SERVER['REQUEST_METHOD'] . "\n", FILE_APPEND);
file_put_contents('uninstall_debug.txt', "Query params: " . json_encode($_GET) . "\n", FILE_APPEND);

try {
    // Получаем параметры от Pipedrive
    $userId = $_GET['user_id'] ?? '';
    $companyId = $_GET['company_id'] ?? '';
    
    // Получаем данные из тела запроса (если есть)
    $input = file_get_contents('php://input');
    if (!empty($input)) {
        $requestData = json_decode($input, true);
        file_put_contents('uninstall_debug.txt', "Request body: " . $input . "\n", FILE_APPEND);
    }
    
    file_put_contents('uninstall_debug.txt', "Uninstalling for user: $userId, company: $companyId\n", FILE_APPEND);
    
    // Очищаем данные пользователя
    cleanupUserData($userId, $companyId);
    
    // Возвращаем успешный ответ
    $response = [
        'success' => true,
        'message' => 'App successfully uninstalled',
        'user_id' => $userId,
        'company_id' => $companyId,
        'timestamp' => date('c')
    ];
    
    file_put_contents('uninstall_debug.txt', "Uninstall successful: " . json_encode($response) . "\n", FILE_APPEND);
    
    echo json_encode($response);
    
} catch (Exception $e) {
    file_put_contents('uninstall_debug.txt', "ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('c')
    ]);
}

file_put_contents('uninstall_debug.txt', "=== Uninstall End ===\n\n", FILE_APPEND);

/**
 * Очищает данные пользователя при удалении приложения
 */
function cleanupUserData($userId, $companyId) {
    file_put_contents('uninstall_debug.txt', "Starting cleanup for user $userId\n", FILE_APPEND);
    
    // 1. Очищаем сессии (если используете файловые сессии)
    if (session_id()) {
        session_destroy();
    }
    
    // 2. Удаляем пользовательские данные из базы данных (если используете)
    // Здесь бы был код для удаления из БД:
    // deleteUserFromDatabase($userId, $companyId);
    
    // 3. Очищаем временные файлы пользователя (если есть)
    $userFiles = [
        "user_data_{$userId}.json",
        "user_session_{$userId}.txt",
        "user_cache_{$userId}.cache"
    ];
    
    foreach ($userFiles as $file) {
        if (file_exists($file)) {
            unlink($file);
            file_put_contents('uninstall_debug.txt', "Deleted file: $file\n", FILE_APPEND);
        }
    }
    
    // 4. Логируем статистику удаления
    $uninstallLog = [
        'user_id' => $userId,
        'company_id' => $companyId,
        'uninstalled_at' => date('Y-m-d H:i:s'),
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
    ];
    
    file_put_contents('uninstall_log.txt', json_encode($uninstallLog) . "\n", FILE_APPEND | LOCK_EX);
    
    // 5. Отправляем уведомление (опционально)
    // sendUninstallNotification($userId, $companyId);
    
    file_put_contents('uninstall_debug.txt', "Cleanup completed for user $userId\n", FILE_APPEND);
}

/**
 * Удаляет данные пользователя из базы данных (если используете БД)
 */
function deleteUserFromDatabase($userId, $companyId) {
    // Пример кода для удаления из БД
    /*
    try {
        $pdo = new PDO($dsn, $username, $password);
        
        // Удаляем токены пользователя
        $stmt = $pdo->prepare("DELETE FROM user_tokens WHERE user_id = ? AND company_id = ?");
        $stmt->execute([$userId, $companyId]);
        
        // Удаляем настройки пользователя
        $stmt = $pdo->prepare("DELETE FROM user_settings WHERE user_id = ? AND company_id = ?");
        $stmt->execute([$userId, $companyId]);
        
        // Удаляем пользовательские данные
        $stmt = $pdo->prepare("DELETE FROM user_data WHERE user_id = ? AND company_id = ?");
        $stmt->execute([$userId, $companyId]);
        
        file_put_contents('uninstall_debug.txt', "Database cleanup completed\n", FILE_APPEND);
        
    } catch (PDOException $e) {
        file_put_contents('uninstall_debug.txt', "Database cleanup error: " . $e->getMessage() . "\n", FILE_APPEND);
        throw new Exception('Database cleanup failed');
    }
    */
}

/**
 * Отправляет уведомление об удалении (опционально)
 */
function sendUninstallNotification($userId, $companyId) {
    // Пример отправки уведомления
    /*
    $notificationData = [
        'event' => 'app_uninstalled',
        'user_id' => $userId,
        'company_id' => $companyId,
        'timestamp' => date('c'),
        'app_name' => 'Workiz Job Creator'
    ];
    
    // Отправляем в вашу систему аналитики
    $webhook_url = 'https://your-analytics-system.com/webhook';
    
    $options = [
        'http' => [
            'method' => 'POST',
            'header' => [
                'Content-Type: application/json',
                'User-Agent: Workiz Job Creator Uninstall 1.0'
            ],
            'content' => json_encode($notificationData),
            'timeout' => 10,
            'ignore_errors' => true
        ]
    ];
    
    $context = stream_context_create($options);
    @file_get_contents($webhook_url, false, $context);
    */
}
?>