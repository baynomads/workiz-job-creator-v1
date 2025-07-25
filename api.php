<?php
session_start();

function refreshTokenIfNeeded($user) {
    $now = time();
    $expires = $user['token_expires'] ?? 0;
    
    // Если токен истек ИЛИ истекает в ближайшие 10 минут
    if ($expires < ($now + 600)) {
        $status = $expires < $now ? "expired" : "expires soon";
        file_put_contents('api_debug.txt', "Token $status, refreshing...\n", FILE_APPEND);
        
        $newTokens = refreshAccessToken($user['refresh_token']);
        
        if ($newTokens) {
            // Обновляем данные пользователя
            $user['access_token'] = $newTokens['access_token'];
            $user['token_expires'] = time() + $newTokens['expires_in'];
            
            // Обновляем refresh_token если пришел новый
            if (isset($newTokens['refresh_token'])) {
                $user['refresh_token'] = $newTokens['refresh_token'];
            }
            
            // Сохраняем в файл
            $userFile = "user_data_{$user['id']}_{$user['company_id']}.json";
            file_put_contents($userFile, json_encode($user));
            
            file_put_contents('api_debug.txt', "Token refreshed successfully\n", FILE_APPEND);
            
            return $user;
        } else {
            file_put_contents('api_debug.txt', "Token refresh failed - may need re-auth\n", FILE_APPEND);
        }
    }
    
    return $user;
}

function refreshAccessToken($refreshToken) {
    global $CLIENT_ID, $CLIENT_SECRET;
    
    $CLIENT_ID = '5e85428e245a85b3'; // Ваш ID
    $CLIENT_SECRET = 'cf423f70d74e11cf84d6fb2b649e26a79e5d3e4f'; // Ваш секрет
    
    $tokenData = [
        'grant_type' => 'refresh_token',
        'refresh_token' => $refreshToken,
        'client_id' => $CLIENT_ID,
        'client_secret' => $CLIENT_SECRET
    ];
    
    $postData = http_build_query($tokenData);
    
    $options = [
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/x-www-form-urlencoded',
            'content' => $postData,
            'timeout' => 30
        ]
    ];
    
    $context = stream_context_create($options);
    $response = @file_get_contents('https://oauth.pipedrive.com/oauth/token', false, $context);
    
    if ($response) {
        $responseData = json_decode($response, true);
        if (isset($responseData['access_token'])) {
            return $responseData;
        }
    }
    
    return false;
}

header('Content-Type: application/json');

file_put_contents('api_debug.txt', "=== " . date('Y-m-d H:i:s') . " ===\n", FILE_APPEND);
file_put_contents('api_debug.txt', "Authorization header: " . ($_SERVER['HTTP_AUTHORIZATION'] ?? 'NOT SET') . "\n", FILE_APPEND);
file_put_contents('api_debug.txt', "All HTTP headers: " . json_encode(getallheaders()) . "\n", FILE_APPEND);

