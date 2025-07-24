<?php
session_start();

// OAuth Configuration - ЗАМЕНИТЕ НА ВАШИ ДАННЫЕ!
$CLIENT_ID = '5e85428e245a85b3';
$CLIENT_SECRET = 'cf423f70d74e11cf84d6fb2b649e26a79e5d3e4f';
$REDIRECT_URI = 'https://x.tor.kg/public/workiz-job-creator-v1/oauth-callback.php';

$action = $_GET['action'] ?? 'home';

switch ($action) {
    case 'home':
        showHomePage();
        break;
    case 'install':
        redirectToOAuth();
        break;
    case 'success':
        showSuccessPage();
        break;
    case 'modal':
        showModal();
        break;
    case 'uninstall':
        handleUninstall();
        break;
    default:
        showHomePage();
}

function redirectToOAuth() {
    global $CLIENT_ID, $REDIRECT_URI;
    
    if (empty($CLIENT_ID) || $CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
        die('OAuth not configured. Please set CLIENT_ID and CLIENT_SECRET.');
    }
    
    $authUrl = 'https://oauth.pipedrive.com/oauth/authorize?' . http_build_query([
        'client_id' => $CLIENT_ID,
        'redirect_uri' => $REDIRECT_URI,
        'response_type' => 'code',
        'scope' => 'base deals:read deals:write persons:read persons:write notes:write'
    ]);
    
    header('Location: ' . $authUrl);
    exit;
}

function showHomePage() {
    global $CLIENT_ID;
    $isInstalled = isset($_SESSION['user']) && isset($_SESSION['user']['access_token']);
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🔧 Workiz Job Creator</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 40px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: #333;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                padding: 40px;
                border-radius: 16px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                text-align: center;
            }
            .logo {
                font-size: 48px;
                margin-bottom: 20px;
            }
            h1 {
                color: #4299e1;
                margin: 0 0 10px 0;
                font-size: 32px;
            }
            .subtitle {
                color: #666;
                margin-bottom: 40px;
                font-size: 18px;
            }
            .btn {
                display: inline-block;
                padding: 16px 32px;
                background: #4299e1;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                transition: all 0.3s ease;
                border: none;
                cursor: pointer;
                margin: 10px;
            }
            .btn:hover {
                background: #3182ce;
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(66, 153, 225, 0.3);
            }
            .btn-success {
                background: #10b981;
            }
            .btn-success:hover {
                background: #059669;
            }
            .btn-secondary {
                background: #6b7280;
            }
            .btn-secondary:hover {
                background: #4b5563;
            }
            .status {
                padding: 20px;
                border-radius: 8px;
                margin: 30px 0;
            }
            .status.success {
                background: #ecfdf5;
                border: 2px solid #10b981;
                color: #047857;
            }
            .status.warning {
                background: #fefce8;
                border: 2px solid #eab308;
                color: #a16207;
            }
            .features {
                text-align: left;
                margin: 40px 0;
            }
            .feature {
                display: flex;
                align-items: center;
                margin: 15px 0;
                font-size: 16px;
            }
            .feature-icon {
                font-size: 24px;
                margin-right: 15px;
                width: 30px;
            }
            .user-info {
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: left;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">🔧</div>
            <h1>Workiz Job Creator</h1>
            <p class="subtitle">Create service jobs directly from your Pipedrive deals and contacts</p>
            
            <?php if ($isInstalled): ?>
                <div class="status success">
                    <h3>✅ App Successfully Installed!</h3>
                    <p>Your Workiz Job Creator is ready to use in Pipedrive.</p>
                </div>
                
                <div class="user-info">
                    <h4>👤 Connected Account</h4>
                    <p><strong>Name:</strong> <?= htmlspecialchars($_SESSION['user']['name']) ?></p>
                    <p><strong>Email:</strong> <?= htmlspecialchars($_SESSION['user']['email']) ?></p>
                    <p><strong>Company:</strong> <?= htmlspecialchars($_SESSION['user']['company_name']) ?></p>
                    <p><strong>Domain:</strong> <?= htmlspecialchars($_SESSION['user']['api_domain']) ?></p>
                </div>
                
                <div class="features">
                    <h4>🚀 How to use:</h4>
                    <div class="feature">
                        <span class="feature-icon">💼</span>
                        <span>Open any <strong>Deal</strong> in Pipedrive</span>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">👤</span>
                        <span>Or open any <strong>Person</strong> profile</span>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">⋯</span>
                        <span>Click the <strong>three-dot menu</strong></span>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">🔧</span>
                        <span>Select <strong>"Create Job"</strong></span>
                    </div>
                    <div class="feature">
                        <span class="feature-icon">📝</span>
                        <span>Fill the form and create your service job!</span>
                    </div>
                </div>
                
                <p>
                    <a href="?action=modal" class="btn btn-success" target="_blank">🧪 Test Modal</a>
                    <a href="?action=uninstall" class="btn btn-secondary">🗑️ Uninstall App</a>
                </p>
                
            <?php else: ?>
                <?php if (empty($CLIENT_ID) || $CLIENT_ID === 'YOUR_CLIENT_ID_HERE'): ?>
                    <div class="status warning">
                        <h3>⚠️ Configuration Required</h3>
                        <p>Please configure OAuth credentials in index.php before installation.</p>
                    </div>
                <?php else: ?>
                    <div class="features">
                        <h4>✨ Features:</h4>
                        <div class="feature">
                            <span class="feature-icon">🔧</span>
                            <span>Create service jobs from any deal or contact</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">👤</span>
                            <span>Automatically create contacts and deals</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">📅</span>
                            <span>Schedule appointments with preferred dates</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">📍</span>
                            <span>Track service locations and details</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">👨‍🔧</span>
                            <span>Assign technicians to jobs</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">🚨</span>
                            <span>Set priority levels for urgent requests</span>
                        </div>
                    </div>
                    
                    <a href="?action=install" class="btn">🚀 Install App</a>
                <?php endif; ?>
            <?php endif; ?>
            
            <hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">
            
            <div style="font-size: 14px; color: #666;">
                <p>
                    <a href="privacy.html" target="_blank" style="color: #4299e1;">Privacy Policy</a> |
                    <a href="terms.html" target="_blank" style="color: #4299e1;">Terms of Service</a>
                </p>
                <p>© 2025 Workiz Job Creator. Made for Pipedrive users.</p>
            </div>
        </div>
    </body>
    </html>
    <?php
}

