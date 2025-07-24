// Pipedrive App Extensions SDK Integration
let sdk;
let currentContext = {};
let authToken = null;

// Initialize the Pipedrive App Extensions SDK
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🚀 Initializing Pipedrive App Extensions SDK...');
        
        // Initialize SDK with proper configuration
        sdk = new window.Pipedrive.AppExtensionsSDK();
        
        // ВАЖНО: Добавляем правильную инициализацию
        await sdk.initialize({
            size: {
                height: 650,
                width: 800
            },
            // Указываем ID модального окна из Developer Hub (замените на ваш реальный ID)
            // Этот ID можно найти в Developer Hub -> App extensions -> Custom modal
            action_id: '0c943aae-4f11-477e-bf7b-d244e31298b7' // Раскомментируйте и добавьте ваш ID
        });
        
        console.log('✅ Pipedrive App Extensions SDK initialized successfully');
        
        // Get signed token 
        try {
            const tokenData = await sdk.execute('get-signed-token');
            authToken = tokenData.token;
            console.log('🔑 JWT token received');
        } catch (tokenError) {
            console.warn('⚠️ Could not get JWT token (using PHP sessions):', tokenError);
            authToken = 'session-based';
        }
        
        // Get current context
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
        
        // Notify Pipedrive that modal is ready
        try {
            await sdk.execute('resize', { height: 650, width: 800 });
            console.log('📐 Modal resized successfully');
        } catch (resizeError) {
            console.warn('⚠️ Could not resize modal:', resizeError);
        }
        
    } catch (error) {
        console.error('❌ Failed to initialize Pipedrive App Extensions SDK:', error);
        updateConnectionStatus(false);
        
        // Fallback: Show error message
        showInitializationError(error);
    }
    
    // Set minimum date to today
    document.getElementById('preferredDate').min = new Date().toISOString().split('T')[0];
    
    // Initialize event listeners
    initializeEventListeners();
});

// Show initialization error
function showInitializationError(error) {
    const statusDiv = document.getElementById('statusInfo');
    statusDiv.innerHTML = `
        ❌ <strong>Initialization Error:</strong> ${error.message}<br>
        <small>Please check Developer Hub configuration and app installation.</small>
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
            console.log('👤 Pre-filling from person:', person.name);
            
            if (person.name) {
                const nameParts = person.name.split(' ');
                if (nameParts.length > 0) {
                    document.getElementById('firstName').value = nameParts[0] || '';
                    document.getElementById('lastName').value = nameParts.slice(1).join(' ') || '';
                }
            }
            
            // Fill phone - handle different formats
            if (person.phone && Array.isArray(person.phone) && person.phone.length > 0) {
                document.getElementById('phone').value = person.phone[0].value || '';
            } else if (person.phone && typeof person.phone === 'string') {
                document.getElementById('phone').value = person.phone;
            }
            
            // Fill email - handle different formats  
            if (person.email && Array.isArray(person.email) && person.email.length > 0) {
                document.getElementById('email').value = person.email[0].value || '';
            } else if (person.email && typeof person.email === 'string') {
                document.getElementById('email').value = person.email;
            }
        }
        
        // If we're in a deal context, pre-fill some job details
        if (currentContext.deal) {
            console.log('💼 Deal context available:', currentContext.deal.title);
            
            // Try to extract service type from deal title
            const dealTitle = currentContext.deal.title || '';
            const serviceTypes = ['plumbing', 'electrical', 'hvac', 'repair', 'maintenance', 'installation'];
            
            for (const service of serviceTypes) {
                if (dealTitle.toLowerCase().includes(service)) {
                    const serviceSelect = document.getElementById('serviceNeeded');
                    const capitalizedService = service.charAt(0).toUpperCase() + service.slice(1);
                    
                    // Find and select the matching option
                    for (const option of serviceSelect.options) {
                        if (option.value.toLowerCase() === capitalizedService.toLowerCase()) {
                            option.selected = true;
                            break;
                        }
                    }
                    break;
                }
            }
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

// Update connection status in UI
function updateConnectionStatus(connected) {
    const statusDiv = document.getElementById('statusInfo');
    
    if (connected) {
        statusDiv.innerHTML = `
            📋 <strong>Pipedrive Integration Active</strong> - Connected to ${currentContext.api_domain || 'Pipedrive'}<br>
            <small>This job will be created as a new deal in your pipeline.</small>
        `;
        statusDiv.style.background = '#ebf4ff';
        statusDiv.style.borderColor = '#bee3f8';
        statusDiv.style.color = '#2b6cb0';
    } else {
        statusDiv.innerHTML = `
            ⚠️ <strong>Pipedrive Connection Issue</strong><br>
            <small>Please check your app configuration in Developer Hub.</small>
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
        
        console.log('📝 Form data collected:', jobData);
        
        // Send to PHP API
        console.log('🚀 Making API request to api.php...');
        const response = await fetch('api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Передаем JWT токен если есть
                ...(authToken && authToken !== 'session-based' ? {
                    'Authorization': `Bearer ${authToken}`
                } : {})
            },
            body: JSON.stringify(jobData)
        });
        
        console.log('📥 API Response status:', response.status);
        
        const responseText = await response.text();
        console.log('📄 Raw API response:', responseText);
        
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
                Deal: ${result.data.deal_title}<br>
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
                    console.warn('⚠️ Could not show snackbar:', snackbarError);
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
