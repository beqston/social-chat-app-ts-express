const messagesCNT = document.getElementById("messages");
const allMessagesPM = document.getElementById("all-messages");
const sendMessageForm = document.getElementById("send-message-form");
const messageInput = document.getElementById("message");

async function getPMMessages() {
    try {
        // 1. Get current Chat ID from URL
        const pathParts = window.location.pathname.split("/");
        const chat_id = pathParts[2];

        // 2. Fetch User, Chats, and Messages in parallel for better performance
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

        // 3. Render Sidebar (Chats list)
        messagesCNT.innerHTML = ''; 
        chats.forEach((chat) => {
            const otherUserId = chat.participants.find(u => u !== userID);
            const findUser = users.find(u => u._id === otherUserId);
            const username = findUser ? findUser.username : "Unknown";

            const userDiv = document.createElement('div');
            userDiv.className = 'see-message-cnt'; 
            userDiv.innerHTML = `
                <a href="/message/${chat._id}">
                    <div class="profile-image">${username[0].toUpperCase()}</div>
                    <h2>${username}</h2>
                </a>
            `;
            messagesCNT.appendChild(userDiv);
        });

        // 4. Render Main Chat Messages
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

// 5. Handle Sending Messages via AJAX
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
            console.log("get message:", chat_id)
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