const messagesCNT = document.getElementById("messages");
const removeInputValue = document.getElementById("remove-chat-id");

// Initialize socket
const socket = io(); 

let lastDataString = "";

async function getMessages() {
    try {
        
        const resUser = await fetch("/api/v1/me");
        const userID = await resUser.json();

        const resChats = await fetch("/api/v1/chats");
        const { data: chats } = await resChats.json();

        const resUsers = await fetch("/api/v1/users");
        const { data: users } = await resUsers.json();
        
        const currentDataString = JSON.stringify(chats);

        if(chats.length == 0){
            return  messagesCNT.innerHTML = `
                <h2>Chats Not Found</h2>
            `; 
        }

        if(lastDataString == currentDataString){
            return;
        }

        lastDataString = currentDataString;
        messagesCNT.innerHTML = ''; 
        chats.forEach((chat) => {
            
            const otherUserId = chat.participants.find(user => user !== userID);
            const findUser = users.find(u => u._id === otherUserId);
            const username = findUser ? findUser.username : "Unknown";
            const lastMessageSender = users.find((user) => user._id == chat?.lastMessage?.sender);

            const userDiv = document.createElement('div');
            userDiv.className = 'see-message-cnt';
            userDiv.innerHTML = `
                <a href="/message/${chat._id}">
                    <div class="profile-image">${username[0].toUpperCase()}</div>
                    <div>
                        <div class="username-cnt">
                            <h2>${username}</h2>
                            <div class="${findUser.active?"active":"disable"}"></div>
                        </div>
                        ${lastMessageSender ? `
                            <div class="last-message-cnt">
                                <p class="last-message-profile">${lastMessageSender.username[0]}</p>
                                <p class="last-message">${chat.lastMessage.text}</p>
                            </div>` : ""
                        }
                    </div>
                    ${chat.unreadCount > 0 ? `<span class="unread-message">${chat.unreadCount}</span>` : ""}
                </a>
                <div class="message-options">
                    <span>...</span>
                    <div class="option-details none">
                        <button>Delete Chat</button>
                    </div>
                </div>
            `;

            const dialogDiv = userDiv.querySelector(".message-options")
            dialogDiv.addEventListener("click", () => {
                userDiv.querySelector(".option-details").classList.remove("none");
                removeInputValue.value = chat._id;
            });

            dialogDiv.addEventListener("mouseleave", () => {
                userDiv.querySelector(".option-details").classList.add("none");
            });

            const deleteChatBTN = userDiv.querySelector("button");

            deleteChatBTN.addEventListener("click", async(e) => {
                e.preventDefault();
                try {
                    const chatID = removeInputValue.value
                    const res = await fetch(`/chat/${chatID}`, {
                        method: "DELETE"
                    })

                    if(!res.ok){
                        throw new Error("Chat Not Found")
                    }
                    userDiv.remove();
                    window.location.href = "/messages"
                } catch (error) {
                    console.log(error)
                }
            });

            messagesCNT.appendChild(userDiv);
        });
    } catch (error) {
        console.error("Fetch failed:", error);
    }
}

// Initial call
getMessages();

// Refresh the list when a new message arrives anywhere
socket.on("receive_message", () => {
    lastDataString = ""; // Force refresh
    getMessages();
});

// Refresh when messages are marked as seen (updates unread count)
socket.on("update_count", () => {
    lastDataString = ""; // Force refresh
    getMessages();
});

// Also refresh when user switches back to this tab
window.addEventListener('focus', () => {
    lastDataString = ""; // Force refresh
    getMessages();
});