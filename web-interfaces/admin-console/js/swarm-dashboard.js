(function swarmDashboard() {
    const healthGrid = document.getElementById('swarmHealthGrid');
    const threatBanner = document.getElementById('swarmThreatBanner');
    const statusMap = {};

    if (!healthGrid || !threatBanner) {
        console.warn('[SwarmDashboard] Required DOM nodes missing.');
        return;
    }

    function renderGrid() {
        healthGrid.innerHTML = Object.entries(statusMap)
            .map(([agent, meta]) => `
                <div class="swarm-card">
                    <div class="swarm-card-header">
                        <span>${agent}</span>
                        <span class="swarm-dot ${meta.state}"></span>
                    </div>
                    <div class="swarm-card-body">
                        <p>${meta.message || 'OK'}</p>
                        <small>${meta.timestamp || ''}</small>
                    </div>
                </div>
            `)
            .join('');
    }

    function updateAgent(agent, payload) {
        statusMap[agent] = {
            state: payload.status || 'online',
            message: payload.message || payload.action || 'Active',
            timestamp: new Date().toLocaleTimeString()
        };
        renderGrid();
    }

    function showThreatBanner(data) {
        threatBanner.textContent = `${data.reason || 'High Threat'} (${data.ip || 'unknown'})`;
        threatBanner.classList.add('active');
        setTimeout(() => threatBanner.classList.remove('active'), 6000);
    }

    function connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${protocol}://${window.location.host}/ws`);

        ws.addEventListener('open', () => {
            ws.send(JSON.stringify({ type: 'subscribe', channel: 'swarm' }));
        });

        ws.addEventListener('message', (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'SWARM_EVENT' && message.agent) {
                    updateAgent(message.agent, message);
                } else if (message.type === 'FIREWALL_ALERT') {
                    showThreatBanner(message);
                }
            } catch (error) {
                console.warn('[SwarmDashboard] Invalid message payload', error);
            }
        });

        ws.addEventListener('close', () => {
            setTimeout(connect, 4000);
        });
    }

    connect();
})();


