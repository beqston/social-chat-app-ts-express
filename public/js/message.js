// 1. Initialize Socket
const socket = io(); 

const messagesCNT = document.getElementById("messages");
const allMessagesPM = document.getElementById("all-messages");
const sendMessageForm = document.getElementById("send-message-form");
const messageInput = document.getElementById("message");
const editIdInput = document.getElementById("edit-message-id"); 
const sendBtn = document.getElementById("send-btn");
const removeInputValue = document.getElementById("remove-chat-id");

let lastChatsState = "";
let lastMessagesState = "";
let currentUserID = null; // Store this globally to avoid re-fetching

// Get current Chat ID from URL
const pathParts = window.location.pathname.split("/");
const chat_id = pathParts[2];

// JOIN THE ROOM
if (chat_id) {
    socket.emit("join_chat", chat_id);
}

// 3. LISTEN FOR REAL-TIME MESSAGES
socket.on("receive_message", (newMessage) => {
    // Only append if the message belongs to this open chat
    if (newMessage.chat === chat_id || newMessage.chat._id === chat_id) {
        // Option A: Just re-run the fetch (Simplest)
        getPMMessages(); 
    }
});

async function getPMMessages() {
    try {
        const [resUser, resChats, resUsers, resMessage] = await Promise.all([
            fetch("/api/v1/me"),
            fetch("/api/v1/chats"),
            fetch("/api/v1/users"),
            fetch(`/api/v1/message/${chat_id}`)
        ]);

        const userObj = await resUser.json();
        currentUserID = userObj._id || userObj; // Handle both object or ID string
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

        // --- Render Sidebar ---
        messagesCNT.innerHTML = ''; 
        chats.forEach((chat) => {
            const otherUserId = chat.participants.find(u => u !== currentUserID);
            const findUser = users.find(u => u._id === otherUserId);
            const username = findUser ? findUser.username : "Unknown";
            const lastMessageSender = users.find((user)=>user._id==chat?.lastMessage?.sender);
            const chatUrl = `/message/${chat._id}`;
            const isActive = window.location.pathname === chatUrl ? "active" : "";

            const userDiv = document.createElement('div');
            userDiv.className = `see-message-cnt ${isActive}`;
            userDiv.innerHTML = `
                <a href="${chatUrl}">
                    <div class="profile-image">${username[0].toUpperCase()}</div>
                    <div>
                        <h2>${username}</h2>
                        ${lastMessageSender? `
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
            
            const dialogDiv = userDiv.querySelector(".message-options")
            dialogDiv.addEventListener("click", ()=>{
                userDiv.querySelector(".option-details").classList.remove("none");
                removeInputValue.value=chat._id;
            });

            dialogDiv.addEventListener("mouseleave", ()=>{
                userDiv.querySelector(".option-details").classList.add("none");
            });

            const deleteChatBTN = userDiv.querySelector("button");

            deleteChatBTN.addEventListener("click", async(e)=>{
                e.preventDefault();
                try {
                    const chatID = removeInputValue.value
                    const res = await fetch(`/chat/${chatID}`, {
                        method:"DELETE"
                    })

                    if(!res.ok){
                        throw new Error("Chat Not Foound")
                    }
                    userDiv.remove();
                    window.location.href ="/messages"
                    
                } catch (error) {
                    console.log(error)
                }
            });
            messagesCNT.appendChild(userDiv);
        });

        // Render pm messages 
        allMessagesPM.innerHTML = ''; 
        messages.forEach((msg) => {
            const msgDiv = document.createElement('div');
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

            // Delete Message Logic
            const deleteBtn = msgDiv.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.onclick = async () => {
                    await fetch("/message/" + msg._id, { method: "DELETE" });
                    getPMMessages(); // Refresh
                };
            }

            // Edit Message Logic
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

// Initial Load
getPMMessages();

// Handle Form Submission
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