const messagesCNT = document.getElementById("messages");
const allMessagesPM = document.getElementById("all-messages");
const sendMessageForm = document.getElementById("send-message-form");
const messageInput = document.getElementById("message");


let lastChatsState = "";
let lastMessagesState = "";

async function getPMMessages() {
    try {
        // Get current Chat ID from URL
        const pathParts = window.location.pathname.split("/");
        const chat_id = pathParts[2];

        //  Fetch User, Chats, and Messages in parallel for better performance
        const [resUser, resChats, resUsers, resMessage] = await Promise.all([
            fetch("/api/v1/me"),
            fetch("/api/v1/chats"),
            fetch("/api/v1/users"),
            fetch(`/api/v1/message/${chat_id}`)
        ]);

        const userID = await resUser.json();
        const { data: chats } = await resChats.json();
        const { data: users } = await resUsers.json();
        const { data: messages } = await resMessage.json();

        // 2. Convert new data to strings for quick comparison
        const currentChatsState = JSON.stringify(chats);
        const currentMessagesState = JSON.stringify(messages);

        // 3. GUARD CLAUSE: If both the sidebar and main chat haven't changed, STOP.
        if (currentChatsState === lastChatsState && currentMessagesState === lastMessagesState) {
            return; 
        }

        // 4. Update the state variables for the next check
        lastChatsState = currentChatsState;
        lastMessagesState = currentMessagesState;

        // Render Sidebar (Chats list)
        messagesCNT.innerHTML = ''; 
        chats.forEach((chat) => {
            const otherUserId = chat.participants.find(u => u !== userID);
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

        // Render Main Chat Messages
        allMessagesPM.innerHTML = ''; // Clear old messages
        messages.forEach((msg) => {
            const msgDiv = document.createElement('div');
            msgDiv.className = msg.sender === userID ? 'message-own' : 'message-other'; 
            msgDiv.classList.add("message-buble")
            msgDiv.innerHTML = `<p>${msg.text}</p>`;
            
            allMessagesPM.appendChild(msgDiv);
        });

        // Auto-scroll to bottom
        allMessagesPM.scrollTop = allMessagesPM.scrollHeight;

    } catch (error) {
        console.error("Fetch failed:", error);
    }
}

// Handle Sending Messages via AJAX
sendMessageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const chat_id = window.location.pathname.split("/")[2];
    const text = messageInput.value;

    if (!text.trim()) return; // Don't send empty messages

    try {
        const response = await fetch(`/message/${chat_id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })
        });

        if (response.ok) {
            await fetch(`/message/${chat_id}`);
            messageInput.value = ""; // Clear input
            getPMMessages(); // Refresh messages to show the new one
        }
    } catch (err) {
        console.error("Error sending message:", err);
    }
});

getPMMessages();


setInterval(() => {
  const chat_id = window.location.pathname.split("/")[2];
   fetch(`/message/${chat_id}`);
  getPMMessages();
}, 3000);