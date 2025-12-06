/**
 * HMS-CENTRAL Live Console Streamer
 * Connects to Server WebSocket and displays REAL logs.
 */

(function() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const panels = [
        document.getElementById('liveConsolePanelDashboard'),
        document.getElementById('liveConsolePanelFull')
    ];

    function connect() {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            logToScreen('[SYSTEM] Connected to HMS Central Command Stream.', 'system');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Handle "LOG" type messages (from server.js hook)
                if (data.type === 'LOG') {
                    logToScreen(`[SERVER] ${data.message}`, data.level.toLowerCase());
                }
                
                // Handle Swarm Events
                if (data.type === 'SWARM_EVENT') {
                    logToScreen(`[AI-SWARM] ${data.agent}: ${data.action} - ${data.message}`, 'info');
                }

                // Handle Security Alerts
                if (data.type === 'SECURITY_ALERT') {
                    logToScreen(`[SECURITY] 🚨 ${data.reason} (${data.ip})`, 'firewall');
                }

            } catch (e) {
                // Ignore parse errors
            }
        };

        ws.onclose = () => {
            logToScreen('[SYSTEM] Connection lost. Reconnecting...', 'warning');
            setTimeout(connect, 3000);
        };
    }

    function logToScreen(message, level) {
        const time = new Date().toLocaleTimeString();
        const line = document.createElement('div');
        line.className = 'console-line';
        
        // Style based on level
        let colorClass = 'log-system';
        if (level === 'error') colorClass = 'log-error';
        if (level === 'warn') colorClass = 'log-warning';
        if (level === 'firewall') colorClass = 'log-firewall';
        if (level === 'success') colorClass = 'log-success';

        line.innerHTML = `<span style="color:#555">[${time}]</span> <span class="${colorClass}">${message}</span>`;

        panels.forEach(panel => {
            if (panel) {
                panel.appendChild(line);
                panel.scrollTop = panel.scrollHeight;
                // Keep only last 200 lines to prevent browser lag
                if (panel.childElementCount > 200) {
                    panel.removeChild(panel.firstChild);
                }
            }
        });
    }

    connect();
})();