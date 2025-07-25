// Pipedrive App Extensions SDK Integration - ПРАВИЛЬНАЯ ВЕРСИЯ
let sdk;
let currentContext = {};
let authToken = null;
// Получаем токен из глобальной переменной
if (window.PIPEDRIVE_TOKEN) {
    authToken = window.PIPEDRIVE_TOKEN;
    console.log('🔑 Token loaded from window:', authToken.substring(0, 20) + '...');
} else {
    console.log('🔑 NO TOKEN in window.PIPEDRIVE_TOKEN!');
}

// Initialize the Pipedrive App Extensions SDK
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🚀 Initializing Pipedrive App Extensions SDK (CORRECT VERSION)...');
        
        // Получаем identifier из URL (НЕ action_id!)
        const urlParams = new URLSearchParams(window.location.search);
		const identifier = window.PIPEDRIVE_IDENTIFIER || urlParams.get('id');
		const userId = window.PIPEDRIVE_USER_ID || urlParams.get('userId');
		const companyId = window.PIPEDRIVE_COMPANY_ID || urlParams.get('companyId');
        
        console.log('🆔 Identifier from URL:', identifier);
        console.log('👤 User ID:', userId);
        console.log('🏢 Company ID:', companyId);

        
        if (!identifier) {
            throw new Error('No identifier found in URL parameters - this means the modal was not opened correctly from Pipedrive');
        }
        
        // Ждем загрузки SDK
        await waitForRealSDK();
        
        // Используем глобальный AppExtensionsSDK
		if (!window.AppExtensionsSDK) {
			throw new Error('AppExtensionsSDK not loaded');
		}
		
		// Простая инициализация
		sdk = await new AppExtensionsSDK().initialize({
			size: {
				height: 950,
				width: 800
			}
		});
		
		console.log('✅ SDK initialized successfully');
        
		// Get signed token
		try {
			const tokenData = await sdk.execute('getSignedToken');
			authToken = tokenData.token;
			console.log('🔑 JWT token received from SDK successfully');
		} catch (tokenError) {
			console.warn('⚠️ Could not get JWT token from SDK, using window token:', tokenError.message);
			// Используем токен из window если SDK не работает
			if (window.PIPEDRIVE_TOKEN) {
				authToken = window.PIPEDRIVE_TOKEN;
				console.log('🔑 Using JWT token from window');
			} else {
				authToken = 'session-based';
			}
		}
        
        // Get current context
        try {
			currentContext = await sdk.execute('getCurrentContext') || {};
            console.log('📋 Current context received:', currentContext);
            
            // Дополнительно извлекаем данные из URL если контекст пустой
            if (!currentContext.person && urlParams.get('selectedIds')) {
                currentContext.person = {
                    id: urlParams.get('selectedIds'),
                    name: 'Selected Person'
                };
                console.log('📋 Enhanced context with URL data');
            }
            
            currentContext.identifier = identifier;
            currentContext.userId = userId;
            currentContext.companyId = companyId;
            
        } catch (contextError) {
            console.warn('⚠️ Could not get context:', contextError.message);
            
            // Fallback контекст из URL
            currentContext = {
                identifier: identifier,
                userId: userId,
                companyId: companyId,
                api_domain: 'baymanapllc-sandbox.pipedrive.com'
            };
            
            if (urlParams.get('selectedIds')) {
                currentContext.person = {
                    id: urlParams.get('selectedIds'),
                    name: 'Selected Person from URL'
                };
            }
        }

        // Pre-fill form if we have context data
        prefillFormFromContext();
        
        // Update UI to show connection status
        updateConnectionStatus(true);
        
        // Notify Pipedrive that modal is ready (resize)
        try {
            await sdk.execute('resize', { height: 950, width: 800 });
            console.log('📐 Modal resized successfully');
        } catch (resizeError) {
            console.warn('⚠️ Could not resize modal:', resizeError.message);
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize Pipedrive App Extensions SDK:', error);
        updateConnectionStatus(false);
        showInitializationError(error);
    }
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('preferredDate').min = today;
    
    // Initialize event listeners
    initializeEventListeners();
});

// Wait for real SDK to load
function waitForRealSDK() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 10 секунд как у Pipedrive
        
        const checkSDK = () => {
            attempts++;
            
            if (window.AppExtensionsSDK) {
                console.log(`✅ AppExtensionsSDK loaded after ${attempts * 200}ms`);
                resolve();
            } else if (attempts >= maxAttempts) {
                reject(new Error('SDK failed to load within 10 seconds'));
            } else {
                setTimeout(checkSDK, 200);
            }
        };
        
        checkSDK();
    });
}

