const messagesCNT = document.getElementById("messages");

// // 1. Intercept clicks on the container
// messagesCNT.addEventListener('click', (e) => {
//     const link = e.target.closest('a');
//     if (link) {
//         e.preventDefault();

//         const targetUrl = link.getAttribute('href');

//         // Update the URL without reload
//         window.history.pushState({}, '', targetUrl);

//         // Send GET request to server manually
//         fetch(targetUrl)
//     }
// });

// 2. Your existing fetch logic (Cleaned up slightly)
async function getMessages() {
    try {
        messagesCNT.innerHTML = ''; // Clear container first
        
        const resUser = await fetch("/api/v1/me");
        const userID = await resUser.json();

        const resChats = await fetch("/api/v1/chats");
        const { data: chats } = await resChats.json();

        const resUsers = await fetch("/api/v1/users");
        const { data: users } = await resUsers.json();

        chats.forEach((chat) => {
            const otherUserId = chat.participants.find(user => user !== userID);
            const findUser = users.find(u => u._id === otherUserId);
            const username = findUser ? findUser.username : "Unknown";

            const userDiv = document.createElement('div');
            userDiv.className = 'see-message-cnt'; // Use class, not ID
            userDiv.innerHTML = `
                <a href="/message/${chat._id}">
                    <div class="profile-image">${username[0].toUpperCase()}</div>
                    <h2>${username}</h2>
                </a>
            `;
            messagesCNT.appendChild(userDiv);
        });
    } catch (error) {
        console.error("Fetch failed:", error);
    }
}


getMessages();