try {
    // Получаем данные формы
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        throw new Exception('No data received or invalid JSON');
    }

	// Пробуем получить данные из разных источников
	$user = null;
	$apiToken = null;
	
	/*
	// Получаем API токен из тела запроса (для iframe)
	if (isset($data['pipedrive_api_token'])) {
		$apiToken = $data['pipedrive_api_token'];
		$apiDomain = 'baymanapllc-sandbox.pipedrive.com';
		file_put_contents('api_debug.txt', "Using API token from request body\n", FILE_APPEND);
		*/
	// Получаем API токен из тела запроса (для iframe)
	if (isset($data['pipedrive_api_token'])) {
		// Нужно загрузить данные пользователя из файла и обновить токен
		$userId = $data['userId'] ?? '';
		$companyId = $data['companyId'] ?? '';
		
		if ($userId && $companyId) {
			$userFile = "user_data_{$userId}_{$companyId}.json";
			if (file_exists($userFile)) {
				$fileUser = json_decode(file_get_contents($userFile), true);
				$fileUser = refreshTokenIfNeeded($fileUser);
				$apiToken = $fileUser['access_token'];
				file_put_contents('api_debug.txt', "Using refreshed API token from file\n", FILE_APPEND);
			} else {
				$apiToken = $data['pipedrive_api_token'];
				file_put_contents('api_debug.txt', "Using API token from request body (no file found)\n", FILE_APPEND);
			}
		} else {
			$apiToken = $data['pipedrive_api_token'];
			file_put_contents('api_debug.txt', "Using API token from request body (no user data)\n", FILE_APPEND);
		}
		
		$apiDomain = 'baymanapllc-sandbox.pipedrive.com';

	} elseif (isset($_SESSION['user']) && isset($_SESSION['user']['access_token'])) {
		//$user = $_SESSION['user'];
		$user = refreshTokenIfNeeded($_SESSION['user']);
		$apiToken = $user['access_token'];
		$apiDomain = $user['api_domain'] ?? '';
		file_put_contents('api_debug.txt', "Using API token from session\n", FILE_APPEND);
	} else {
		throw new Exception('User not authenticated. No API token provided.');
	}

	$apiDomain = $user['api_domain'] ?? 'baymanapllc-sandbox.pipedrive.com';
	file_put_contents('api_debug.txt', "API Domain set to: $apiDomain\n", FILE_APPEND);
    
    file_put_contents('api_debug.txt', "API Domain: " . $apiDomain . "\n", FILE_APPEND);
    file_put_contents('api_debug.txt', "API Token: " . substr($apiToken, 0, 10) . "...\n", FILE_APPEND);

    $isSandbox = strpos($apiDomain, 'sandbox') !== false;
    
    file_put_contents('api_debug.txt', "Environment: " . ($isSandbox ? 'sandbox' : 'production') . "\n", FILE_APPEND);
    file_put_contents('api_debug.txt', "Using file_get_contents (no cURL)\n", FILE_APPEND);

	// В начале, после получения $apiToken и $apiDomain
	if (isset($data['action']) && $data['action'] === 'get_person') {
		$personId = $data['person_id'] ?? null;
		
		if (!$personId) {
			echo json_encode(['success' => false, 'error' => 'Person ID required']);
			exit;
		}
		
		try {
			file_put_contents('api_debug.txt', "Getting person data for ID: $personId\n", FILE_APPEND);
			file_put_contents('api_debug.txt', "Using token: " . substr($apiToken, 0, 10) . "...\n", FILE_APPEND);
			file_put_contents('api_debug.txt', "Using domain: $apiDomain\n", FILE_APPEND);
			
			$response = makePipedriveRequest('GET', "persons/{$personId}", null, $apiToken, $apiDomain);
			
			if ($response && isset($response['success']) && $response['success']) {
				echo json_encode(['success' => true, 'data' => $response['data']]);
			} else {
				echo json_encode(['success' => false, 'error' => 'Person not found', 'response' => $response]);
			}
		} catch (Exception $e) {
			echo json_encode(['success' => false, 'error' => $e->getMessage()]);
		}
		
		exit;
	}


    // Тестируем API подключение с file_get_contents
    file_put_contents('api_debug.txt', "Testing API connection...\n", FILE_APPEND);
	//$testResponse = makePipedriveRequest('GET', 'users/me', null, $apiToken);
	$testResponse = makePipedriveRequest('GET', 'users/me', null, $apiToken, $apiDomain);
    file_put_contents('api_debug.txt', "API Test Response: " . json_encode($testResponse) . "\n", FILE_APPEND);
    
    if (!$testResponse || !isset($testResponse['success']) || !$testResponse['success']) {
        throw new Exception('API connection test failed: ' . json_encode($testResponse));
    }
    
    // Логируем данные
    logJobData($data, $apiDomain);
    
    // 1. Создаем персону (временно отключил)
	//file_put_contents('api_debug.txt', "Creating person...\n", FILE_APPEND);
	//$personData = createPersonSimple($data, $apiToken, $apiDomain);
	//file_put_contents('api_debug.txt', "Person created: " . json_encode($personData) . "\n", FILE_APPEND);
    
    // 2. Создаем сделку
    file_put_contents('api_debug.txt', "Creating deal...\n", FILE_APPEND);
    $dealData = createDeal($data, $personData['id'], $apiToken, $apiDomain);
    file_put_contents('api_debug.txt', "Deal created: " . json_encode($dealData) . "\n", FILE_APPEND);
    
    // Успешный ответ
    $response = [
        'success' => true,
        'message' => 'Job created successfully in Pipedrive!',
        'data' => [
            'person_id' => $personData['id'],
            'person_name' => $personData['name'],
            'deal_id' => $dealData['id'],
            'deal_title' => $dealData['title'],
            'deal_value' => $dealData['value'] ?? 0,
            'pipedrive_url' => "https://{$apiDomain}/deal/{$dealData['id']}",
            'environment' => $isSandbox ? 'sandbox' : 'production',
            'method' => 'file_get_contents'
        ]
    ];
    
    file_put_contents('api_debug.txt', "SUCCESS Response: " . json_encode($response) . "\n", FILE_APPEND);
    echo json_encode($response);
    
} catch (Exception $e) {
    $errorResponse = [
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => [
            'environment' => isset($isSandbox) ? ($isSandbox ? 'sandbox' : 'production') : 'unknown',
            'api_domain' => $apiDomain ?? 'unknown',
            'method' => 'file_get_contents'
        ]
    ];
    
    file_put_contents('api_debug.txt', "ERROR: " . $e->getMessage() . "\n", FILE_APPEND);
    echo json_encode($errorResponse);
}

