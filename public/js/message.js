const messagesCNT = document.getElementById("messages");
const allMessagesPM = document.getElementById("all-messages");
const sendMessageForm = document.getElementById("send-message-form");
const messageInput = document.getElementById("message");

const editIdInput = document.getElementById("edit-message-id"); 
const sendBtn = document.getElementById("send-btn");


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
            const chatUrl = `/message/${chat._id}`;
            const isActive = window.location.pathname === chatUrl ? "active" : "";

            const userDiv = document.createElement('div');
            userDiv.className = `see-message-cnt ${isActive}`;

            userDiv.innerHTML = `
                <a href="${chatUrl}">
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
                <div class="message-options">
                    <span>...</span>
                    <div class="option-details none">
                        <button>Delete Chat</button>
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
                } catch (error) {
                    console.log(error)
                }
            });
            messagesCNT.appendChild(userDiv);
        });

        // Render Main Chat Messages
        allMessagesPM.innerHTML = ''; 
        messages.forEach((msg) => {
            const msgDiv = document.createElement('div');
            msgDiv.className = msg.sender === userID ? 'message-own' : 'message-other'; 
            msgDiv.classList.add("message-buble")
            msgDiv.innerHTML = `
                <p>${msg.text}</p>
                ${
                    msg.sender == userID?
                    `<div class="edit-delete-wrpapper">
                       <button class="edit-btn">Edit</button>
                       <button class="delete-btn">Delete</button>
                    </div>`:""
                }

            `;

            // delete message
            const deleteBtn = msgDiv.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.onclick = async() => {
                    try {
                        await fetch("/message/"+msg._id,{
                            method:"DELETE"
                        })
                    } catch (error) {
                        alert("Delete failed!");
                    }
                };
                getPMMessages(); 
            }


            // edit message

            const editBTN = msgDiv.querySelector('.edit-btn');
            if(editBTN){
                editBTN.onclick = async()=>{
                    messageInput.value = msg.text;
                    editIdInput.value = msg._id;
                    sendBtn.textContent ="Edit Message";
                    messageInput.focus();
                }
            }
            
            allMessagesPM.appendChild(msgDiv);
        });

        // Auto-scroll to bottom
        allMessagesPM.scrollTop = allMessagesPM.scrollHeight;

    } catch (error) {
        console.error("Fetch failed:", error);
    }
}
getPMMessages();

// 1. Move the listener OUTSIDE any functions and IF blocks
sendMessageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const chat_id = window.location.pathname.split("/")[2];
    const text = messageInput.value;
    const messageID = editIdInput.value; 

    if (!text.trim()) return;

    try {
        if (messageID) {
            const response = await fetch("/message/" + messageID, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text })
            });

            if (response.ok) {
                editIdInput.value = ""; 
                sendBtn.textContent = "Send Message";
                messageInput.value = "";
                lastMessagesState = "";
                getPMMessages();
            }
            
        } else {
            const response = await fetch(`/message/${chat_id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text })
            });

            if (response.ok) {
                messageInput.value = "";
                lastMessagesState = "";
                getPMMessages();
            }
        }
    } catch (err) {
        console.error("Operation failed:", err);
    }
});


setInterval(() => {
  const chat_id = window.location.pathname.split("/")[2];
   fetch(`/message/${chat_id}`);
  getPMMessages();
}, 3000);