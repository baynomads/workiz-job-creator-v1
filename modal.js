// Pipedrive App Extensions SDK Integration - ПРАВИЛЬНАЯ ВЕРСИЯ
let sdk;
let currentContext = {};
let authToken = null;

// Initialize the Pipedrive App Extensions SDK
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🚀 Initializing Pipedrive App Extensions SDK (CORRECT VERSION)...');
        
        // Получаем identifier из URL (НЕ action_id!)
        const urlParams = new URLSearchParams(window.location.search);
        const identifier = urlParams.get('id');
        const userId = urlParams.get('userId');
        const companyId = urlParams.get('companyId');
        
        console.log('🆔 Identifier from URL:', identifier);
        console.log('👤 User ID:', userId);
        console.log('🏢 Company ID:', companyId);
        
        if (!identifier) {
            throw new Error('No identifier found in URL parameters - this means the modal was not opened correctly from Pipedrive');
        }
        
        // Ждем загрузки SDK
        await waitForRealSDK();
        
        // Выбираем доступный SDK
        const SDKConstructor = window.Pipedrive?.AppExtensionsSDK || window.AppExtensionsSDK;
        
        if (!SDKConstructor) {
            // Создаем emergency fallback SDK
            console.warn('🆘 No SDK available, creating emergency fallback');
            
            sdk = {
                execute: function(command, params) {
                    console.log('🆘 Emergency SDK execute:', command, params);
                    
                    if (command === 'get-current-context') {
                        return Promise.resolve({
                            identifier: identifier,
                            userId: userId,
                            companyId: companyId,
                            api_domain: 'baymanapllc-sandbox.pipedrive.com',
                            person: urlParams.get('selectedIds') ? {
                                id: urlParams.get('selectedIds'),
                                name: 'Selected Person'
                            } : null
                        });
                    }
                    
                    if (command === 'get-signed-token') {
                        return Promise.resolve({ token: 'emergency-token' });
                    }
                    
                    return Promise.resolve({ success: true });
                }
            };
            
            // Уведомляем Pipedrive что готовы
            if (window.parent !== window) {
                try {
                    window.parent.postMessage({
                        type: 'pipedriveAppExtensionReady',
                        identifier: identifier
                    }, '*');
                    console.log('🆘 Emergency ready signal sent');
                } catch (e) {
                    console.log('🆘 Emergency signal failed:', e);
                }
            }
        } else {
            // ПРАВИЛЬНАЯ инициализация SDK
            console.log('📡 Initializing SDK with identifier:', identifier);
            
            try {
                // Способ 1: Автоматическое чтение identifier из URL
                sdk = await new SDKConstructor().initialize({
                    size: {
                        height: 650,
                        width: 800
                    }
                });
                console.log('✅ SDK initialized successfully (auto-detect method)');
                
            } catch (autoError) {
                console.warn('⚠️ Auto-detect failed, trying manual identifier:', autoError.message);
                
                // Способ 2: Ручная передача identifier
                sdk = await new SDKConstructor({
                    identifier: identifier
                }).initialize({
                    size: {
                        height: 650,
                        width: 800
                    }
                });
                console.log('✅ SDK initialized successfully (manual method)');
            }
        }
        
        console.log('✅ Pipedrive App Extensions SDK initialized successfully');
        
        // Get signed token
        try {
            const tokenData = await sdk.execute('get-signed-token');
            authToken = tokenData.token;
            console.log('🔑 JWT token received successfully');
        } catch (tokenError) {
            console.warn('⚠️ Could not get JWT token:', tokenError.message);
            authToken = 'session-based';
        }
        
        // Get current context
        try {
            currentContext = await sdk.execute('get-current-context') || {};
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
            await sdk.execute('resize', { height: 650, width: 800 });
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
        const maxAttempts = 15; // 3 seconds total (15 * 200ms)
        
        const checkSDK = () => {
            attempts++;
            
            // Проверяем оба варианта SDK
            if ((window.Pipedrive && window.Pipedrive.AppExtensionsSDK) || window.AppExtensionsSDK) {
                const sdkType = window.Pipedrive?.AppExtensionsSDK ? 'Official Pipedrive SDK' : 'Fallback SDK';
                console.log(`✅ ${sdkType} available after ${attempts * 200}ms`);
                resolve();
            } else if (attempts >= maxAttempts) {
                console.log('⏰ SDK loading timeout - will use emergency fallback');
                resolve(); // Не reject, а resolve - будем использовать emergency fallback
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
function prefillFormFromContext() {
    if (!currentContext) return;
    
    try {
        console.log('🔍 Pre-filling form from context...', currentContext);
        
        // If we're in a person context, pre-fill client details
        if (currentContext.person) {
            const person = currentContext.person;
            console.log('👤 Pre-filling from person:', person);
            
            fillPersonData(person);
        }
        
        // If we're in a deal context, pre-fill some job details
        if (currentContext.deal) {
            console.log('💼 Deal context available:', currentContext.deal.title);
            fillDealData(currentContext.deal);
        }
        
        // If we're in an organization context, pre-fill address
        if (currentContext.organization && currentContext.organization.address) {
            document.getElementById('address').value = currentContext.organization.address || '';
        }
        
        console.log('✅ Form pre-filled successfully');
        
    } catch (error) {
        console.error('⚠️ Error pre-filling form:', error);
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
    loading.classList.add('show');
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
                <small>Deal ID: ${result.data.deal_id}</small>
            `;
            successMessage.style.display = 'block';
            
            // Show snackbar in Pipedrive
            if (sdk) {
                try {
                    await sdk.execute('show-snackbar', {
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
            
            // Clear form
            document.getElementById('jobForm').reset();
            
            // Close modal after 3 seconds
            setTimeout(() => {
                handleCancel();
            }, 3000);
            
        } else {
            console.error('❌ API returned error:', result.error);
            throw new Error(result.error || 'Failed to create job');
        }
        
    } catch (error) {
        console.error('❌ Error creating job:', error);
        
        errorMessage.style.display = 'block';
        document.getElementById('errorDetails').textContent = error.message;
        
        // Show error snackbar in Pipedrive
        if (sdk) {
            try {
                await sdk.execute('show-snackbar', {
                    message: `Error creating job: ${error.message}`
                });
            } catch (snackbarError) {
                console.warn('⚠️ Could not show error snackbar:', snackbarError.message);
            }
        }
        
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        loading.classList.remove('show');
        submitBtn.innerHTML = '🚀 Create Job';
        
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
        if (sdk) {
            // Close the modal using SDK
            console.log('🚪 Closing modal via SDK');
            sdk.execute('close-modal');
        } else {
            // Fallback for testing outside Pipedrive
            console.log('🚪 Closing modal via window.close()');
            window.close();
        }
    } catch (error) {
        console.error('⚠️ Error closing modal:', error);
        window.close();
    }
}

// Error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('🚨 Unhandled promise rejection:', event.reason);
});

// Log when app is fully loaded
window.addEventListener('load', function() {
    console.log('🚀 Workiz Job Creator Modal loaded successfully');
});