file_put_contents('api_debug.txt', "=== END ===\n\n", FILE_APPEND);

/**
 * Создает персону
 */
function createPersonSimple($data, $apiToken, $apiDomain = '') {
    $firstName = trim($data['firstName'] ?? '');
    $lastName = trim($data['lastName'] ?? '');
    $fullName = trim($firstName . ' ' . $lastName);
    $email = trim($data['email'] ?? '');
    $phone = trim($data['phone'] ?? '');
    
    $personData = [
        'name' => $fullName ?: 'Unknown Client'
    ];
    
    if (!empty($email)) {
        $personData['email'] = [['value' => $email, 'primary' => true]];
    }
    
    if (!empty($phone)) {
        $personData['phone'] = [['value' => $phone, 'primary' => true]];
    }
    
    file_put_contents('api_debug.txt', "Person data: " . json_encode($personData) . "\n", FILE_APPEND);
    
	//$response = makePipedriveRequest('POST', 'persons', $personData, $apiToken);
	$response = makePipedriveRequest('POST', 'persons', $personData, $apiToken, $apiDomain);
    
    if (!$response || !isset($response['success']) || !$response['success']) {
        throw new Exception('Failed to create person: ' . json_encode($response));
    }
    
	//return $response['data'];
	// Берем первую персону из массива (если API возвращает существующую)
	$personData = is_array($response['data']) ? $response['data'][0] : $response['data'];
	return $personData;
}

/**
 * Создает сделку
 */
