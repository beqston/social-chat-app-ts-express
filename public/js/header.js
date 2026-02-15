const AppState = {
    originalTitle: document.title,
    currentCount: 0,
    titleInterval: null
};

const socket = io();

// --- 1. Title Engine (Only runs when needed) ---
function updateTitleDisplay() {
    if (AppState.currentCount > 0) {
        if (AppState.titleInterval) return;
        let showCount = true;
        AppState.titleInterval = setInterval(() => {
            document.title = showCount ? `(${AppState.currentCount}) New Messages` : AppState.originalTitle;
            showCount = !showCount;
        }, 2000);
    } else {
        if (AppState.titleInterval) {
            clearInterval(AppState.titleInterval);
            AppState.titleInterval = null;
        }
        document.title = AppState.originalTitle;
    }
}

// --- 2. Sync Function ---
async function syncMessages() {
    try {
        const response = await fetch('/api/messages/count');
        const data = await response.json();
        AppState.currentCount = data.count;

        const badge = document.getElementById("msg-badge");
        if (badge) {
            badge.textContent = AppState.currentCount;
            badge.style.display = AppState.currentCount > 0 ? 'inline-block' : 'none';
        }
        updateTitleDisplay();
    } catch (err) {
        console.error('Sync Error:', err);
    }
}

// --- 3. Socket Listeners ---
// Listen for a specific "update_count" event
socket.on("update_count", syncMessages);
socket.on("receive_message", syncMessages);
socket.on("message_deleted", syncMessages);

// --- 4. Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetch('/template/header.html')
        .then(res => res.text())
        .then(async (html) => {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = html;
            const tpl = wrapper.querySelector('template');
            if (!tpl) return;

            document.body.insertAdjacentHTML('afterbegin', tpl.innerHTML);
            
            // Get User ID and join Personal Room
            try {
                const userRes = await fetch("/api/v1/me");
                const user = await userRes.json();
                const myId = user._id || user;
                
                if (myId) {
                    // This joins a room named after YOUR ID
                    socket.emit("join_chat", myId); 
                }
            } catch (e) { console.log("User not logged in"); }

            // Initial Sync
            syncMessages();

            // Logout logic
            const logoutBtn = document.getElementById("login-out");
            if (logoutBtn) {
                logoutBtn.onclick = async () => {
                    await fetch("/login-out", { method: "POST" });
                    window.location.href = "/login";
                };
            }
        });
});