// Show initialization error
function showInitializationError(error) {
    const statusDiv = document.getElementById('statusInfo');
    statusDiv.innerHTML = `
        ❌ <strong>Initialization Failed</strong><br>
        <small>Error: ${error.message}</small><br>
        <small>This modal must be opened from within Pipedrive</small>
    `;
    statusDiv.style.background = '#fed7d7';
    statusDiv.style.borderColor = '#feb2b2';
    statusDiv.style.color = '#c53030';
}

// Pre-fill form based on current Pipedrive context
async function prefillFormFromContext() {
    if (!currentContext) return;
    
    try {
        console.log('🔍 Pre-filling form from context...', currentContext);
        
        // Если есть person context, получаем полные данные
        if (currentContext.person) {
            const personId = currentContext.person.id;
            console.log('👤 Loading full person data for ID:', personId);
            
            await loadPersonData(personId);
        }
        
        // Если есть deal context, предзаполняем job детали
        if (currentContext.deal) {
            console.log('💼 Deal context available:', currentContext.deal.title);
            fillDealData(currentContext.deal);
        }
        
        console.log('✅ Form pre-filled successfully');
        
    } catch (error) {
        console.error('⚠️ Error pre-filling form:', error);
    }
}

// Load full person data from Pipedrive API
async function loadPersonData(personId) {
    try {
        const response = await fetch('api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && authToken !== 'session-based' ? {
                    'Authorization': `Bearer ${authToken}`
                } : {})
            },
			body: JSON.stringify({
				action: 'get_person',
				person_id: personId,
				pipedrive_api_token: window.PIPEDRIVE_REAL_API_TOKEN || window.PIPEDRIVE_API_TOKEN,
				userId: currentContext.userId,
				companyId: currentContext.companyId
			})
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            fillPersonData(result.data);
            console.log('✅ Person data loaded and filled');
        } else {
            console.warn('⚠️ Could not load person data:', result.error);
        }
        
    } catch (error) {
        console.error('⚠️ Error loading person data:', error);
    }
}

// Fill person data
function fillPersonData(person) {
    if (person.name) {
        const nameParts = person.name.split(' ');
        document.getElementById('firstName').value = nameParts[0] || '';
        document.getElementById('lastName').value = nameParts.slice(1).join(' ') || '';
    }
    
    // Handle phone - different formats possible
    if (person.phone) {
        let phoneValue = '';
        if (Array.isArray(person.phone) && person.phone.length > 0) {
            phoneValue = person.phone[0].value || person.phone[0];
        } else if (typeof person.phone === 'string') {
            phoneValue = person.phone;
        }
        document.getElementById('phone').value = phoneValue;
    }
    
    // Handle email - different formats possible  
    if (person.email) {
        let emailValue = '';
        if (Array.isArray(person.email) && person.email.length > 0) {
            emailValue = person.email[0].value || person.email[0];
        } else if (typeof person.email === 'string') {
            emailValue = person.email;
        }
        document.getElementById('email').value = emailValue;
    }
}

// Fill deal data
function fillDealData(deal) {
    if (deal.title) {
        extractServiceFromTitle(deal.title);
    }
}

// Extract service type from deal title
function extractServiceFromTitle(title) {
    const serviceTypes = [
        { key: 'plumbing', value: 'Plumbing' },
        { key: 'electrical', value: 'Electrical' },
        { key: 'hvac', value: 'HVAC' },
        { key: 'repair', value: 'Repair' },
        { key: 'maintenance', value: 'Maintenance' },
        { key: 'installation', value: 'Installation' }
    ];
    
    const lowerTitle = title.toLowerCase();
    
    for (const service of serviceTypes) {
        if (lowerTitle.includes(service.key)) {
            const serviceSelect = document.getElementById('serviceNeeded');
            for (const option of serviceSelect.options) {
                if (option.value === service.value) {
                    option.selected = true;
                    break;
                }
            }
            break;
        }
    }
}

// Update connection status in UI
function updateConnectionStatus(connected) {
    const statusDiv = document.getElementById('statusInfo');
    
    if (connected) {
        const domain = currentContext.api_domain || 'baymanapllc-sandbox.pipedrive.com';
        const identifier = currentContext.identifier || 'unknown';
        
        // Подробная информация о контексте
        let contextInfo = [];
        if (currentContext.person) {
            contextInfo.push(`Person: ${currentContext.person.name || currentContext.person.id}`);
        }
        if (currentContext.deal) {
            contextInfo.push(`Deal: ${currentContext.deal.title || currentContext.deal.id}`);
        }
        if (currentContext.organization) {
            contextInfo.push(`Org: ${currentContext.organization.name || currentContext.organization.id}`);
        }
        if (contextInfo.length === 0) {
            contextInfo.push('⚠️ No context data - creating new record');
        }
        
        statusDiv.innerHTML = `
            📋 <strong>Pipedrive Integration Active</strong> (✅ Official SDK)<br>
            <small>Connected to ${domain} | ID: ${identifier.substring(0, 8)}...</small><br>
            <small>Context: ${contextInfo.join(', ')}</small>
        `;
        statusDiv.style.background = '#ebf4ff';
        statusDiv.style.borderColor = '#bee3f8';
        statusDiv.style.color = '#2b6cb0';
    } else {
        statusDiv.innerHTML = `
            ❌ <strong>Pipedrive Connection Failed</strong><br>
            <small>Please open this modal from within Pipedrive.</small>
        `;
        statusDiv.style.background = '#fed7d7';
        statusDiv.style.borderColor = '#feb2b2';
        statusDiv.style.color = '#c53030';
    }
}