function createDeal($data, $personId, $apiToken, $apiDomain = '') {
    $serviceNeeded = $data['serviceNeeded'] ?? 'Service';
    $firstName = $data['firstName'] ?? 'Client';
    $jobDescription = $data['jobDescription'] ?? '';
    $address = formatAddress($data);
    
    $dealTitle = "{$serviceNeeded} - {$firstName}";
    
    // Основные данные сделки БЕЗ заметок
    $dealData = [
        'title' => $dealTitle,
        'person_id' => $personId,
        'value' => 0,
        'currency' => 'USD'
    ];
    
    file_put_contents('api_debug.txt', "Deal data: " . json_encode($dealData) . "\n", FILE_APPEND);
    
    // Создаем сделку
	//$response = makePipedriveRequest('POST', 'deals', $dealData, $apiToken);
	$response = makePipedriveRequest('POST', 'deals', $dealData, $apiToken, $apiDomain);
    
    if (!$response || !isset($response['success']) || !$response['success']) {
        throw new Exception('Failed to create deal: ' . json_encode($response));
    }
    
    $dealId = $response['data']['id'];
    
    // Добавляем заметку отдельным запросом после создания сделки
    $notes = [];
    if (!empty($jobDescription)) {
        $notes[] = "📝 Job Description: {$jobDescription}";
    }
    if (!empty($address)) {
        $notes[] = "📍 Service Address: {$address}";
    }
    if (!empty($data['preferredDate'])) {
        $notes[] = "📅 Preferred Date: {$data['preferredDate']}";
    }
    if (!empty($data['startTime'])) {
        $notes[] = "🕐 Time: {$data['startTime']}";
    }
    
    if (!empty($notes)) {
        $noteText = implode("\n", $notes);
        try {
            $noteData = [
                'content' => $noteText,
                'deal_id' => $dealId
            ];
            file_put_contents('api_debug.txt', "Adding note: " . json_encode($noteData) . "\n", FILE_APPEND);
            makePipedriveRequest('POST', 'notes', $noteData, $apiToken, $apiDomain);
        } catch (Exception $e) {
            file_put_contents('api_debug.txt', "Note creation failed (non-critical): " . $e->getMessage() . "\n", FILE_APPEND);
            // Не падаем если заметка не создалась - сделка уже создана
        }
    }
    
    return $response['data'];
}

/**
 * Форматирует адрес
 */
function formatAddress($data) {
    $parts = array_filter([
        $data['address'] ?? '',
        $data['city'] ?? '',
        $data['state'] ?? '',
        $data['zipCode'] ?? ''
    ]);
    
    return implode(', ', $parts);
}

/**
 * Выполняет запрос к Pipedrive API БЕЗ cURL
 */
//function makePipedriveRequest($method, $endpoint, $data = null, $apiToken = null) {
	//    $baseUrl = 'https://api.pipedrive.com/v1';