function showSuccessPage() {
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Installation Successful - Workiz Job Creator</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 40px 20px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                min-height: 100vh;
                text-align: center;
                color: white;
            }
            .container {
                max-width: 500px;
                margin: 0 auto;
                padding: 40px;
            }
            .success-icon {
                font-size: 80px;
                margin-bottom: 30px;
                animation: bounce 1s ease-in-out;
            }
            @keyframes bounce {
                0%, 20%, 60%, 100% { transform: translateY(0); }
                40% { transform: translateY(-20px); }
                80% { transform: translateY(-10px); }
            }
            h1 {
                font-size: 36px;
                margin: 0 0 20px 0;
            }
            p {
                font-size: 18px;
                opacity: 0.9;
                margin-bottom: 30px;
            }
            .btn {
                display: inline-block;
                padding: 16px 32px;
                background: white;
                color: #10b981;
                text-decoration: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                transition: all 0.3s ease;
            }
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(0,0,0,0.2);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="success-icon">🎉</div>
            <h1>Installation Successful!</h1>
            <p>Workiz Job Creator has been successfully installed and connected to your Pipedrive account.</p>
            <p>You can now create service jobs directly from deals and contacts!</p>
            <a href="?action=home" class="btn">🏠 Go to App Dashboard</a>
        </div>
        
        <script>
            // Auto-redirect after 5 seconds
            setTimeout(function() {
                window.location.href = '?action=home';
            }, 5000);
        </script>
    </body>
    </html>
    <?php
}


