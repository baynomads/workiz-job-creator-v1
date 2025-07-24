// Pipedrive App Extensions SDK Integration
let sdk;
let currentContext = {};
let authToken = null;

// Initialize the Pipedrive App Extensions SDK
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🚀 Initializing Pipedrive App Extensions SDK...');
        
        // Initialize SDK
        sdk = new window.Pipedrive.AppExtensionsSDK();
        await sdk.initialize({
            size: {
                height: 650,
                width: 800
            }
        });
        
        console.log('✅ Pipedrive App Extensions SDK initialized successfully');
        
        // Get signed token (optional for PHP version)
        try {
            const tokenData = await sdk.execute('get-signed-token');
            authToken = tokenData.token;
        } catch (tokenError) {
            console.warn('⚠️ Could not get JWT token:', tokenError);
            authToken = 'session-based'; // PHP uses sessions
        }
        
        // Get current context (deal, person, etc.)
        try {
            currentContext = await sdk.execute('get-current-context') || {};
            console.log('📋 Current context:', currentContext);
        } catch (contextError) {
            console.warn('⚠️ Could not get context:', contextError);
            currentContext = {};
        }
        
        // Pre-fill form if we have context data
        prefillFormFromContext();
        
        // Update UI to show connection status
        updateConnectionStatus(true);
        
    } catch (error) {
        console.error('❌ Failed to initialize Pipedrive App Extensions SDK:', error);
        updateConnectionStatus(false);
        
        // Fallback: PHP version uses sessions
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('🔧 Development mode detected, using PHP sessions');
            authToken = 'session-based';
        }
    }
    
    // Set minimum date to today
    document.getElementById('preferredDate').min = new Date().toISOString().split('T')[0];
    
    // Initialize event listeners
    initializeEventListeners();
});

// Pre-fill form based on current Pipedrive context
function prefillFormFromContext() {
    if (!currentContext) return;
    
    try {
        // If we're in a person context, pre-fill client details
        if (currentContext.person) {
            const person = currentContext.person;
            console.log('👤 Pre-filling from person:', person);
            
            if (person.name) {
                const nameParts = person.name.split(' ');
                document.getElementById('firstName').value = nameParts[0] || '';
                document.getElementById('lastName').value = nameParts.slice(1).join(' ') || '';
            }
            
            if (person.phone && person.phone.length > 0) {
                document.getElementById('phone').value = person.phone[0].value || '';
            }
            
            if (person.email && person.email.length > 0) {
                document.getElementById('email').value = person.email[0].value || '';
            }
        }
        
        // If we're in a deal context, we might pre-fill some job details
        if (currentContext.deal) {
            console.log('💼 Deal context available:', currentContext.deal);
        }
        
        // If we're in an organization context, pre-fill address
        if (currentContext.organization) {
            if (currentContext.organization.address) {
                document.getElementById('address').value = currentContext.organization.address || '';
            }
        }
        
    } catch (error) {
        console.error('⚠️ Error pre-filling form:', error);
    }
}

// Update connection status in UI
function updateConnectionStatus(connected) {
    const statusDiv = document.getElementById('statusInfo');
    
    if (connected) {
        statusDiv.innerHTML = '📋 <strong>Pipedrive Integration Active</strong> - This job will be created as a new deal in your pipeline.';
        statusDiv.style.background = '#ebf4ff';
        statusDiv.style.borderColor = '#bee3f8';
        statusDiv.style.color = '#2b6cb0';
    } else {
        statusDiv.innerHTML = '⚠️ <strong>Pipedrive Connection Issue</strong> - Please check your app configuration.';
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
        
        console.log('📝 Form data collected:', jobData);
        
        // 🔍 ОТЛАДКА: Проверяем данные перед отправкой
        console.log('📤 Sending data to API:', JSON.stringify(jobData));
        
        // Send to our PHP API
        console.log('🚀 Making API request to api.php...');
        const response = await fetch('api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jobData)
        });
        
        console.log('📥 API Response status:', response.status);
        console.log('📥 API Response headers:', response.headers);
        
        // 🔍 ОТЛАДКА: Смотрим сырой ответ
        const responseText = await response.text();
        console.log('📄 Raw API response:', responseText);
        
        // Пытаемся парсить JSON
        let result;
        try {
            result = JSON.parse(responseText);
            console.log('✅ Parsed JSON result:', result);
        } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError);
            console.error('❌ Response text that failed to parse:', responseText);
            throw new Error('Invalid JSON response from server: ' + responseText.substring(0, 100));
        }
        
        if (result.success) {
            console.log('✅ SUCCESS! Job created:', result.data);
            
            // Show success message
            successMessage.style.display = 'block';
            
            // Show snackbar in Pipedrive
            if (sdk) {
                try {
                    await sdk.execute('show-snackbar', {
                        message: 'Job created successfully!',
                        link: {
                            url: result.data.pipedrive_url || `https://${currentContext.api_domain || 'app.pipedrive.com'}/deal/${result.data.deal_id}`,
                            label: 'View Deal'
                        }
                    });
                } catch (snackbarError) {
                    console.warn('⚠️ Could not show snackbar:', snackbarError);
                }
            }
            
            // Clear form
            document.getElementById('jobForm').reset();
            
            // Close modal after 2 seconds
            setTimeout(() => {
                handleCancel();
            }, 2000);
            
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
                console.warn('⚠️ Could not show error snackbar:', snackbarError);
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
            sdk.execute('close-modal');
        } else {
            // Fallback for testing outside Pipedrive
            window.close();
        }
    } catch (error) {
        console.error('⚠️ Error closing modal:', error);
        // Last resort fallback
        window.close();
    }
}

// Error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('🚨 Unhandled promise rejection:', event.reason);
});

// Log when app is fully loaded
window.addEventListener('load', function() {
    console.log('🚀 Workiz Job Creator App Extensions loaded successfully');
});