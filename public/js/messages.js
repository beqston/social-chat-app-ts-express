const messagesCNT = document.getElementById("messages");
let lastDataString ="";

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
        
        const resUser = await fetch("/api/v1/me");
        const userID = await resUser.json();

        const resChats = await fetch("/api/v1/chats");
        const { data: chats } = await resChats.json();

        const resUsers = await fetch("/api/v1/users");
        const { data: users } = await resUsers.json();
        
        const currentDataString = JSON.stringify(chats);

        if(lastDataString==currentDataString){
            return;
        }

        lastDataString = currentDataString;
        messagesCNT.innerHTML = ''; 
        chats.forEach((chat) => {
            const otherUserId = chat.participants.find(user => user !== userID);
            const findUser = users.find(u => u._id === otherUserId);
            const username = findUser ? findUser.username : "Unknown";
            const lastMessageSender = users.find((user)=>user._id==chat?.lastMessage[0]?.sender);

            const userDiv = document.createElement('div');
            userDiv.className = 'see-message-cnt';
            userDiv.innerHTML = `
                <a href="/message/${chat._id}">
                    <div class="profile-image">${username[0].toUpperCase()}</div>
                    <div>
                        <h2>${username}</h2>
                        ${lastMessageSender?`
                            <div class="last-message-cnt">
                                <p class="last-message-profile">${lastMessageSender.username[0]}</p>
                                <p class="last-message">${chat.lastMessage[0].text}</p>
                            </div>`:""
                        }
                    </div>
                    ${chat.unreadCount > 0 ? `<p class="unread-message">${chat.unreadCount}</p>` : ""}
                </a>
            `;
            messagesCNT.appendChild(userDiv);
        });
    } catch (error) {
        console.error("Fetch failed:", error);
    }
}
getMessages();

setInterval(() => {
    getMessages();
}, 3000);