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

            // ---search logic----
            const searchForm = document.getElementById("search-form");
            searchForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const searchValue = document.getElementById("search-value");
                window.location.href = `/search?all-users=${encodeURIComponent(searchValue.value)}`;
            });

            async function fetchUsers(query) {
                const searchContainer = document.getElementById("search-cnt");

                const resSearch = await fetch("/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ search: query })
                });

                if (resSearch.status === 404) {
                    searchContainer.innerHTML = `
                        <div class="error-block">
                            <p>No users found for "<strong>${query}</strong>"</p>
                        </div>
                    `;
                    return;
                }

                if (!resSearch.ok) {
                    searchContainer.innerHTML = `
                        <div class="error-block">
                            <p>Something went wrong. Please try again.</p>
                        </div>
                    `;
                    return;
                }

                const { users } = await resSearch.json();

                searchContainer.innerHTML = users.map(user => `
                    <div id="user-cnt">
                        ${user.image 
                            ? `<img src="${user.image}" id="avatar-preview" class="profile-img">` 
                            : `<div class="profile-img" id="avatar-preview">${user.username[0].toUpperCase()}</div>`
                        }
                        <h2>${user.username}</h2>
                        <div class="active-cnt">
                            <div class="active-wrapper">
                                ${user.active?"<div class='onsite'></div>":"<div class='ofline'></div>"}
                                <p>${user.lastActiveAgo}</p>
                            </div>
                            <a href="/chat/${user._id}"><img src="/images/header/message.png" alt="Message" /></a>
                        </div>
                        <div><a href="/user/${user._id}">View Profile</a></div>
                    </div>
                `).join("");
            }

            // call it
            const params = new URLSearchParams(window.location.search);
            const query = params.get("all-users");

            if (query) {
                fetchUsers(query);
            }

            // get menu toglle element
            const menuToggle = document.getElementById('menu-toggle');
            const section2Container = document.getElementById('section2-cnt');

            if (menuToggle && section2Container) {
                menuToggle.addEventListener("click", () => {
                    const isFlexStyle = window.getComputedStyle(section2Container).display === "flex";
                    section2Container.style.display = isFlexStyle ? "none" : "flex";
                });
            }

            // if click window outside menu toggle, close toglle menu
            window.addEventListener("click", (event)=>{
                const isMobile = window.innerWidth <= 768;
                if(isMobile){
                    if(!event.target.contains(section2Container) && !menuToggle.contains(event.target)){
                        section2Container.style.display ="none"
                    }
                }

            })
        });
});