// Initialize all event listeners
function initializeEventListeners() {
    // Form submission
    document.getElementById('jobForm').addEventListener('submit', handleFormSubmission);
    
    // Cancel button
    document.getElementById('cancelBtn').addEventListener('click', handleCancel);
    
    // Form validation on input
    const requiredFields = document.querySelectorAll('input[required], select[required]');
    requiredFields.forEach(field => {
        field.addEventListener('blur', validateField);
        field.addEventListener('input', clearFieldError);
    });
    
    // Auto-formatting for phone number
    document.getElementById('phone').addEventListener('input', formatPhoneNumber);
    
    // Time validation
    document.getElementById('endTime').addEventListener('change', validateTimeRange);
    
    console.log('🎯 Event listeners initialized');
}

// Handle form submission
async function handleFormSubmission(e) {
    e.preventDefault();
    
    console.log('🔥 FORM SUBMISSION STARTED');

// ОТЛАДКА НАЧАЛО
    console.log('🔑 Current authToken:', authToken);
    console.log('🔑 window.PIPEDRIVE_TOKEN:', window.PIPEDRIVE_TOKEN ? window.PIPEDRIVE_TOKEN.substring(0, 20) + '...' : 'NOT SET');
    console.log('🔑 authToken type:', typeof authToken);
    console.log('🔑 authToken === session-based:', authToken === 'session-based');
    
    const submitBtn = document.getElementById('submitBtn');
    const loading = document.getElementById('loading');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    
    // Hide previous messages
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
    
    // Validate form
    if (!validateForm()) {
        console.log('❌ Form validation failed');
        return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    //loading.classList.add('show');
	if (loading) loading.classList.add('show');
    submitBtn.innerHTML = '⏳ Creating Job... <span class="loading show"></span>';
    
    try {
        // Collect form data
        const formData = new FormData(document.getElementById('jobForm'));
        const jobData = Object.fromEntries(formData.entries());
        
        // Add context data if available
        if (currentContext.person) {
            jobData.pipedrive_person_id = currentContext.person.id;
        }
        if (currentContext.deal) {
            jobData.pipedrive_deal_id = currentContext.deal.id;
        }
        if (currentContext.organization) {
            jobData.pipedrive_org_id = currentContext.organization.id;
        }
        if (currentContext.identifier) {
            jobData.pipedrive_identifier = currentContext.identifier;
        }

		// Передаем реальный API токен
		if (window.PIPEDRIVE_REAL_API_TOKEN) {
			jobData.pipedrive_api_token = window.PIPEDRIVE_REAL_API_TOKEN;
		}
		// Добавляем user данные для автообновления токенов
		jobData.userId = currentContext.userId;
		jobData.companyId = currentContext.companyId;
        
        console.log('📝 Form data collected:', jobData);
        
        // Send to PHP API
        console.log('🚀 Making API request to api.php...');
        const response = await fetch('api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken && authToken !== 'session-based' ? {
                    'Authorization': `Bearer ${authToken}`
                } : {})
            },
            body: JSON.stringify(jobData)
        });

		// Отладка headers
		console.log('📤 Request headers:', {
			'Content-Type': 'application/json',
			...(authToken && authToken !== 'session-based' ? {
				'Authorization': `Bearer ${authToken.substring(0, 20)}...`
			} : {})
		});
        
        console.log('📥 API Response status:', response.status);
        
        const responseText = await response.text();
        console.log('📄 Raw API response:', responseText.substring(0, 200));
        
        let result;
        try {
            result = JSON.parse(responseText);
            console.log('✅ Parsed JSON result:', result);
        } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError);
            throw new Error('Invalid JSON response from server: ' + responseText.substring(0, 100));
        }
        
        if (result.success) {
            console.log('✅ SUCCESS! Job created:', result.data);
            
            // Show success message
            successMessage.innerHTML = `
				✅ <strong>Job Created Successfully!</strong><br>
				Deal: ${result.data.deal_title || 'New Deal'}<br>
				<small>Deal ID: ${result.data.deal_id}</small><br><br>
				<div style="display: flex; gap: 10px; justify-content: center;">
					<button id="viewDealBtn" class="btn btn-primary" style="font-size: 12px; padding: 8px 16px;">
						🔗 View Deal
					</button>
					<button id="closeModalBtn" class="btn btn-secondary" style="font-size: 12px; padding: 8px 16px;">
						✖️ Close
					</button>
				</div>
			`;
			
			// Добавляем обработчики кнопок
			document.getElementById('viewDealBtn').addEventListener('click', () => {
				openDealInPipedrive(result.data.pipedrive_url);
			});
			
			document.getElementById('closeModalBtn').addEventListener('click', handleCancel);

			// ПОКАЗЫВАЕМ success message и скрываем кнопку submit
			successMessage.style.display = 'block';
			submitBtn.style.display = 'none';  // Скрываем кнопку submit
			document.getElementById('cancelBtn').style.display = 'none';  // Скрываем Cancel

            // Show snackbar in Pipedrive
            if (sdk) {
                try {
                    await sdk.execute('showSnackbar', {
                        message: `Job "${result.data.deal_title}" created successfully!`,
                        link: result.data.pipedrive_url ? {
                            url: result.data.pipedrive_url,
                            label: 'View Deal'
                        } : undefined
                    });
                } catch (snackbarError) {
                    console.warn('⚠️ Could not show snackbar:', snackbarError.message);
                }
            }

        } else {
            console.error('❌ API returned error:', result.error);
            throw new Error(result.error || 'Failed to create job');
        }
        
    } catch (error) {
		console.error('❌ Error creating job:', error);
		
		errorMessage.style.display = 'block';
		document.getElementById('errorDetails').textContent = error.message;

		// Сбрасываем кнопку только при ошибке
		submitBtn.disabled = false;
		submitBtn.innerHTML = '🚀 Create Job';
        
        // Show error snackbar in Pipedrive
        if (sdk) {
            try {
                await sdk.execute('showSnackbar', {
                    message: `Error creating job: ${error.message}`
                });
            } catch (snackbarError) {
                console.warn('⚠️ Could not show error snackbar:', snackbarError.message);
            }
        }
        
    } finally {
		// НЕ сбрасываем состояние кнопки при успехе - пусть остается скрытой
		if (loading) loading.classList.remove('show');

		console.log('🏁 Form submission completed');
	}
}

