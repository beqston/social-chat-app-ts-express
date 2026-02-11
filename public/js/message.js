// 1. Initialize Socket
const socket = io(); 

const messagesCNT = document.getElementById("messages");
const allMessagesPM = document.getElementById("all-messages");
const sendMessageForm = document.getElementById("send-message-form");
const messageInput = document.getElementById("message");
const editIdInput = document.getElementById("edit-message-id"); 
const sendBtn = document.getElementById("send-btn");
const removeInputValue = document.getElementById("remove-chat-id");
const typingStatus = document.getElementById("typing-status");

// Global State Variables
let lastChatsState = "";
let lastMessagesState = "";
let currentUserID = null;
let chatWithUser = 'Someone'; // Default value
let typingTimeout;

// Get current Chat ID from URL
const pathParts = window.location.pathname.split("/");
const chat_id = pathParts[2];

// JOIN THE ROOM
if (chat_id) {
    socket.emit("join_chat", chat_id);
}

// LISTEN FOR REAL-TIME MESSAGES
socket.on("receive_message", (newMessage) => {
    // Only refresh if the message belongs to this open chat window
    // We check both object and string formats just to be safe
    const msgChatId = newMessage.chat._id || newMessage.chat;
    
    if (msgChatId === chat_id) {
        lastMessagesState = ""; // Force the UI to update
        getPMMessages(); 
    }
});

// TYPING INDICATOR LOGIC
messageInput.addEventListener("input", () => {
    if (!chat_id) return;

    socket.emit("typing", {
        chatId: chat_id,
        isTyping: true
    });

    clearTimeout(typingTimeout);

    typingTimeout = setTimeout(() => {
        socket.emit("typing", {
            chatId: chat_id,
            isTyping: false
        });
    }, 2000);
});

socket.on("user_typing", (data) => {
    //  Only show typing if it's for the CURRENT chat
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

// Listen for updates from other users (or yourself)
socket.on("message_updated", (updatedMessage) => {
    // Find the specific message bubble in the HTML
    getPMMessages();
});
// Listen for deleted messages
socket.on("message_deleted", (data) => {
    //  Check if the deletion happened in the current chat window
    if (data.chatId === chat_id) {
        // This requires your message HTML to have IDs
        // If you don't have IDs on elements, stick to Option A.
        getPMMessages(); 
    }
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

        // get my ID
        const userID = await resUser.json();
        currentUserID = userID;

        const { data: chats } = await resChats.json();
        const { data: users } = await resUsers.json();
        const { data: messages } = await resMessage.json();

        // Check if data actually changed to avoid flickering
        const currentChatsState = JSON.stringify(chats);
        const currentMessagesState = JSON.stringify(messages);

        if (currentChatsState === lastChatsState && currentMessagesState === lastMessagesState) {
            return; 
        }

        lastChatsState = currentChatsState;
        lastMessagesState = currentMessagesState;

        //  Render Sidebar (Chat List)
        messagesCNT.innerHTML = ''; 
        chats.forEach((chat) => {
            const otherUserId = chat.participants.find(u => u !== currentUserID);
            const findUser = users.find(u => u._id === otherUserId);
            const username = findUser ? findUser.username : "Unknown";
            const lastMessageSender = users.find((user) => user._id == chat?.lastMessage?.sender);
            
            const chatUrl = `/message/${chat._id}`;
            const isActive = window.location.pathname === chatUrl; // Boolean check
            
            // Only update 'chatWithUser' if this is the active chat
            if (isActive) {
                chatWithUser = username;
            }

            const userDiv = document.createElement('div');
            userDiv.className = `see-message-cnt ${isActive ? "active" : ""}`; // Add active class if needed in CSS
            userDiv.innerHTML = `
                <a href="${chatUrl}">
                    <div class="profile-image">${username[0].toUpperCase()}</div>
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
            
            // Toggle Options Menu
            const dialogDiv = userDiv.querySelector(".message-options");
            dialogDiv.addEventListener("click", (e) => {
                e.preventDefault(); // Prevent link click
                userDiv.querySelector(".option-details").classList.remove("none");
                removeInputValue.value = chat._id;
            });

            dialogDiv.addEventListener("mouseleave", () => {
                userDiv.querySelector(".option-details").classList.add("none");
            });

            // Delete Chat Logic
            const deleteChatBTN = userDiv.querySelector(".delete-chat-btn");
            deleteChatBTN.addEventListener("click", async (e) => {
                e.preventDefault();
                e.stopPropagation(); // Stop bubble up

                try {
                    const chatID = removeInputValue.value;
                    const res = await fetch(`/chat/${chatID}`, { method: "DELETE" });

                    if (!res.ok) throw new Error("Chat Not Found");
                    
                    userDiv.remove(); // Remove immediately from UI
                    
                    // If we deleted the open chat, go back to inbox
                    if (chatID === chat_id) {
                        window.location.href = "/messages";
                    } else {
                        getPMMessages(); // Refresh list if we deleted a side chat
                    }
                    
                } catch (error) {
                    console.log(error);
                }
            });

            messagesCNT.appendChild(userDiv);
        });

        //  Render Main Messages (Conversation)
        allMessagesPM.innerHTML = ''; 
        messages.forEach((msg) => {
            const msgDiv = document.createElement('div');
            // Use the global currentUserID for comparison
            msgDiv.className = msg.sender === currentUserID ? 'message-own' : 'message-other'; 
            msgDiv.classList.add("message-buble");
            
            msgDiv.innerHTML = `
                <p>${msg.text}</p>
                ${msg.sender === currentUserID ? `
                    <div class="edit-delete-wrpapper">
                       <button class="edit-btn">Edit</button>
                       <button class="delete-btn">Delete</button>
                    </div>` : ""
                }
            `;

            // Delete Single Message Logic
            const deleteBtn = msgDiv.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.onclick = async () => {
                    await fetch("/message/" + msg._id, { method: "DELETE" });
                    lastMessagesState = ""; // Force refresh
                    getPMMessages(); 
                };
            }

            // Edit Single Message Logic
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

        // Scroll to bottom
        allMessagesPM.scrollTop = allMessagesPM.scrollHeight;

    } catch (error) {
        console.error("Fetch failed:", error);
    }
}

// INITIAL LOAD
getPMMessages();

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
            
            lastMessagesState = ""; // Force a re-render
            getPMMessages();
        }
    } catch (err) {
        console.error("Operation failed:", err);
    }
});


