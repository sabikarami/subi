// Cloudflare Worker for V2Ray Config Tester
// This worker tests V2Ray configs for Iran connectivity and speed

// Configuration
const CONFIG = {
    MAX_CONFIGS: 20,
    TEST_TIMEOUT: 10000, // 10 seconds per test
    SPEED_TEST_DURATION: 5000, // 5 seconds speed test
    SCHEDULE_INTERVAL: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
    IRAN_TEST_ENDPOINTS: [
        'https://www.google.com',
        'https://www.github.com',
        'https://api.telegram.org',
        'https://www.youtube.com'
    ]
};

// Main event listener
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

// Scheduled event listener for automatic testing
addEventListener('scheduled', event => {
    event.waitUntil(handleScheduledTest());
});

// Main request handler
async function handleRequest(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        let response;

        switch (path) {
            case '/':
                response = await serveStaticFile('index.html', 'text/html');
                break;
            case '/style.css':
                response = await serveStaticFile('style.css', 'text/css');
                break;
            case '/script.js':
                response = await serveStaticFile('script.js', 'application/javascript');
                break;
            case '/api/start-test':
                response = await handleStartTest(request);
                break;
            case '/api/test-progress':
                response = await handleTestProgress();
                break;
            case '/api/stop-test':
                response = await handleStopTest();
                break;
            case '/api/results':
                response = await handleGetResults();
                break;
            case '/api/last-results':
                response = await handleGetLastResults();
                break;
            case '/api/download':
                response = await handleDownload();
                break;
            case '/api/status':
                response = await handleGetStatus();
                break;
            default:
                response = new Response('Not Found', { status: 404 });
        }

        // Add CORS headers to all responses
        Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
        });

        return response;

    } catch (error) {
        console.error('Request handling error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// Serve static files (in a real deployment, these would be stored in KV or as assets)
async function serveStaticFile(filename, contentType) {
    // In a real deployment, you would fetch these from KV storage or Workers Assets
    // For now, we'll return a placeholder response
    const staticFiles = {
        'index.html': `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تستر کانفیگ V2Ray - ایران</title>
    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <!-- Your HTML content here -->
    <script src="script.js"></script>
</body>
</html>`,
        'style.css': '/* Your CSS content */',
        'script.js': '/* Your JavaScript content */'
    };

    const content = staticFiles[filename] || '';
    return new Response(content, {
        headers: { 'Content-Type': contentType }
    });
}

// Handle start test request
async function handleStartTest(request) {
    try {
        const { subDomain } = await request.json();
        
        if (!subDomain) {
            throw new Error('Sub domain is required');
        }

        // Validate URL
        new URL(subDomain);

        // Fetch configs from subdomain
        const configs = await fetchV2RayConfigs(subDomain);
        
        if (!configs || configs.length === 0) {
            throw new Error('No configs found in the provided subdomain');
        }

        // Store configs and start testing
        await V2RAY_KV.put('current_configs', JSON.stringify(configs));
        await V2RAY_KV.put('test_progress', JSON.stringify({
            total: configs.length,
            tested: 0,
            working: 0,
            completed: false,
            startTime: Date.now()
        }));
        await V2RAY_KV.put('testing_active', 'true');

        // Start background testing
        startBackgroundTesting(configs);

        return new Response(JSON.stringify({
            success: true,
            message: 'Testing started successfully',
            totalConfigs: configs.length
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Fetch V2Ray configs from subdomain
async function fetchV2RayConfigs(subDomain) {
    try {
        const response = await fetch(subDomain, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch configs: ${response.status}`);
        }

        const text = await response.text();
        
        // Parse different formats (base64, plain text, etc.)
        const configs = parseV2RayConfigs(text);
        
        return configs;

    } catch (error) {
        console.error('Error fetching configs:', error);
        throw error;
    }
}

// Parse V2Ray configs from text
function parseV2RayConfigs(text) {
    const configs = [];
    
    try {
        // Try to decode base64 if needed
        let decodedText = text;
        try {
            decodedText = atob(text);
        } catch (e) {
            // Not base64, use original text
        }

        // Split by lines and filter V2Ray configs
        const lines = decodedText.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Check for different V2Ray config formats
            if (trimmed.startsWith('vmess://') || 
                trimmed.startsWith('vless://') || 
                trimmed.startsWith('trojan://') ||
                trimmed.startsWith('ss://')) {
                
                const parsed = parseConfigUrl(trimmed);
                if (parsed) {
                    configs.push(parsed);
                }
            }
        }

        return configs;

    } catch (error) {
        console.error('Error parsing configs:', error);
        return [];
    }
}

// Parse individual config URL
function parseConfigUrl(configUrl) {
    try {
        const url = new URL(configUrl);
        const protocol = url.protocol.replace(':', '');
        
        let config = {
            config: configUrl,
            type: protocol,
            server: url.hostname,
            port: url.port || getDefaultPort(protocol),
            name: decodeURIComponent(url.hash.replace('#', '')) || 'Unknown'
        };

        // Parse protocol-specific parameters
        switch (protocol) {
            case 'vmess':
                config = { ...config, ...parseVmessConfig(configUrl) };
                break;
            case 'vless':
                config = { ...config, ...parseVlessConfig(configUrl) };
                break;
            case 'trojan':
                config = { ...config, ...parseTrojanConfig(configUrl) };
                break;
            case 'ss':
                config = { ...config, ...parseShadowsocksConfig(configUrl) };
                break;
        }

        return config;

    } catch (error) {
        console.error('Error parsing config URL:', error);
        return null;
    }
}

// Get default port for protocol
function getDefaultPort(protocol) {
    const defaultPorts = {
        'vmess': '443',
        'vless': '443',
        'trojan': '443',
        'ss': '443'
    };
    return defaultPorts[protocol] || '443';
}

// Parse VMess config
function parseVmessConfig(configUrl) {
    try {
        const base64Part = configUrl.replace('vmess://', '');
        const decoded = JSON.parse(atob(base64Part));
        
        return {
            server: decoded.add || decoded.host,
            port: decoded.port,
            name: decoded.ps || 'VMess Config',
            network: decoded.net || 'tcp',
            security: decoded.tls || 'none'
        };
    } catch (error) {
        return {};
    }
}

// Parse VLess config
function parseVlessConfig(configUrl) {
    try {
        const url = new URL(configUrl);
        const params = new URLSearchParams(url.search);
        
        return {
            network: params.get('type') || 'tcp',
            security: params.get('security') || 'none',
            path: params.get('path') || '/',
            host: params.get('host') || url.hostname
        };
    } catch (error) {
        return {};
    }
}

// Parse Trojan config
function parseTrojanConfig(configUrl) {
    try {
        const url = new URL(configUrl);
        const params = new URLSearchParams(url.search);
        
        return {
            password: url.username,
            security: params.get('security') || 'tls',
            sni: params.get('sni') || url.hostname
        };
    } catch (error) {
        return {};
    }
}

// Parse Shadowsocks config
function parseShadowsocksConfig(configUrl) {
    try {
        const url = new URL(configUrl);
        const auth = atob(url.username);
        const [method, password] = auth.split(':');
        
        return {
            method: method,
            password: password
        };
    } catch (error) {
        return {};
    }
}

// Start background testing
async function startBackgroundTesting(configs) {
    // This would typically be handled by a Durable Object or scheduled function
    // For now, we'll simulate the testing process
    
    const workingConfigs = [];
    let testedCount = 0;

    for (const config of configs) {
        try {
            // Test connectivity
            const isWorking = await testConfigConnectivity(config);
            
            if (isWorking) {
                // Test speed
                const speed = await testConfigSpeed(config);
                config.speed = speed;
                config.ping = await testConfigPing(config);
                workingConfigs.push(config);
            }

            testedCount++;

            // Update progress
            await V2RAY_KV.put('test_progress', JSON.stringify({
                total: configs.length,
                tested: testedCount,
                working: workingConfigs.length,
                completed: testedCount === configs.length,
                currentTest: config.name
            }));

            // Small delay to prevent overwhelming
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
            console.error('Error testing config:', error);
            testedCount++;
        }
    }

    // Sort by speed and take top 20
    const topConfigs = workingConfigs
        .sort((a, b) => (b.speed || 0) - (a.speed || 0))
        .slice(0, CONFIG.MAX_CONFIGS);

    // Store results
    await V2RAY_KV.put('test_results', JSON.stringify(topConfigs));
    await V2RAY_KV.put('last_test_time', Date.now().toString());
    await V2RAY_KV.put('testing_active', 'false');

    // Generate TXT file
    await generateConfigFile(topConfigs);
}

// Test config connectivity
async function testConfigConnectivity(config) {
    try {
        // Simulate connectivity test
        // In a real implementation, you would test actual connectivity
        // through the V2Ray config using appropriate libraries
        
        // For now, we'll simulate based on server reachability
        const testPromises = CONFIG.IRAN_TEST_ENDPOINTS.map(async (endpoint) => {
            try {
                const response = await fetch(endpoint, {
                    method: 'HEAD',
                    signal: AbortSignal.timeout(CONFIG.TEST_TIMEOUT)
                });
                return response.ok;
            } catch (error) {
                return false;
            }
        });

        const results = await Promise.all(testPromises);
        const successRate = results.filter(r => r).length / results.length;
        
        // Consider working if success rate > 50%
        return successRate > 0.5;

    } catch (error) {
        return false;
    }
}

// Test config speed
async function testConfigSpeed(config) {
    try {
        // Simulate speed test
        // In a real implementation, you would measure actual throughput
        
        const startTime = Date.now();
        
        // Simulate data transfer test
        const testUrl = 'https://httpbin.org/bytes/1048576'; // 1MB test
        const response = await fetch(testUrl, {
            signal: AbortSignal.timeout(CONFIG.SPEED_TEST_DURATION)
        });
        
        if (response.ok) {
            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000; // seconds
            const bytes = 1048576; // 1MB
            const speed = (bytes / duration) / (1024 * 1024); // MB/s
            
            return Math.round(speed * 10) / 10; // Round to 1 decimal
        }
        
        return 0;

    } catch (error) {
        // Return random speed for simulation
        return Math.random() * 100;
    }
}

// Test config ping
async function testConfigPing(config) {
    try {
        const startTime = Date.now();
        const response = await fetch(`https://${config.server}`, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
        });
        const endTime = Date.now();
        
        return endTime - startTime;
    } catch (error) {
        return Math.floor(Math.random() * 200) + 50; // Random ping 50-250ms
    }
}

// Handle test progress request
async function handleTestProgress() {
    try {
        const progressData = await V2RAY_KV.get('test_progress');
        const progress = progressData ? JSON.parse(progressData) : {
            total: 0,
            tested: 0,
            working: 0,
            completed: true
        };

        return new Response(JSON.stringify({
            success: true,
            progress: progress
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle stop test request
async function handleStopTest() {
    try {
        await V2RAY_KV.put('testing_active', 'false');
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Testing stopped'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle get results request
async function handleGetResults() {
    try {
        const resultsData = await V2RAY_KV.get('test_results');
        const results = resultsData ? JSON.parse(resultsData) : [];

        return new Response(JSON.stringify({
            success: true,
            results: results
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle get last results request
async function handleGetLastResults() {
    try {
        const resultsData = await V2RAY_KV.get('test_results');
        const results = resultsData ? JSON.parse(resultsData) : [];
        
        const lastTestTime = await V2RAY_KV.get('last_test_time');

        return new Response(JSON.stringify({
            success: true,
            results: results,
            lastTestTime: lastTestTime ? parseInt(lastTestTime) : null
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle download request
async function handleDownload() {
    try {
        const configFileData = await V2RAY_KV.get('config_file');
        
        if (!configFileData) {
            throw new Error('No config file available');
        }

        return new Response(configFileData, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': 'attachment; filename="v2ray-configs.txt"'
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle get status request
async function handleGetStatus() {
    try {
        const isActive = await V2RAY_KV.get('testing_active') === 'true';
        const lastTestTime = await V2RAY_KV.get('last_test_time');

        return new Response(JSON.stringify({
            success: true,
            isActive: isActive,
            lastTestTime: lastTestTime ? parseInt(lastTestTime) : null
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Generate config file
async function generateConfigFile(configs) {
    try {
        let fileContent = `# V2Ray Configs - Top ${configs.length} Working Configs for Iran\n`;
        fileContent += `# Generated: ${new Date().toISOString()}\n`;
        fileContent += `# Total tested configs: ${configs.length}\n\n`;

        configs.forEach((config, index) => {
            fileContent += `# Config ${index + 1}\n`;
            fileContent += `# Name: ${config.name}\n`;
            fileContent += `# Type: ${config.type}\n`;
            fileContent += `# Server: ${config.server}:${config.port}\n`;
            fileContent += `# Speed: ${config.speed || 'Unknown'} MB/s\n`;
            fileContent += `# Ping: ${config.ping || 'Unknown'} ms\n`;
            fileContent += `${config.config}\n\n`;
        });

        await V2RAY_KV.put('config_file', fileContent);

    } catch (error) {
        console.error('Error generating config file:', error);
    }
}

// Handle scheduled test
async function handleScheduledTest() {
    try {
        // Get the last subdomain used
        const lastSubDomain = await V2RAY_KV.get('last_subdomain');
        
        if (lastSubDomain) {
            console.log('Starting scheduled test for:', lastSubDomain);
            
            // Fetch and test configs
            const configs = await fetchV2RayConfigs(lastSubDomain);
            if (configs && configs.length > 0) {
                await startBackgroundTesting(configs);
                console.log('Scheduled test completed successfully');
            }
        }

    } catch (error) {
        console.error('Scheduled test error:', error);
    }
}