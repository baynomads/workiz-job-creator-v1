<?php
session_start();

// OAuth Configuration - ДОЛЖНО СОВПАДАТЬ С index.php!
$CLIENT_ID = '5e85428e245a85b3';
$CLIENT_SECRET = 'cf423f70d74e11cf84d6fb2b649e26a79e5d3e4f';
$REDIRECT_URI = 'https://x.tor.kg/public/workiz-job-creator-v1/oauth-callback.php';

// Логирование для отладки
file_put_contents('oauth_debug.txt', "=== OAuth Callback " . date('Y-m-d H:i:s') . " ===\n", FILE_APPEND);
file_put_contents('oauth_debug.txt', "GET params: " . json_encode($_GET) . "\n", FILE_APPEND);

try {
    if (isset($_GET['error'])) {
        // Пользователь отказался от установки
        $error = $_GET['error'];
        $errorDescription = $_GET['error_description'] ?? 'Unknown error';
        
        file_put_contents('oauth_debug.txt', "OAuth Error: $error - $errorDescription\n", FILE_APPEND);
        
        showErrorPage($error, $errorDescription);
        exit;
    }
    
    if (!isset($_GET['code'])) {
        throw new Exception('Authorization code not received');
    }
    
    $authCode = $_GET['code'];
    file_put_contents('oauth_debug.txt', "Authorization code received: " . substr($authCode, 0, 20) . "...\n", FILE_APPEND);
    
    // Обмениваем authorization code на access token
    $tokenData = exchangeCodeForToken($authCode);
    file_put_contents('oauth_debug.txt', "Token exchange successful\n", FILE_APPEND);
    
    // Получаем информацию о пользователе
    $userData = getUserInfo($tokenData['access_token']);
    file_put_contents('oauth_debug.txt', "User info retrieved: " . $userData['name'] . "\n", FILE_APPEND);
    
    // Сохраняем данные пользователя в сессии
    $_SESSION['user'] = [
        'id' => $userData['id'],
        'name' => $userData['name'],
        'email' => $userData['email'],
        'company_id' => $userData['company_id'],
        'company_name' => $userData['company_name'],
        'api_domain' => $userData['company_domain'],
        'access_token' => $tokenData['access_token'],
        'refresh_token' => $tokenData['refresh_token'] ?? null,
        'token_expires' => time() + ($tokenData['expires_in'] ?? 3600),
        'installed_at' => date('Y-m-d H:i:s')
    ];
    
    file_put_contents('oauth_debug.txt', "Session saved successfully\n", FILE_APPEND);
    
    // Перенаправляем на страницу успеха
    header('Location: index.php?action=success');
    exit;
    
} catch (Exception $e) {
    file_put_contents('oauth_debug.txt', "ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    showErrorPage('Installation Failed', $e->getMessage());
}

/**
 * Обменивает authorization code на access token
 */
function exchangeCodeForToken($authCode) {
    global $CLIENT_ID, $CLIENT_SECRET, $REDIRECT_URI;
    
    $tokenData = [
        'grant_type' => 'authorization_code',
        'code' => $authCode,
        'redirect_uri' => $REDIRECT_URI,
        'client_id' => $CLIENT_ID,
        'client_secret' => $CLIENT_SECRET
    ];
    
    $postData = http_build_query($tokenData);
    
    $options = [
        'http' => [
            'method' => 'POST',
            'header' => [
                'Content-Type: application/x-www-form-urlencoded',
                'Accept: application/json',
                'User-Agent: Workiz Job Creator 1.0'
            ],
            'content' => $postData,
            'timeout' => 30,
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ];
    
    $context = stream_context_create($options);
    $response = @file_get_contents('https://oauth.pipedrive.com/oauth/token', false, $context);
    
    if ($response === false) {
        $error = error_get_last();
        throw new Exception('Failed to contact OAuth server: ' . ($error['message'] ?? 'Unknown error'));
    }
    
    // Проверяем HTTP код ответа
    $httpCode = 0;
    if (isset($http_response_header)) {
        foreach ($http_response_header as $header) {
            if (preg_match('/HTTP\/\d\.\d\s+(\d+)/', $header, $matches)) {
                $httpCode = (int)$matches[1];
                break;
            }
        }
    }
    
    file_put_contents('oauth_debug.txt', "Token exchange HTTP code: $httpCode\n", FILE_APPEND);
    file_put_contents('oauth_debug.txt', "Token response: " . substr($response, 0, 200) . "\n", FILE_APPEND);
    
    $responseData = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON response from OAuth server');
    }
    
    if ($httpCode >= 400 || isset($responseData['error'])) {
        $errorMsg = $responseData['error_description'] ?? $responseData['error'] ?? "HTTP $httpCode";
        throw new Exception("OAuth token exchange failed: $errorMsg");
    }
    
    if (!isset($responseData['access_token'])) {
        throw new Exception('Access token not received from OAuth server');
    }
    
    return $responseData;
}

/**
 * Получает информацию о пользователе
 */
function getUserInfo($accessToken) {
    $options = [
        'http' => [
            'method' => 'GET',
            'header' => [
                'Authorization: Bearer ' . $accessToken,
                'Accept: application/json',
                'User-Agent: Workiz Job Creator 1.0'
            ],
            'timeout' => 30,
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ];
    
    $context = stream_context_create($options);
    $response = @file_get_contents('https://api.pipedrive.com/v1/users/me', false, $context);
    
    if ($response === false) {
        $error = error_get_last();
        throw new Exception('Failed to get user info: ' . ($error['message'] ?? 'Unknown error'));
    }
    
    // Проверяем HTTP код ответа
    $httpCode = 0;
    if (isset($http_response_header)) {
        foreach ($http_response_header as $header) {
            if (preg_match('/HTTP\/\d\.\d\s+(\d+)/', $header, $matches)) {
                $httpCode = (int)$matches[1];
                break;
            }
        }
    }
    
    file_put_contents('oauth_debug.txt', "User info HTTP code: $httpCode\n", FILE_APPEND);
    
    $responseData = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON response from user info endpoint');
    }
    
    if ($httpCode >= 400 || !isset($responseData['success']) || !$responseData['success']) {
        $errorMsg = $responseData['error'] ?? "HTTP $httpCode";
        throw new Exception("Failed to get user info: $errorMsg");
    }
    
    return $responseData['data'];
}

/**
 * Показывает страницу ошибки
 */
function showErrorPage($error, $description) {
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Installation Error - Workiz Job Creator</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 40px 20px;
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                min-height: 100vh;
                text-align: center;
                color: white;
            }
            .container {
                max-width: 500px;
                margin: 0 auto;
                padding: 40px;
            }
            .error-icon {
                font-size: 60px;
                margin-bottom: 30px;
                opacity: 0.9;
            }
            h1 {
                font-size: 32px;
                margin: 0 0 20px 0;
            }
            .error-details {
                background: rgba(255, 255, 255, 0.1);
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: left;
            }
            .error-code {
                font-family: monospace;
                font-size: 14px;
                opacity: 0.8;
            }
            p {
                font-size: 16px;
                opacity: 0.9;
                margin-bottom: 30px;
            }
            .btn {
                display: inline-block;
                padding: 16px 32px;
                background: white;
                color: #ef4444;
                text-decoration: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                transition: all 0.3s ease;
                margin: 10px;
            }
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(0,0,0,0.2);
            }
            .btn-secondary {
                background: transparent;
                border: 2px solid white;
                color: white;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="error-icon">❌</div>
            <h1>Installation Failed</h1>
            
            <div class="error-details">
                <strong>Error:</strong> <?= htmlspecialchars($error) ?><br>
                <strong>Details:</strong> <?= htmlspecialchars($description) ?>
                <div class="error-code">
                    <?php if (isset($_GET['code'])): ?>
                        Authorization code: <?= htmlspecialchars(substr($_GET['code'], 0, 20)) ?>...
                    <?php endif; ?>
                </div>
            </div>
            
            <?php if ($error === 'access_denied'): ?>
                <p>You cancelled the installation. The app needs access to your Pipedrive account to function properly.</p>
            <?php else: ?>
                <p>Something went wrong during the installation process. Please try again or contact support.</p>
            <?php endif; ?>
            
            <a href="index.php" class="btn">🏠 Back to Home</a>
            <a href="index.php?action=install" class="btn btn-secondary">🔄 Try Again</a>
        </div>
    </body>
    </html>
    <?php
}

file_put_contents('oauth_debug.txt', "=== OAuth Callback End ===\n\n", FILE_APPEND);
?>