function makePipedriveRequest($method, $endpoint, $data = null, $apiToken = null, $apiDomain = '') {
    // Для sandbox используем company-specific URL
    if (strpos($apiDomain, 'sandbox') !== false) {
		// Если domain уже содержит .pipedrive.com, не добавляем повторно
		if (strpos($apiDomain, '.pipedrive.com') !== false) {
			$baseUrl = "https://{$apiDomain}/api/v1";
		} else {
			$baseUrl = "https://{$apiDomain}.pipedrive.com/api/v1";
		}
	} else {
		$baseUrl = 'https://api.pipedrive.com/v1';
	}
    $url = "{$baseUrl}/{$endpoint}";
    
    // Добавляем API токен в URL
	//$separator = strpos($url, '?') !== false ? '&' : '?';
	//$url .= $separator . 'api_token=' . urlencode($apiToken);
	// Для sandbox используем Bearer auth, для production - URL параметр
	$useBearer = strpos($apiDomain, 'sandbox') !== false;
	
	if (!$useBearer) {
		// Production: добавляем токен в URL
		$separator = strpos($url, '?') !== false ? '&' : '?';
		$url .= $separator . 'api_token=' . urlencode($apiToken);
	}
    
    file_put_contents('api_debug.txt', "Making {$method} request to: {$url}\n", FILE_APPEND);
    
    // Настройки для file_get_contents
	/*$options = [
        'http' => [
            'method' => $method,
            'header' => [
                'Accept: application/json',
                'User-Agent: Workiz Job Creator 1.0'
			],*/
	$headers = [
		'Accept: application/json',
		'User-Agent: Workiz Job Creator 1.0'
	];
	
	// Для sandbox добавляем Bearer токен
	if ($useBearer) {
		$headers[] = 'Authorization: Bearer ' . $apiToken;
	}

	file_put_contents('api_debug.txt', "Making $method request to: $url\n", FILE_APPEND);
	file_put_contents('api_debug.txt', "Method check: method='$method', has_data=" . ($data ? 'yes' : 'no') . "\n", FILE_APPEND);
	file_put_contents('api_debug.txt', "Method === 'POST': " . ($method === 'POST' ? 'true' : 'false') . "\n", FILE_APPEND);

	$options = [
		'http' => [
			'method' => $method,
			'header' => $headers,
            'timeout' => 30,
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ];
    
    if ($method === 'POST' && $data) {
        $postData = json_encode($data);
        $options['http']['content'] = $postData;
        $options['http']['header'][] = 'Content-Type: application/json';
        $options['http']['header'][] = 'Content-Length: ' . strlen($postData);
        
        file_put_contents('api_debug.txt', "POST data: " . $postData . "\n", FILE_APPEND);
    }
    
    $context = stream_context_create($options);
    
    // Выполняем запрос
    $response = @file_get_contents($url, false, $context);
    
    // Получаем HTTP код из заголовков ответа
    $httpCode = 0;
    if (isset($http_response_header)) {
        foreach ($http_response_header as $header) {
            if (preg_match('/HTTP\/\d\.\d\s+(\d+)/', $header, $matches)) {
                $httpCode = (int)$matches[1];
                break;
            }
        }
    }
    
    file_put_contents('api_debug.txt', "HTTP Code: {$httpCode}\n", FILE_APPEND);
    file_put_contents('api_debug.txt', "Raw Response (first 500 chars): " . substr($response, 0, 500) . "\n", FILE_APPEND);
    
    if ($response === false) {
        $error = error_get_last();
        throw new Exception("HTTP request failed: " . ($error['message'] ?? 'Unknown error'));
    }
    
    if (empty($response)) {
        throw new Exception("Empty response from API");
    }
    
    $responseData = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Invalid JSON response: " . json_last_error_msg() . " | Response: " . substr($response, 0, 200));
    }
    
    file_put_contents('api_debug.txt', "Parsed Response: " . json_encode($responseData) . "\n", FILE_APPEND);

	//if ($httpCode >= 400) {
		//    $errorMessage = isset($responseData['error']) ? $responseData['error'] : "HTTP {$httpCode}";
		//    throw new Exception("Pipedrive API error: {$errorMessage}");
		//}
	if ($httpCode >= 400) {
		$errorMessage = isset($responseData['error']) ? $responseData['error'] : "HTTP {$httpCode}";
		
		// Если 401 - возможно истек токен
		if ($httpCode === 401 && strpos($errorMessage, 'Invalid token') !== false) {
			file_put_contents('api_debug.txt', "Got 401 - token may be expired\n", FILE_APPEND);
		}
		
		throw new Exception("Pipedrive API error: {$errorMessage}");
	}
    
    return $responseData;
}

/**
 * Логирует данные
 */
function logJobData($data, $domain = '') {
    $logEntry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'action' => 'CREATE_JOB_ATTEMPT',
        'environment' => strpos($domain, 'sandbox') ? 'sandbox' : 'production',
        'method' => 'file_get_contents',
        'client' => ($data['firstName'] ?? '') . ' ' . ($data['lastName'] ?? ''),
        'email' => $data['email'] ?? '',
        'service' => $data['serviceNeeded'] ?? ''
    ];
    
    file_put_contents('jobs_log.txt', json_encode($logEntry, JSON_PRETTY_PRINT) . "\n---\n", FILE_APPEND | LOCK_EX);
}
?>