// Form validation
function validateForm() {
    const requiredFields = document.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!validateField({ target: field })) {
            isValid = false;
        }
    });
    
    // Additional custom validations
    if (!validateTimeRange()) {
        isValid = false;
    }
    
    return isValid;
}

// Validate individual field
function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    
    // Remove existing error styling
    field.style.borderColor = '';
    
    if (field.required && !value) {
        field.style.borderColor = '#e53e3e';
        return false;
    }
    
    // Email validation
    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            field.style.borderColor = '#e53e3e';
            return false;
        }
    }
    
    // Phone validation
    if (field.type === 'tel' && value) {
        const phoneRegex = /^[\+]?[\d\s\(\)\-]{10,}$/;
        if (!phoneRegex.test(value)) {
            field.style.borderColor = '#e53e3e';
            return false;
        }
    }
    
    return true;
}

// Clear field error styling
function clearFieldError(e) {
    e.target.style.borderColor = '';
}

// Format phone number as user types
function formatPhoneNumber(e) {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length >= 6) {
        value = value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    } else if (value.length >= 3) {
        value = value.replace(/(\d{3})(\d{3})/, '($1) $2');
    }
    
    e.target.value = value;
}

// Validate time range
function validateTimeRange() {
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    
    if (startTime && endTime && startTime >= endTime) {
        document.getElementById('endTime').style.borderColor = '#e53e3e';
        return false;
    }
    
    document.getElementById('endTime').style.borderColor = '';
    return true;
}

// Handle cancel button click
function handleCancel() {
    try {
        if (sdk && window.AppExtensionsSDK) {
            console.log('🚪 Closing modal via SDK');
            const { Command } = window.AppExtensionsSDK;
            sdk.execute(Command.CLOSE_MODAL);
        } else {
            console.log('🚪 Closing modal via window.close()');
            window.close();
        }
    } catch (error) {
        console.error('⚠️ Error closing modal:', error);
        window.close();
    }
}

// Open deal in Pipedrive and close modal
function openDealInPipedrive(dealUrl) {
    if (dealUrl) {
        window.open(dealUrl, '_blank');
    }
    // Закрываем модал через секунду
    setTimeout(handleCancel, 1000);
}

// Error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('🚨 Unhandled promise rejection:', event.reason);
});

// Log when app is fully loaded
window.addEventListener('load', function() {
    console.log('🚀 Workiz Job Creator Modal loaded successfully');
});
