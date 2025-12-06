(function missionControl() {
    const modal = document.getElementById('redPhoneModal');
    const modalAction = document.getElementById('redPhoneAction');
    const modalReason = document.getElementById('redPhoneReason');
    const modalSeverity = document.getElementById('redPhoneSeverity');
    const passwordInput = document.getElementById('redPhonePassword');
    const authorizeBtn = document.getElementById('redPhoneAuthorize');
    const denyBtn = document.getElementById('redPhoneDeny');
    const modalStatus = document.getElementById('redPhoneStatus');
    const researchBody = document.getElementById('researchLabBody');
    const refreshLabBtn = document.getElementById('refreshResearchLab');

    let currentRequest = null;
    let pollingTimer = null;
    let labTimer = null;

    function safeJson(response) {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
    }

    function showModal(request) {
        if (!modal) return;
        currentRequest = request;
        modalAction.textContent = request.action || 'Unknown Action';
        modalReason.textContent = request.reason || 'No reason provided';
        modalSeverity.textContent = request.severity || 'HIGH';
        modal.classList.add('active');
        passwordInput.value = '';
        modalStatus.textContent = '';
        passwordInput.focus();
    }

    function hideModal() {
        if (!modal) return;
        modal.classList.remove('active');
        currentRequest = null;
    }

    async function fetchRemediationQueue() {
        try {
            const data = await fetch('/api/control/remediation-queue', { credentials: 'include' }).then(safeJson);
            if (data.queue && data.queue.length > 0) {
                showModal(data.queue[0]);
            } else if (!currentRequest) {
                hideModal();
            }
        } catch (error) {
            console.warn('[MissionControl] Remediation queue fetch failed', error);
        }
    }

    async function authorizeFix() {
        if (!currentRequest) return;
        const password = passwordInput.value.trim();
        if (!password) {
            modalStatus.textContent = 'Password required.';
            modalStatus.classList.add('error');
            return;
        }

        try {
            const res = await fetch('/api/admin/authorize-fix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ approvalId: currentRequest.id, password })
            }).then(safeJson);

            modalStatus.textContent = res.message || 'Action authorized';
            modalStatus.classList.remove('error');
            modalStatus.classList.add('success');
            setTimeout(hideModal, 1500);
        } catch (error) {
            modalStatus.textContent = 'Authorization failed.';
            modalStatus.classList.add('error');
            console.error('[MissionControl] authorizeFix error', error);
        }
    }

    function denyFix() {
        modalStatus.textContent = 'Request dismissed locally.';
        modalStatus.classList.remove('error');
        modalStatus.classList.add('success');
        setTimeout(hideModal, 1000);
    }

    async function loadProposals() {
        if (!researchBody) return;
        try {
            const data = await fetch('/api/control/evolution-proposals', { credentials: 'include' }).then(safeJson);
            researchBody.innerHTML = '';
            if (!data.proposals || data.proposals.length === 0) {
                researchBody.innerHTML = '<tr><td colspan="4" class="empty-cell">No proposals pending</td></tr>';
                return;
            }

            data.proposals.forEach((proposal) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${proposal.pattern}</td>
                    <td>${proposal.proposedFix}</td>
                    <td>${proposal.confidence ? `${proposal.confidence}%` : '—'}</td>
                    <td><button class="teach-btn" data-rule="${proposal.id}">Teach</button></td>
                `;
                researchBody.appendChild(row);
            });
        } catch (error) {
            console.error('[MissionControl] Failed to load proposals', error);
        }
    }

    async function teachRule(ruleId, button) {
        if (!ruleId) return;
        button.disabled = true;
        button.textContent = 'Teaching...';
        try {
            const res = await fetch('/api/control/approve-rule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ruleId })
            }).then(safeJson);

            button.textContent = 'Learned!';
            button.classList.add('success');
        } catch (error) {
            button.textContent = 'Failed';
            button.classList.add('error');
            console.error('[MissionControl] Failed to teach rule', error);
        } finally {
            setTimeout(loadProposals, 1500);
        }
    }

    function bindEvents() {
        if (authorizeBtn) authorizeBtn.addEventListener('click', authorizeFix);
        if (denyBtn) denyBtn.addEventListener('click', denyFix);
        if (refreshLabBtn) refreshLabBtn.addEventListener('click', loadProposals);

        if (researchBody) {
            researchBody.addEventListener('click', (event) => {
                const target = event.target;
                if (target.matches('.teach-btn')) {
                    const ruleId = target.getAttribute('data-rule');
                    teachRule(ruleId, target);
                }
            });
        }
    }

    function init() {
        bindEvents();
        fetchRemediationQueue();
        loadProposals();

        pollingTimer = setInterval(fetchRemediationQueue, 10000);
        labTimer = setInterval(loadProposals, 60000);
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearInterval(pollingTimer);
            clearInterval(labTimer);
        } else {
            init();
        }
    });

    init();
})();


