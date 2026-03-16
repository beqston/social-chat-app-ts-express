// Global State Variables
let lastChatsState = "";
let lastMessagesState = "";
let currentUserID = null;
let chatWithUser = 'Someone';
let typingTimeout;
let socket;

const messagesCNT = document.getElementById("messages");
const allMessagesPM = document.getElementById("all-messages");
const sendMessageForm = document.getElementById("send-message-form");
const messageInput = document.getElementById("message");
const editIdInput = document.getElementById("edit-message-id"); 
const sendBtn = document.getElementById("send-btn");
const removeInputValue = document.getElementById("remove-chat-id");
const typingStatus = document.getElementById("typing-status");
const activeTime = document.getElementById("active-time");

// Get current Chat ID from URL
const pathParts = window.location.pathname.split("/");
const chat_id = pathParts[2];

// MARK MESSAGES AS SEEN when user views the chat
async function markMessagesAsSeen() {
    if (!chat_id) return;
    
    try {
        await fetch(`/api/v1/message/seen/${chat_id}`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error("Failed to mark messages as seen:", error);
    }
}

// Initialize socket after getting user ID
async function initSocket() {
    try {
        const resUser = await fetch("/api/v1/me");
        const userData = await resUser.json();
        const userId = userData._id || userData;
        currentUserID = userId;
        
        socket = io({
            auth: {
                userId: userId
            }
        });
        
        if (chat_id) {
            socket.emit("join_chat", chat_id);
        }
        
        setupSocketListeners();
        
        if (chat_id) {
            markMessagesAsSeen();
        }
        
    } catch (error) {
        console.error("Failed to initialize socket:", error);
    }
}

function setupSocketListeners() {
    socket.on("receive_message", (newMessage) => {
        const msgChatId = newMessage.chat._id || newMessage.chat;
        
        if (msgChatId === chat_id) {
            lastMessagesState = "";
            getPMMessages();
            markMessagesAsSeen();
        }
    });

    socket.on("user_typing", (data) => {
        if (data.chatId === chat_id) {
            if (data.isTyping) {
                typingStatus.innerText = `${chatWithUser} is typing...`;
                typingStatus.classList.remove("none");
            } else {
                typingStatus.innerText = "";
                typingStatus.classList.add("none");
            }
        }
    });

    socket.on("message_updated", () => {
        getPMMessages();
    });

    socket.on("message_deleted", (data) => {
        if (data.chatId === chat_id) {
            getPMMessages(); 
        }
    });

    socket.on("messages_seen", (data) => {
        if (data.chatId === chat_id || String(data.chatId) === String(chat_id)) {
            const messageBubbles = allMessagesPM.querySelectorAll('.message-own');
            
            messageBubbles.forEach((bubble) => {
                const indicator = bubble.querySelector('.seen-indicator');
                
                if (indicator && indicator.classList.contains('sent')) {
                    indicator.classList.remove('sent');
                    indicator.classList.add('read');
                    indicator.textContent = '✓✓';
                }
            });
            
            lastMessagesState = "";
            getPMMessages();
        } 
    });

    socket.on("update_count", () => {
        getPMMessages();
    });
}

// Mark as seen when window gets focus
window.addEventListener('focus', () => {
    if (chat_id) {
        markMessagesAsSeen();
    }
});

// TYPING INDICATOR LOGIC
messageInput.addEventListener("input", () => {
    if (!chat_id || !socket) return;

    socket.emit("typing", {
        chatId: chat_id,
        isTyping: true
    });

    clearTimeout(typingTimeout);

    typingTimeout = setTimeout(() => {
        if (socket) {
            socket.emit("typing", {
                chatId: chat_id,
                isTyping: false
            });
        }
    }, 2000);
});

// MAIN FETCH FUNCTION
async function getPMMessages() {
    try {
        const [resUser, resChats, resUsers, resMessage] = await Promise.all([
            fetch("/api/v1/me"),
            fetch("/api/v1/chats"),
            fetch("/api/v1/users"),
            fetch(`/api/v1/message/${chat_id}`)
        ]);

        const userData = await resUser.json();
        if (!currentUserID) {
            currentUserID = userData._id || userData;
        }

        const { data: chats } = await resChats.json();
        const { data: users } = await resUsers.json();
        const { data: messages } = await resMessage.json();

        const currentChatsState = JSON.stringify(chats);
        const currentMessagesState = JSON.stringify(messages);

        if (currentChatsState === lastChatsState && currentMessagesState === lastMessagesState) {
            return; 
        }

        lastChatsState = currentChatsState;
        lastMessagesState = currentMessagesState;

        // Render Sidebar (Chat List)
        messagesCNT.innerHTML = ''; 
        chats.forEach((chat) => {
            const otherUserId = chat.participants.find(u => u !== currentUserID);
            const findUser = users.find(u => u._id === otherUserId);

            // ✅ Guard: skip if user not found
            if (!findUser) return;

            const username = findUser.username;
            const lastMessageSender = users.find((user) => user._id == chat?.lastMessage?.sender);
            
            const chatUrl = `/message/${chat._id}`;
            const isActive = window.location.pathname === chatUrl;
            
            if (isActive) {
                chatWithUser = username;

                // update activeTime for the currently open chat
                const ago = parseInt(findUser.lastActiveAgo);
                activeTime.textContent = ago < 1
                    ? chatWithUser +" - " + "Active now"
                    : chatWithUser +" - "+ `Last seen ${findUser.lastActiveAgo}`;
            }

            const userDiv = document.createElement('div');
            userDiv.className = `see-message-cnt ${isActive ? "active-chat" : ""}`;

            userDiv.innerHTML = `
                <a href="${chatUrl}">
                    ${findUser.image 
                        ? `<img class="profile-image profile-img" src="${findUser.image}" id="avatar-preview">` 
                        : `<div class="profile-image">${username[0].toUpperCase()}</div>`
                    }
                    <div>
                        <h2>${username}</h2>
                        ${lastMessageSender ? `
                            <div class="last-message-cnt">
                                <p class="last-message-profile">${lastMessageSender.username[0]}</p>
                                <p class="last-message">${chat.lastMessage.text}</p>
                            </div>` : ""
                        }
                    </div>
                </a>
                <div class="message-options">
                    <span>...</span>
                    <div class="option-details none">
                        <button class="delete-chat-btn">Delete Chat</button>
                    </div>
                </div>
            `;
            
            const dialogDiv = userDiv.querySelector(".message-options");
            dialogDiv.addEventListener("click", (e) => {
                e.preventDefault();
                userDiv.querySelector(".option-details").classList.remove("none");
                removeInputValue.value = chat._id;
            });

            dialogDiv.addEventListener("mouseleave", () => {
                userDiv.querySelector(".option-details").classList.add("none");
            });

            const deleteChatBTN = userDiv.querySelector(".delete-chat-btn");
            deleteChatBTN.addEventListener("click", async (e) => {
                e.preventDefault();
                e.stopPropagation();

                try {
                    const chatID = removeInputValue.value;
                    const res = await fetch(`/chat/${chatID}`, { method: "DELETE" });

                    if (!res.ok) throw new Error("Chat Not Found");
                    
                    userDiv.remove();
                    
                    if (chatID === chat_id) {
                        window.location.href = "/messages";
                    } else {
                        getPMMessages();
                    }
                    
                } catch (error) {
                    console.log(error);
                }
            });

            messagesCNT.appendChild(userDiv);
        });

        // Render Main Messages (Conversation)
        allMessagesPM.innerHTML = ''; 
        
        const currentChat = chats.find(c => c._id === chat_id);
        const otherParticipantId = currentChat
            ? currentChat.participants.find(p => p !== currentUserID)
            : null;

        messages.forEach((msg) => {
            const msgDiv = document.createElement('div');
            const senderId = msg.sender?._id || msg.sender;
            
            msgDiv.className = senderId === currentUserID ? 'message-own' : 'message-other'; 
            msgDiv.classList.add("message-buble");
            
            const isRead = senderId === currentUserID && 
                msg.readBy && 
                msg.readBy.some(read => {
                    const readUserId = read.user?._id || read.user;
                    return readUserId && readUserId.toString() === otherParticipantId?.toString();
                });
            
            msgDiv.innerHTML = `
                <p>${msg.text}</p>
                ${senderId === currentUserID ? `
                    <div class="message-status">
                        <span class="seen-indicator ${isRead ? 'read' : 'sent'}">
                            ${isRead ? '✓✓' : '✓'}
                        </span>
                    </div>
                    <div class="edit-delete-wrpapper">
                       <button class="edit-btn">Edit</button>
                       <button class="delete-btn">Delete</button>
                    </div>` : ""
                }
            `;

            const deleteBtn = msgDiv.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.onclick = async () => {
                    await fetch("/message/" + msg._id, { method: "DELETE" });
                    lastMessagesState = "";
                    getPMMessages(); 
                };
            }

            const editBtn = msgDiv.querySelector('.edit-btn');
            if (editBtn) {
                editBtn.onclick = () => {
                    messageInput.value = msg.text;
                    editIdInput.value = msg._id;
                    sendBtn.textContent = "Edit Message";
                    messageInput.focus();
                };
            }
            
            allMessagesPM.appendChild(msgDiv);
        });

        allMessagesPM.scrollTop = allMessagesPM.scrollHeight;

    } catch (error) {
        console.error("Fetch failed:", error);
    }
}

// HANDLE SEND FORM
sendMessageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = messageInput.value;
    const messageID = editIdInput.value; 

    if (!text.trim()) return;

    try {
        const url = messageID ? `/message/${messageID}` : `/message/${chat_id}`;
        const method = messageID ? "PATCH" : "POST";

        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })
        });

        if (response.ok) {
            messageInput.value = "";
            editIdInput.value = ""; 
            sendBtn.textContent = "Send Message";
            
            lastMessagesState = "";
            getPMMessages();
        }
    } catch (err) {
        console.error("Operation failed:", err);
    }
});

// Initialize socket first, then load messages
initSocket().then(() => {
    getPMMessages();
});