function showModal() {
	// ОТЛАДКА - добавь в начало функции
	file_put_contents('index_debug.txt', "=== " . date('Y-m-d H:i:s') . " ===\n", FILE_APPEND);
	file_put_contents('index_debug.txt', "DEBUG showModal: Called with GET: " . json_encode($_GET) ."\n", FILE_APPEND);

	// Для iframe используем JWT токен от Pipedrive, сессия не нужна
	if (!empty($_GET['token'])) {
		file_put_contents('index_debug.txt', "Using JWT token from Pipedrive\n", FILE_APPEND);
		file_put_contents('index_debug.txt', "Session exists: " . (isset($_SESSION['user']) ? 'YES' : 'NO') . "\n", FILE_APPEND);
		
		if (isset($_SESSION['user'])) {
			file_put_contents('index_debug.txt', "Session user data: " . json_encode($_SESSION['user']) . "\n", FILE_APPEND);
			
			// Используем сессионный API токен!
			$tempUserData = $_SESSION['user'];
		} else {
			file_put_contents('index_debug.txt', "No session found, trying file storage\n", FILE_APPEND);
			
			$userId = $_GET['userId'] ?? '';
			$companyId = $_GET['companyId'] ?? '';
			$userFile = "user_data_{$userId}_{$companyId}.json";
			
			if (file_exists($userFile)) {
				$tempUserData = json_decode(file_get_contents($userFile), true);
				file_put_contents('index_debug.txt', "Loaded from file: $userFile\n", FILE_APPEND);
			} else {
				file_put_contents('index_debug.txt', "File not found: $userFile, using JWT fallback\n", FILE_APPEND);
				$tempUserData = [
					'access_token' => $_GET['token'],
					'api_domain' => 'baymanapllc-sandbox.pipedrive.com'
				];
			}
		} /*else {
			file_put_contents('index_debug.txt', "No session found, creating fallback\n", FILE_APPEND);
			/*$tempUserData = [
				'access_token' => $_GET['token'], // Fallback к JWT
				'api_domain' => 'baymanapllc-sandbox.pipedrive.com'
			];
		}*/
	} else {
		file_put_contents('index_debug.txt', "Using session data\n", FILE_APPEND);
		$tempUserData = $_SESSION['user'];
	}
	
	file_put_contents('index_debug.txt', "Final tempUserData: " . json_encode($tempUserData) . "\n", FILE_APPEND);

    // ПОЛУЧАЕМ ПАРАМЕТРЫ ОТ PIPEDRIVE
    $identifier = $_GET['id'] ?? 'unknown';
    $userId = $_GET['userId'] ?? '';
    $companyId = $_GET['companyId'] ?? '';
    $selectedIds = $_GET['selectedIds'] ?? '';
    $jwtToken = $_GET['token'] ?? ''; // JWT от Pipedrive

	// ОТЛАДКА - проверяем параметры
	file_put_contents('index_debug.txt', "DEBUG: identifier=$identifier, userId=$userId, companyId=$companyId" ."\n", FILE_APPEND);

	// JWT токен только для передачи, API токен всегда из сессии
	$accessToken = $jwtToken; // Для передачи в JS
	$realApiToken = $tempUserData['access_token']; // Реальный API токен
	$apiDomain = $tempUserData['api_domain'];
    $version = time();

	// ОТЛАДКА - проверяем файл
    if (!file_exists('modal.html')) {
		file_put_contents('index_debug.txt', "ERROR: modal.html not found!" ."\n", FILE_APPEND);
        die('modal.html file not found');
    }

    $modalContent = file_get_contents('modal.html');

	// ОТЛАДКА - проверяем содержимое
    if ($modalContent === false) {
		file_put_contents('index_debug.txt', "ERROR: Could not read modal.html" ."\n", FILE_APPEND);
        die('Could not read modal.html');
    }
	file_put_contents('index_debug.txt', "DEBUG: modal.html size: " . strlen($modalContent) . " bytes" ."\n", FILE_APPEND);

    // Cache busting
    $modalContent = str_replace(
        'src="modal.js"', 
        'src="modal.js?v=' . $version . '"', 
        $modalContent
    );

	// ОТЛАДКА - проверяем что заменилось
	file_put_contents('index_debug.txt', "After modal.js replacement, looking for: src=\"modal.js?v=" . $version . "\"\n", FILE_APPEND);
    
    // ПЕРЕДАЕМ ВСЕ ДАННЫЕ В JAVASCRIPT
    $tokenScript = "
    <script>
        window.PIPEDRIVE_TOKEN = '" . addslashes($accessToken) . "';
        window.PIPEDRIVE_DOMAIN = '" . addslashes($apiDomain) . "';
        window.PIPEDRIVE_IDENTIFIER = '" . addslashes($identifier) . "';
        window.PIPEDRIVE_USER_ID = '" . addslashes($userId) . "';
        window.PIPEDRIVE_COMPANY_ID = '" . addslashes($companyId) . "';
        window.PIPEDRIVE_SELECTED_IDS = '" . addslashes($selectedIds) . "';
		//window.PIPEDRIVE_API_TOKEN = '" . addslashes($realApiToken) . "';
		window.PIPEDRIVE_REAL_API_TOKEN = '" . addslashes($tempUserData['access_token']) . "';
    	console.log('🔑 Pipedrive credentials loaded with identifier:', '" . addslashes($identifier) . "');
    </script>";
    
    $modalContent = str_replace('</head>', $tokenScript . '</head>', $modalContent);

	// Простая замена без сложных манипуляций
	//$modalContent = str_replace('modal.js', 'modal.js?v=' . $version, $modalContent);
	//$modalContent = str_replace('</head>', $tokenScript . '</head>', $modalContent);

	// ОТЛАДКА - проверяем итоговый HTML (первые 500 символов)
	//file_put_contents('index_debug.txt', "Final HTML preview: " . substr($modalContent, 0, 500) . "...\n", FILE_APPEND);
	// ОТЛАДКА - проверяем итоговый размер
	file_put_contents('index_debug.txt', "DEBUG: Final content size: " . strlen($modalContent) . " bytes" ."\n", FILE_APPEND);

    echo $modalContent;
}

function handleUninstall() {
    // Очищаем данные пользователя
    session_destroy();
    
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>App Uninstalled - Workiz Job Creator</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 40px 20px;
                background: #f3f4f6;
                min-height: 100vh;
                text-align: center;
                color: #333;
            }
            .container {
                max-width: 500px;
                margin: 0 auto;
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .uninstall-icon {
                font-size: 60px;
                margin-bottom: 20px;
                opacity: 0.6;
            }
            h1 {
                color: #6b7280;
                margin: 0 0 20px 0;
            }
            p {
                color: #6b7280;
                margin-bottom: 30px;
            }
            .btn {
                display: inline-block;
                padding: 12px 24px;
                background: #4299e1;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="uninstall-icon">👋</div>
            <h1>App Uninstalled</h1>
            <p>Workiz Job Creator has been successfully removed from your account.</p>
            <p>Thank you for using our app!</p>
            <a href="?action=home" class="btn">🏠 Return to Home</a>
        </div>
    </body>
    </html>
    <?php
	file_put_contents('index_debug.txt', "=== END ===\n\n", FILE_APPEND);
}
?>
